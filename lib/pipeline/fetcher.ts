import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const execFileAsync = promisify(execFile);

export interface NormalizedRepo {
  owner: string;
  repo: string;
  fullName: string;
  url: string;
}

export interface FetchedRepoArchive {
  owner: string;
  repo: string;
  repoName: string;
  defaultBranch: string;
  commitHash: string;
  extractDir: string;
}

/**
 * Normalizes user-pasted repository URLs into owner and repo components.
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/branch
 * - owner/repo
 */
export function normalizeRepoUrl(rawInput: string): NormalizedRepo {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Repository URL cannot be empty.");
  }

  // Remove trailing slashes and .git
  let cleaned = trimmed.replace(/\.git\/?$/, "").replace(/\/+$/, "");

  // Match github.com/owner/repo or owner/repo
  const githubUrlMatch = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (githubUrlMatch) {
    const owner = githubUrlMatch[1];
    const repo = githubUrlMatch[2].split("/")[0]; // remove any /tree/main suffix
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  const shortMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) {
    const owner = shortMatch[1];
    const repo = shortMatch[2];
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  throw new Error(
    `Invalid repository URL format: "${rawInput}". Please provide a public GitHub URL (e.g. https://github.com/owner/repo).`
  );
}

/**
 * Fetches repository metadata from GitHub's public API without requiring tokens.
 */
export async function fetchRepoMetadata(
  owner: string,
  repo: string
): Promise<{ defaultBranch: string; name: string; commitHash: string }> {
  const headers = {
    "User-Agent": "Cartograph-Pipeline/1.0",
    Accept: "application/vnd.github.v3+json",
  };

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });

  if (repoRes.status === 404) {
    throw new Error(
      `Repository "${owner}/${repo}" was not found on GitHub or is private. Only public repositories can be analyzed.`
    );
  }

  if (repoRes.status === 403) {
    const rateLimitRemaining = repoRes.headers.get("x-ratelimit-remaining");
    if (rateLimitRemaining === "0") {
      throw new Error(
        "GitHub API public rate limit reached. Please wait a few moments before submitting again."
      );
    }
    throw new Error(`GitHub API request forbidden: ${repoRes.statusText}`);
  }

  if (!repoRes.ok) {
    throw new Error(
      `Failed to access repository "${owner}/${repo}" (HTTP ${repoRes.status}: ${repoRes.statusText}).`
    );
  }

  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || "main";

  // Fetch latest commit hash on default branch
  let commitHash = "";
  try {
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${defaultBranch}`,
      { headers }
    );
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      commitHash = commitData.sha || "";
    }
  } catch {
    commitHash = "";
  }

  return {
    defaultBranch,
    name: repoData.name || repo,
    commitHash: commitHash || defaultBranch,
  };
}

/**
 * Downloads a public repository archive tarball and extracts it to a temporary directory.
 * No token is ever stored or requested.
 */
/**
 * Returns the base directory for storing raw downloaded repositories within the project.
 * Resolves to "<project_root>/github analyzer".
 */
export function getGithubAnalyzerBaseDir(): string {
  return path.resolve(process.cwd(), "github analyzer");
}

/**
 * Returns the repository directory path inside the "github analyzer" folder.
 */
export function getStoredRepoDir(owner: string, repo: string): string {
  return path.join(getGithubAnalyzerBaseDir(), owner, repo);
}

/**
 * Downloads a public repository archive tarball and extracts it into the project's
 * "github analyzer" folder so the raw source code is permanently stored locally,
 * and downstream pipeline stages fetch/parse code directly from this directory.
 */
export async function fetchAndExtractRepo(
  rawUrl: string
): Promise<FetchedRepoArchive> {
  const { owner, repo } = normalizeRepoUrl(rawUrl);
  const metadata = await fetchRepoMetadata(owner, repo);

  const archiveUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${metadata.commitHash}`;

  // Store inside the project's "github analyzer" directory
  const baseDir = getGithubAnalyzerBaseDir();
  await fs.mkdir(baseDir, { recursive: true });

  const repoDir = getStoredRepoDir(owner, repo);
  const tarballPath = path.join(baseDir, `${owner}-${repo}-${Date.now()}.tar.gz`);

  await fs.mkdir(repoDir, { recursive: true });

  try {
    const archiveRes = await fetch(archiveUrl, {
      headers: {
        "User-Agent": "Cartograph-Pipeline/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!archiveRes.ok || !archiveRes.body) {
      throw new Error(
        `Failed to download archive for "${owner}/${repo}" (HTTP ${archiveRes.status}: ${archiveRes.statusText}).`
      );
    }

    // Write stream to tarball file
    const fileStream = createWriteStream(tarballPath);
    // Convert Web ReadableStream to Node.js Readable stream
    const nodeReadable = Readable.fromWeb(archiveRes.body as any);
    await pipeline(nodeReadable, fileStream);

    // Clean any prior extraction in repoDir so old removed files aren't leftover
    const existingEntries = await fs.readdir(repoDir).catch(() => []);
    for (const entry of existingEntries) {
      await fs.rm(path.join(repoDir, entry), { recursive: true, force: true });
    }

    // Extract tarball using built-in bsdtar
    // GitHub tarballs have a single root folder named owner-repo-sha/
    await execFileAsync("tar", [
      "-xzf",
      tarballPath,
      "-C",
      repoDir,
      "--strip-components=1",
    ]);

    return {
      owner,
      repo,
      repoName: metadata.name,
      defaultBranch: metadata.defaultBranch,
      commitHash: metadata.commitHash,
      extractDir: repoDir,
    };
  } finally {
    // Delete the compressed tarball to free space, but RETAIN the raw source code in repoDir!
    try {
      await fs.unlink(tarballPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

/**
 * Cleans up temporary extracted repository files safely.
 * Preserves folders inside "github analyzer" as raw source code storage.
 */
export async function cleanupExtractDir(dirPath: string): Promise<void> {
  // Only remove legacy temporary folders in cartograph-runs, NEVER the "github analyzer" storage
  if (dirPath && dirPath.includes("cartograph-runs")) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[Pipeline Cleanup] Failed to delete temporary directory "${dirPath}":`, err);
    }
  }
}
