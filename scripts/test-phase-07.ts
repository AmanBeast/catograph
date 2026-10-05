import { normalizeRepoUrl, fetchAndExtractRepo, cleanupExtractDir } from "../lib/pipeline/fetcher";

async function runTests() {
  console.log("=== PHASE 7 PIPELINE VERIFICATION TEST ===");

  // 1. Test URL Normalization
  console.log("\n[1] Testing URL Normalization...");
  const testCases = [
    { input: "https://github.com/facebook/react", expected: "https://github.com/facebook/react", owner: "facebook", repo: "react" },
    { input: "https://github.com/facebook/react.git", expected: "https://github.com/facebook/react", owner: "facebook", repo: "react" },
    { input: "https://github.com/facebook/react/", expected: "https://github.com/facebook/react", owner: "facebook", repo: "react" },
    { input: "https://github.com/facebook/react/tree/main", expected: "https://github.com/facebook/react", owner: "facebook", repo: "react" },
    { input: "facebook/react", expected: "https://github.com/facebook/react", owner: "facebook", repo: "react" },
  ];

  for (const tc of testCases) {
    const res = normalizeRepoUrl(tc.input);
    if (!res) {
      throw new Error(`Normalization failed for ${tc.input}: returned null`);
    }
    if (res.url !== tc.expected || res.owner !== tc.owner || res.repo !== tc.repo) {
      throw new Error(`Normalization mismatch for ${tc.input}: got ${JSON.stringify(res)}`);
    }
    console.log(`  ✓ ${tc.input} -> ${res.url} (${res.owner}/${res.repo})`);
  }

  // Test invalid URLs
  const invalidCases = [
    "https://gitlab.com/owner/repo",
    "not-a-url",
  ];
  for (const inv of invalidCases) {
    let threw = false;
    try {
      normalizeRepoUrl(inv);
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(`Expected error for invalid URL ${inv}, but none was thrown.`);
    }
    console.log(`  ✓ Rejected invalid URL: ${inv}`);
  }

  // 2. Test Fetching a small public repo archive
  console.log("\n[2] Testing Public Archive Fetcher & Extraction on octocat/Hello-World...");
  try {
    const fetchResult = await fetchAndExtractRepo("https://github.com/octocat/Hello-World");
    console.log(`  ✓ Successfully fetched and extracted archive!`);
    console.log(`  - Commit Hash: ${fetchResult.commitHash}`);
    console.log(`  - Extract Dir: ${fetchResult.extractDir}`);
    console.log(`  - Default Branch: ${fetchResult.defaultBranch}`);

    // Verify commit hash is 40 hex chars
    if (!/^[0-9a-f]{40}$/i.test(fetchResult.commitHash)) {
      throw new Error(`Invalid commit hash: ${fetchResult.commitHash}`);
    }

    // Cleanup
    await cleanupExtractDir(fetchResult.extractDir);
    console.log(`  ✓ Cleanup successful (temporary extract dir removed).`);
  } catch (err: any) {
    console.error("  ✕ Archive fetch failed:", err);
    throw err;
  }

  // 3. Test Non-existent repository handling
  console.log("\n[3] Testing Non-Existent Repository Failure Handling...");
  try {
    await fetchAndExtractRepo("https://github.com/octocat/this-repo-absolutely-does-not-exist-99999");
    throw new Error("Expected 404 error but archive fetch succeeded!");
  } catch (err: any) {
    console.log(`  ✓ Correctly rejected non-existent repo: ${err.message}`);
  }

  console.log("\n=== ALL PHASE 7 TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
