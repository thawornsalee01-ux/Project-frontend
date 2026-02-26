"use client";

type MarkdownTextBlock = {
  kind: "text";
  text: string;
};

type MarkdownTableBlock = {
  kind: "table";
  header: string[];
  rows: string[][];
};

type MarkdownBlock = MarkdownTextBlock | MarkdownTableBlock;

const MARKDOWN_TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

function parseMarkdownTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    if (!textBuffer.length) return;
    const merged = textBuffer.join("\n");
    if (merged.trim().length > 0) {
      blocks.push({ kind: "text", text: merged });
    }
    textBuffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next = i + 1 < lines.length ? lines[i + 1] : "";

    if (line.includes("|") && MARKDOWN_TABLE_SEPARATOR.test(next)) {
      const header = parseMarkdownTableRow(line);
      const rows: string[][] = [];
      i += 2;

      while (i < lines.length) {
        const rowLine = lines[i];
        if (!rowLine.trim() || !rowLine.includes("|")) break;
        rows.push(parseMarkdownTableRow(rowLine));
        i += 1;
      }

      flushText();
      if (header.length > 0) {
        blocks.push({ kind: "table", header, rows });
      }
      continue;
    }

    textBuffer.push(line);
    i += 1;
  }

  flushText();
  return blocks;
}

function renderInlineMarkdown(text: string) {
  const nodes: Array<string | JSX.Element> = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))|(<https?:\/\/[^>\s]+>)|((?<!\()https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`code-${key++}`} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.92em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`strong-${key++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const labelMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (labelMatch) {
        nodes.push(
          <a
            key={`link-${key++}`}
            href={labelMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline break-all"
          >
            {labelMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("<http")) {
      const href = token.slice(1, -1);
      nodes.push(
        <a
          key={`link-${key++}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline break-all"
        >
          {href}
        </a>,
      );
    } else if (token.startsWith("http")) {
      nodes.push(
        <a
          key={`link-${key++}`}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline break-all"
        >
          {token}
        </a>,
      );
    } else {
      nodes.push(token);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderMarkdownTextBlock(text: string) {
  const lines = text.split(/\r?\n/);
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      elements.push(
        <pre key={`pre-${elements.length}`} className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100 sm:text-sm">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const content = renderInlineMarkdown(heading[2]);
      const cls = level <= 2 ? "text-base font-bold" : "text-sm font-semibold";
      elements.push(
        <div key={`h-${elements.length}`} className={`${cls} leading-relaxed`}>
          {content}
        </div>,
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1">
          {items.map((item, idx) => (
            <li key={`uli-${idx}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1">
          {items.map((item, idx) => (
            <li key={`oli-${idx}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("```")
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }

    elements.push(
      <p key={`p-${elements.length}`} className="leading-relaxed">
        {renderInlineMarkdown(paragraph.join(" "))}
      </p>,
    );
  }

  return <div className="space-y-2">{elements}</div>;
}

export function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.kind === "text") {
          return (
            <div key={blockIndex}>
              {renderMarkdownTextBlock(block.text)}
            </div>
          );
        }

        const maxColumns = Math.max(
          block.header.length,
          ...block.rows.map((row) => row.length),
        );
        const headerCells = Array.from({ length: maxColumns }, (_, colIndex) => block.header[colIndex] ?? "");

        return (
          <div key={blockIndex} className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse text-xs sm:text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {headerCells.map((cell, colIndex) => (
                    <th
                      key={`h-${blockIndex}-${colIndex}`}
                      className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700"
                    >
                      {cell ? renderInlineMarkdown(cell) : "-"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {block.rows.length > 0 ? (
                  block.rows.map((row, rowIndex) => (
                    <tr key={`r-${blockIndex}-${rowIndex}`} className="odd:bg-gray-50/60">
                      {headerCells.map((_, colIndex) => (
                        <td
                          key={`c-${blockIndex}-${rowIndex}-${colIndex}`}
                          className="border border-gray-200 px-3 py-2 align-top text-gray-800"
                        >
                          {row[colIndex] ? renderInlineMarkdown(row[colIndex]) : ""}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    {headerCells.map((_, colIndex) => (
                      <td
                        key={`empty-${blockIndex}-${colIndex}`}
                        className="border border-gray-200 px-3 py-2 text-gray-400 italic"
                      >
                        -
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
