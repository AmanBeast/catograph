"use client";

import React, { useMemo } from "react";

interface ExplanationRendererProps {
  content: string;
  filePathsSet?: Set<string>;
  onSelectFile?: (filePath: string) => void;
}

interface InlineToken {
  type: "text" | "bold" | "code" | "file-link";
  value: string;
  targetPath?: string;
}

export function ExplanationRenderer({
  content,
  filePathsSet,
  onSelectFile,
}: ExplanationRendererProps) {
  // Parse lines and structure into paragraphs and bullet lists
  const blocks = useMemo(() => {
    if (!content) return [];

    const lines = content.split("\n");
    const result: Array<
      | { type: "paragraph"; text: string }
      | { type: "bullet-list"; items: string[] }
    > = [];

    let currentBulletList: string[] | null = null;
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ").trim();
        if (text) {
          result.push({ type: "paragraph", text });
        }
        currentParagraph = [];
      }
    };

    const flushBulletList = () => {
      if (currentBulletList && currentBulletList.length > 0) {
        result.push({ type: "bullet-list", items: currentBulletList });
        currentBulletList = null;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        flushBulletList();
        continue;
      }

      // Check if bullet
      if (/^[-*•]\s+/.test(line)) {
        flushParagraph();
        const bulletText = line.replace(/^[-*•]\s+/, "").trim();
        if (!currentBulletList) {
          currentBulletList = [];
        }
        currentBulletList.push(bulletText);
      } else {
        flushBulletList();
        currentParagraph.push(line);
      }
    }

    flushParagraph();
    flushBulletList();

    return result;
  }, [content]);

  // Tokenize inline text into bold, inline code, file links, and sanitized text
  const parseInline = (text: string): InlineToken[] => {
    // Regex matching either **bold** or `code`
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(regex);
    const tokens: InlineToken[] = [];

    for (const part of parts) {
      if (!part) continue;

      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        // Bold token
        const inner = part.slice(2, -2).trim();
        tokens.push({ type: "bold", value: inner });
      } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        // Code token
        const codeValue = part.slice(1, -1).trim();
        // Check if code matches a known repo file path
        if (filePathsSet && filePathsSet.has(codeValue)) {
          tokens.push({
            type: "file-link",
            value: codeValue,
            targetPath: codeValue,
          });
        } else {
          tokens.push({ type: "code", value: codeValue });
        }
      } else {
        // Normal text chunk: check for file paths mentioned without backticks
        // and sanitize any stray backticks, asterisks, or hashes
        let sanitized = part
          .replace(/[#*`]/g, "") // strip stray lone markdown formatting symbols
          .replace(/\s+/g, " ");

        if (!sanitized) continue;

        if (filePathsSet && filePathsSet.size > 0) {
          // Check for file names in text
          const words = sanitized.split(" ");
          let textAcc: string[] = [];

          for (const word of words) {
            // Strip trailing punctuation like commas, periods, colons
            const cleanWord = word.replace(/[.,:;()\[\]]$/, "");
            const punct = word.slice(cleanWord.length);

            if (filePathsSet.has(cleanWord)) {
              if (textAcc.length > 0) {
                tokens.push({ type: "text", value: textAcc.join(" ") + " " });
                textAcc = [];
              }
              tokens.push({
                type: "file-link",
                value: cleanWord,
                targetPath: cleanWord,
              });
              if (punct) {
                textAcc.push(punct);
              }
            } else {
              textAcc.push(word);
            }
          }

          if (textAcc.length > 0) {
            tokens.push({ type: "text", value: textAcc.join(" ") });
          }
        } else {
          tokens.push({ type: "text", value: sanitized });
        }
      }
    }

    return tokens;
  };

  const renderInline = (tokens: InlineToken[]) => {
    return tokens.map((token, idx) => {
      if (token.type === "bold") {
        return (
          <strong
            key={idx}
            className="font-semibold text-[var(--text-primary)] tracking-tight"
          >
            {token.value}
          </strong>
        );
      }
      if (token.type === "file-link") {
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (token.targetPath && onSelectFile) {
                onSelectFile(token.targetPath);
              }
            }}
            className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--accent)] hover:text-white bg-[var(--accent)]/10 hover:bg-[var(--accent)] px-1 py-0.5 rounded transition-all cursor-pointer border border-[var(--accent)]/20 mx-0.5 align-baseline group"
            title={`Pan and focus on ${token.targetPath}`}
          >
            <span className="underline underline-offset-2 decoration-[var(--accent)]/40 group-hover:decoration-white">
              {token.value}
            </span>
            <span className="text-[9px] opacity-60 group-hover:opacity-100">↗</span>
          </button>
        );
      }
      if (token.type === "code") {
        return (
          <code
            key={idx}
            className="font-mono text-[10.5px] bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] px-1 py-0.2 rounded mx-0.5"
          >
            {token.value}
          </code>
        );
      }
      return <span key={idx}>{token.value}</span>;
    });
  };

  return (
    <div className="flex flex-col gap-3 text-xs leading-relaxed text-[var(--text-secondary)] font-sans select-text">
      {blocks.map((block, bIdx) => {
        if (block.type === "bullet-list") {
          return (
            <ul key={bIdx} className="flex flex-col gap-2 pl-3 my-0.5 list-none">
              {block.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 relative">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-1.5 opacity-80" />
                  <div className="flex-1">{renderInline(parseInline(item))}</div>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bIdx} className="my-0">
            {renderInline(parseInline(block.text))}
          </p>
        );
      })}
    </div>
  );
}
