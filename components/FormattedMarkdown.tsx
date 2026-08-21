"use client";

import React from "react";

interface FormattedMarkdownProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

interface TableData {
  headers: string[];
  alignments: Array<"left" | "center" | "right">;
  rows: string[][];
}

/**
 * Parses and renders markdown text cleanly with full support for:
 * - Markdown Tables (| col | col |)
 * - Headings (### Header, ## Header)
 * - Bold (**text** or __text__)
 * - Lists (* item, - item, 1. item)
 * - Dividers (---)
 * - Inline Code (`code`)
 */
export default function FormattedMarkdown({
  content,
  className = "",
  isUser = false,
}: FormattedMarkdownProps) {
  if (!content) return null;

  // Split into raw lines
  const rawLines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let listBuffer: {
    type: "bullet" | "number";
    items: Array<{ num?: string; text: string }>;
  } | null = null;

  let tableBuffer: string[] | null = null;

  const flushList = (keyPrefix: string) => {
    if (!listBuffer) return;
    if (listBuffer.type === "bullet") {
      elements.push(
        <ul
          key={`${keyPrefix}-ul`}
          className={`space-y-1.5 my-2 pl-1 ${
            isUser ? "text-white/95" : "text-gray-800"
          }`}
        >
          {listBuffer.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
              <span
                className={`font-bold mt-0.5 select-none ${
                  isUser ? "text-white" : "text-[#0D5C46]"
                }`}
              >
                •
              </span>
              <span className="flex-1">{parseInline(item.text, isUser)}</span>
            </li>
          ))}
        </ul>,
      );
    } else {
      elements.push(
        <ol
          key={`${keyPrefix}-ol`}
          className={`space-y-1.5 my-2 pl-1 ${
            isUser ? "text-white/95" : "text-gray-800"
          }`}
        >
          {listBuffer.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
              <span
                className={`font-bold text-[11px] min-w-4 mt-0.5 select-none ${
                  isUser ? "text-white" : "text-[#0D5C46]"
                }`}
              >
                {item.num || `${idx + 1}.`}
              </span>
              <span className="flex-1">{parseInline(item.text, isUser)}</span>
            </li>
          ))}
        </ol>,
      );
    }
    listBuffer = null;
  };

  const flushTable = (keyPrefix: string) => {
    if (!tableBuffer || tableBuffer.length === 0) {
      tableBuffer = null;
      return;
    }

    const tableData = parseTableLines(tableBuffer);
    tableBuffer = null;

    if (!tableData) return;

    elements.push(
      <div
        key={`${keyPrefix}-table`}
        className="my-3 overflow-x-auto rounded-xl border border-[#EAE4DC] shadow-2xs bg-white"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#EAE4DC]">
              {tableData.headers.map((h, hIdx) => {
                const align = tableData.alignments[hIdx] || "left";
                return (
                  <th
                    key={hIdx}
                    className={`px-3.5 py-2.5 font-extrabold text-[#0D5C46] border-r border-[#EAE4DC] last:border-r-0 ${
                      align === "center"
                        ? "text-center"
                        : align === "right"
                          ? "text-right"
                          : "text-left"
                    }`}
                  >
                    {parseInline(h, isUser)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2ECE4]">
            {tableData.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-[#FAF8F5]/60 transition-colors"
              >
                {row.map((cell, cIdx) => {
                  const align = tableData.alignments[cIdx] || "left";
                  return (
                    <td
                      key={cIdx}
                      className={`px-3.5 py-2 font-medium text-[#1A2421] border-r border-[#F2ECE4] last:border-r-0 ${
                        align === "center"
                          ? "text-center"
                          : align === "right"
                            ? "text-right"
                            : "text-left"
                      }`}
                    >
                      {parseInline(cell, isUser)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
  };

  // Process line by line
  let i = 0;
  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    // Check if line looks like a table row: contains '|'
    if (line.startsWith("|") || (line.includes("|") && !line.startsWith("#") && !line.startsWith("*"))) {
      flushList(`line-${i}`);
      if (!tableBuffer) tableBuffer = [];
      tableBuffer.push(line);
      i++;
      continue;
    }

    // If we were collecting table rows and hit an empty line, look ahead to see if the table continues
    if (tableBuffer && !line) {
      // peek next non-empty line
      let nextIdx = i + 1;
      while (nextIdx < rawLines.length && !rawLines[nextIdx].trim()) {
        nextIdx++;
      }
      if (nextIdx < rawLines.length && rawLines[nextIdx].trim().includes("|")) {
        // Table continues after empty lines
        i++;
        continue;
      } else {
        // End of table
        flushTable(`table-${i}`);
      }
    } else if (tableBuffer) {
      flushTable(`table-${i}`);
    }

    // Empty line
    if (!line) {
      flushList(`line-${i}`);
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Horizontal divider (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushList(`line-${i}`);
      elements.push(
        <hr
          key={`hr-${i}`}
          className={`my-2.5 border-t ${
            isUser ? "border-white/20" : "border-gray-200"
          }`}
        />,
      );
      i++;
      continue;
    }

    // Headings: ### Header or ## Header or # Header
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList(`line-${i}`);
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level <= 2) {
        elements.push(
          <h3
            key={`h-${i}`}
            className={`font-extrabold text-sm tracking-tight mt-3 mb-1.5 ${
              isUser ? "text-white" : "text-[#0D5C46]"
            }`}
          >
            {parseInline(headingText, isUser)}
          </h3>,
        );
      } else {
        elements.push(
          <h4
            key={`h-${i}`}
            className={`font-bold text-xs uppercase tracking-wider mt-2.5 mb-1 ${
              isUser ? "text-white/90" : "text-[#0D5C46]"
            }`}
          >
            {parseInline(headingText, isUser)}
          </h4>,
        );
      }
      i++;
      continue;
    }

    // Bullet List Item: * item, - item, • item
    const bulletMatch = line.match(/^[\*\-\•]\s+(.*)$/);
    if (bulletMatch) {
      if (!listBuffer || listBuffer.type !== "bullet") {
        flushList(`line-${i}`);
        listBuffer = { type: "bullet", items: [] };
      }
      listBuffer.items.push({ text: bulletMatch[1] });
      i++;
      continue;
    }

    // Numbered List Item: 1. item, 2. item
    const numberMatch = line.match(/^(\d+[\.\)])\s+(.*)$/);
    if (numberMatch) {
      if (!listBuffer || listBuffer.type !== "number") {
        flushList(`line-${i}`);
        listBuffer = { type: "number", items: [] };
      }
      listBuffer.items.push({ num: numberMatch[1], text: numberMatch[2] });
      i++;
      continue;
    }

    // Regular paragraph line
    flushList(`line-${i}`);
    elements.push(
      <p
        key={`p-${i}`}
        className={`text-xs leading-relaxed my-1 ${
          isUser ? "text-white font-medium" : "text-gray-800"
        }`}
      >
        {parseInline(line, isUser)}
      </p>,
    );
    i++;
  }

  flushList("final");
  flushTable("final");

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}

/**
 * Splits a table row line by '|' while removing leading/trailing empty segments
 */
function splitRow(line: string): string[] {
  let cleaned = line.trim();
  if (cleaned.startsWith("|")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("|")) cleaned = cleaned.slice(0, -1);
  return cleaned.split("|").map((c) => c.trim());
}

/**
 * Parses markdown table lines into structured TableData
 */
function parseTableLines(lines: string[]): TableData | null {
  const filtered = lines.filter((l) => l.trim().length > 0);
  if (filtered.length < 2) return null;

  const headerRow = splitRow(filtered[0]);
  let dividerIdx = 1;

  // Find the separator row (|---|---|)
  while (
    dividerIdx < filtered.length &&
    !filtered[dividerIdx].includes("-")
  ) {
    dividerIdx++;
  }

  if (dividerIdx >= filtered.length) return null;

  const dividerCols = splitRow(filtered[dividerIdx]);
  const alignments: Array<"left" | "center" | "right"> = dividerCols.map(
    (col) => {
      const trimmed = col.trim();
      const hasLeftColon = trimmed.startsWith(":");
      const hasRightColon = trimmed.endsWith(":");
      if (hasLeftColon && hasRightColon) return "center";
      if (hasRightColon) return "right";
      return "left";
    },
  );

  const dataRows: string[][] = [];
  for (let r = dividerIdx + 1; r < filtered.length; r++) {
    const row = splitRow(filtered[r]);
    // Ensure length matches header
    while (row.length < headerRow.length) {
      row.push("");
    }
    dataRows.push(row.slice(0, headerRow.length));
  }

  return {
    headers: headerRow,
    alignments,
    rows: dataRows,
  };
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`
 */
function parseInline(text: string, isUser: boolean): React.ReactNode {
  if (!text) return "";

  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Check for bold **text** or __text__
    const boldMatch = remaining.match(/^([\s\S]*?)(\*\*|__)(.+?)\2([\s\S]*)$/);
    // Check for code `text`
    const codeMatch = remaining.match(/^([\s\S]*?)(`)(.+?)\2([\s\S]*)$/);

    let matchType: "bold" | "code" | null = null;
    let firstMatchIndex = Number.MAX_SAFE_INTEGER;

    if (boldMatch && boldMatch[1].length < firstMatchIndex) {
      matchType = "bold";
      firstMatchIndex = boldMatch[1].length;
    }
    if (codeMatch && codeMatch[1].length < firstMatchIndex) {
      matchType = "code";
      firstMatchIndex = codeMatch[1].length;
    }

    if (matchType === "bold" && boldMatch) {
      const prefix = boldMatch[1];
      const boldContent = boldMatch[3];
      const suffix = boldMatch[4];

      if (prefix) {
        tokens.push(parseSingleAsterisks(prefix, isUser, keyIdx++));
      }
      tokens.push(
        <strong
          key={keyIdx++}
          className={`font-bold ${
            isUser ? "text-white" : "text-gray-900"
          }`}
        >
          {boldContent}
        </strong>,
      );
      remaining = suffix;
    } else if (matchType === "code" && codeMatch) {
      const prefix = codeMatch[1];
      const codeContent = codeMatch[3];
      const suffix = codeMatch[4];

      if (prefix) {
        tokens.push(parseSingleAsterisks(prefix, isUser, keyIdx++));
      }
      tokens.push(
        <code
          key={keyIdx++}
          className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
            isUser
              ? "bg-white/20 text-white"
              : "bg-gray-100 text-[#0D5C46] border border-gray-200"
          }`}
        >
          {codeContent}
        </code>,
      );
      remaining = suffix;
    } else {
      tokens.push(parseSingleAsterisks(remaining, isUser, keyIdx++));
      break;
    }
  }

  return <>{tokens}</>;
}

/**
 * Handles single asterisk italic (*text*) or footnotes (*Note)
 */
function parseSingleAsterisks(
  text: string,
  isUser: boolean,
  baseKey: number,
): React.ReactNode {
  // Check if text has *italic*
  const italicMatch = text.match(/^([\s\S]*?)\*([^\*]+?)\*([\s\S]*)$/);
  if (italicMatch) {
    const prefix = italicMatch[1];
    const italicContent = italicMatch[2];
    const suffix = italicMatch[3];
    return (
      <span key={baseKey}>
        {prefix}
        <em
          className={`italic ${
            isUser ? "text-white/90" : "text-[#4A5D53]"
          }`}
        >
          {italicContent}
        </em>
        {parseSingleAsterisks(suffix, isUser, baseKey + 100)}
      </span>
    );
  }
  return <span key={baseKey}>{text}</span>;
}
