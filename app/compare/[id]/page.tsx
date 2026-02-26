"use client";
import { useRef } from "react"

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  DocumentMagnifyingGlassIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

/* ================= TYPES ================= */

type ChangeType = "ADDED" | "REMOVED" | "MODIFIED";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type ChangeItem = {
  id: number;
  change_type: ChangeType;
  section_label: string | null;
  old_text: string | null;
  new_text: string | null;
  risk_level?: RiskLevel | null;
  ai_comment?: string | null;
  ai_suggestion?: string | null;
  risk_reason?: string | null;
};

type ComparisonDetail = {
  id: number;
  document_name: string;
  version_old_label: string;
  version_new_label: string;
  created_at: string;
  overall_risk_level?: string | null;
  summary_text?: string | null;
  changes: ChangeItem[];
};

type ChatState = {
  open: boolean;
  question: string;
  loading: boolean;
  answer: string;
  error: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_HISTORY_API ?? "/api/history";
const API_BASE_CHAT = process.env.NEXT_PUBLIC_HISTORY_CHAT_API ?? "/api/chat";


/* ================= HELPERS ================= */

function normalizeText(s?: string | null) {
  return (s || "").toString().trim();
}

function contains(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function riskBadge(risk?: string | null) {
  const base = "px-3 py-1 rounded-md font-bold";
  const level = (risk || "").toUpperCase();

  if (level === "HIGH")
    return <span className={`${base} bg-gradient-to-r from-red-500 to-red-600 text-white text-sm shadow-sm`}>HIGH</span>;
  if (level === "MEDIUM")
    return <span className={`${base} bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm shadow-sm`}>MEDIUM</span>;
  return null;
}

function changeTypeBadge(type: ChangeType) {
  const base = "px-3 py-1 rounded-md font-bold";
  if (type === "ADDED")
    return <span className={`${base} bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm shadow-sm`}>ADDED</span>;
  if (type === "REMOVED")
    return <span className={`${base} bg-gradient-to-r from-red-500 to-red-600 text-white text-sm shadow-sm`}>REMOVED</span>;
  return <span className={`${base} bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm shadow-sm`}>MODIFIED</span>;
}

/* ================= TEXT DIFF HELPERS ================= */

function getHighlightedText(oldText: string, newText: string) {
  if (!oldText || !newText) return { oldHighlighted: oldText, newHighlighted: newText };
  
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  const oldWordSet = new Set(oldWords.filter(w => w.trim().length > 0));
  const newWordSet = new Set(newWords.filter(w => w.trim().length > 0));
  
  const oldHighlighted = oldWords.map((word, index) => {
    if (!newWordSet.has(word) && word.trim().length > 0) {
      return `<span class="bg-red-200 text-red-900 px-1 py-0.5 rounded border border-red-300 font-medium line-through decoration-red-700 decoration-2">${word}</span>`;
    }
    return word;
  }).join('');
  
  const newHighlighted = newWords.map((word, index) => {
    if (!oldWordSet.has(word) && word.trim().length > 0) {
      return `<span class="bg-emerald-200 text-emerald-900 px-1 py-0.5 rounded border border-emerald-300 font-medium">${word}</span>`;
    }
    return word;
  }).join('');
  
  return { oldHighlighted, newHighlighted };
}

/* ================= DIFF VIEW COMPONENT ================= */

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const { oldHighlighted, newHighlighted } = getHighlightedText(oldText, newText);
  
  const formattedOldText = oldText ? oldText.split('\n').map((line, index) => {
    if (!line.trim()) return <div key={index} className="h-4"></div>;
    
    const words = line.split(/(\s+)/);
    const newWords = newText ? newText.split(/(\s+)/).filter(w => w.trim().length > 0) : [];
    const newWordSet = new Set(newWords);
    
    return (
      <div key={index} className="mb-2 last:mb-0">
        {words.map((word, wordIndex) => {
          if (!newWordSet.has(word) && word.trim().length > 0) {
            return (
              <span
                key={wordIndex}
                className="bg-red-200 text-red-900 px-1 py-0.5 rounded border border-red-300 font-medium line-through decoration-red-700 decoration-2 mx-0.5"
              >
                {word}
              </span>
            );
          }
          return word;
        })}
      </div>
    );
  }) : <span className="text-gray-400 italic">ไม่มีข้อความ</span>;

  const formattedNewText = newText ? newText.split('\n').map((line, index) => {
    if (!line.trim()) return <div key={index} className="h-4"></div>;
    
    const words = line.split(/(\s+)/);
    const oldWords = oldText ? oldText.split(/(\s+)/).filter(w => w.trim().length > 0) : [];
    const oldWordSet = new Set(oldWords);
    
    return (
      <div key={index} className="mb-2 last:mb-0">
        {words.map((word, wordIndex) => {
          if (!oldWordSet.has(word) && word.trim().length > 0) {
            return (
              <span
                key={wordIndex}
                className="bg-emerald-200 text-emerald-900 px-1 py-0.5 rounded border border-emerald-300 font-medium mx-0.5"
              >
                {word}
              </span>
            );
          }
          return word;
        })}
      </div>
    );
  }) : <span className="text-gray-400 italic">ไม่มีข้อความ</span>;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* Old Version */}
        <div className="p-4 bg-gradient-to-b from-red-50/20 to-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-3 w-3 bg-red-500 rounded-full shadow-sm"></div>
            <div className="text-sm font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">OLD VERSION</div>
          </div>
          <div className="text-base leading-relaxed text-gray-800 bg-white/50 p-3 rounded-lg border border-red-100 min-h-[200px]">
            <div className="whitespace-pre-wrap">
              {formattedOldText}
            </div>
          </div>
        </div>

        {/* New Version */}
        <div className="p-4 bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-3 w-3 bg-emerald-500 rounded-full shadow-sm"></div>
            <div className="text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">NEW VERSION</div>
          </div>
          <div className="text-base leading-relaxed text-gray-800 bg-white/50 p-3 rounded-lg border border-emerald-100 min-h-[200px]">
            <div className="whitespace-pre-wrap">
              {formattedNewText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= FULLSCREEN DIFF COMPONENT ================= */

function FullscreenDiffViewer({ detail, onClose }: { detail: ComparisonDetail; onClose: () => void }) {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const changes = detail.changes;
  const currentChange = changes[currentChangeIndex];

  const handlePrev = () => {
    setCurrentChangeIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentChangeIndex(prev => Math.min(changes.length - 1, prev + 1));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getHighlightedOldText = () => {
    const oldText = currentChange.old_text || '';
    const newText = currentChange.new_text || '';
    
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/).filter(w => w.trim().length > 0);
    const newWordSet = new Set(newWords);
    
    const lines = oldText.split('\n');
    
    return lines.map((line, lineIndex) => {
      if (!line.trim()) return <div key={lineIndex} className="h-4"></div>;
      
      const words = line.split(/(\s+)/);
      
      return (
        <div key={lineIndex} className="mb-2 last:mb-0">
          {words.map((word, wordIndex) => {
            if (!newWordSet.has(word) && word.trim().length > 0) {
              return (
                <span
                  key={`${lineIndex}-${wordIndex}`}
                  className="bg-red-200 text-red-900 px-1 py-0.5 rounded border border-red-300 font-medium line-through decoration-red-700 decoration-2 mx-0.5"
                >
                  {word}
                </span>
              );
            }
            return word;
          })}
        </div>
      );
    });
  };

  const getHighlightedNewText = () => {
    const oldText = currentChange.old_text || '';
    const newText = currentChange.new_text || '';
    
    const oldWords = oldText.split(/(\s+)/).filter(w => w.trim().length > 0);
    const newWords = newText.split(/(\s+)/);
    const oldWordSet = new Set(oldWords);
    
    const lines = newText.split('\n');
    
    return lines.map((line, lineIndex) => {
      if (!line.trim()) return <div key={lineIndex} className="h-4"></div>;
      
      const words = line.split(/(\s+)/);
      
      return (
        <div key={lineIndex} className="mb-2 last:mb-0">
          {words.map((word, wordIndex) => {
            if (!oldWordSet.has(word) && word.trim().length > 0) {
              return (
                <span
                  key={`${lineIndex}-${wordIndex}`}
                  className="bg-emerald-200 text-emerald-900 px-1 py-0.5 rounded border border-emerald-300 font-medium mx-0.5"
                >
                  {word}
                </span>
              );
            }
            return word;
          })}
        </div>
      );
    });
  };

  const highlightedOldText = getHighlightedOldText();
  const highlightedNewText = getHighlightedNewText();
  const currentRiskBadge = riskBadge(currentChange.risk_level);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Minimal Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="ปิด (ESC)"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h2 className="font-semibold text-gray-900 line-clamp-1">{detail.document_name}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-blue-600">{detail.version_old_label}</span>
                <span>→</span>
                <span className="font-medium text-emerald-600">{detail.version_new_label}</span>
                <span className="mx-1">•</span>
                <span>Change {currentChangeIndex + 1} of {changes.length}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentChangeIndex === 0}
              className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors"
              title="ก่อนหน้า (←)"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="min-w-[80px] text-center text-sm font-medium text-gray-700">
              {currentChangeIndex + 1}/{changes.length}
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentChangeIndex === changes.length - 1}
              className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors"
              title="ถัดไป (→)"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - True Fullscreen */}
      <div className="flex-1 grid grid-cols-2 pt-12 overflow-hidden">
        {/* Old Version Panel */}
        <div className="h-full overflow-auto p-8 bg-gradient-to-b from-red-50/20 to-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-4 w-4 bg-red-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-red-700">OLD VERSION</h3>
                <span className="ml-auto text-sm font-medium bg-red-100 text-red-700 px-3 py-1 rounded-full">
                  {detail.version_old_label}
                </span>
              </div>
              <p className="text-sm text-gray-500">ข้อความที่ถูกลบหรือเปลี่ยนแปลงจะถูกไฮไลท์ด้วยสีแดง</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-red-100 shadow-sm">
              <div className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap">
                {currentChange.old_text ? highlightedOldText : <span className="text-gray-400 italic">ไม่มีข้อความ</span>}
              </div>
            </div>
          </div>
        </div>

        {/* New Version Panel */}
        <div className="h-full overflow-auto p-8 bg-gradient-to-b from-emerald-50/20 to-white border-l border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-4 w-4 bg-emerald-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-emerald-700">NEW VERSION</h3>
                <span className="ml-auto text-sm font-medium bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                  {detail.version_new_label}
                </span>
              </div>
              <p className="text-sm text-gray-500">ข้อความที่เพิ่มหรือเปลี่ยนแปลงจะถูกไฮไลท์ด้วยสีเขียว</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-emerald-100 shadow-sm">
              <div className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap">
                {currentChange.new_text ? highlightedNewText : <span className="text-gray-400 italic">ไม่มีข้อความ</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Footer with Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-full px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Section:</span>
              <span className="font-semibold">{currentChange.section_label || "No Section"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Type:</span>
              {changeTypeBadge(currentChange.change_type)}
            </div>
            {currentRiskBadge && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Risk:</span>
                {currentRiskBadge}
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">ESC</kbd> to close • 
            <kbd className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">←</kbd>
            <kbd className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">→</kbd> to navigate
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandableText({ text, title, maxLength = 300, type = "normal" }: { 
  text: string | null | undefined; 
  title?: string;
  maxLength?: number;
  type?: "normal" | "ai";
}) {
  const raw = normalizeText(text);
  const [expanded, setExpanded] = useState(false);
  const isLong = raw.length > maxLength;
  const shown = expanded ? raw : raw.slice(0, maxLength) + (isLong ? "..." : "");

  const bgColor = type === "ai" ? "bg-gradient-to-br from-blue-50/80 to-blue-100/50" : "bg-gray-50";
  
  const formattedText = shown ? shown.split('\n').map((line, index) => (
    <div key={index} className="mb-2 last:mb-0">
      {line}
    </div>
  )) : <span className="text-gray-400 italic">ไม่มีข้อมูล</span>;

  return (
    <div className={`rounded-xl p-4 ${bgColor} border ${type === "ai" ? "border-blue-200" : "border-gray-200"}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base font-bold text-gray-900">{title}</span>
        </div>
      )}
      <div className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed font-normal">
        {formattedText}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {expanded ? "ย่อข้อความ" : "อ่านต่อ..."}
        </button>
      )}
    </div>
  );
}

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

function ChatMessageContent({ content, role }: { content: string; role: "user" | "assistant" }) {
  if (!content) return null;
  if (role === "user") {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

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

/* ================= AI CHAT COMPONENT ================= */

function AIChat({ change }: { change: ChangeItem }) {
  const STATUS_PREFIX = "__STATUS__:"

  const [chatOpen, setChatOpen] = useState(false)

  const [messages, setMessages] = useState<
    { role: "user" | "assistant", content: string }[]
  >([])

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [assistantStatus, setAssistantStatus] = useState("")

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sendChat = async () => {

    if (loading) return

    const question = input.trim()
    if (!question) return

    setInput("")
    setLoading(true)
    setChatError(null)
    setAssistantStatus("กำลังวิเคราะห์คำถาม...")

    setMessages(prev => [...prev, { role: "user", content: question }])
    setMessages(prev => [...prev, { role: "assistant", content: "" }])

    try {

      const res = await fetch(`${API_BASE_CHAT}/changes/${change.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        cache: "no-store",
        body: JSON.stringify({ question }),
      })

      if (!res.ok) throw new Error(`Chat failed (${res.status})`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream reader")

      const decoder = new TextDecoder("utf-8")

      let done = false
      let fullText = ""
      let buffer = ""
      let sawSseFrame = false
      const parseSsePart = (part: string): { eventName: string; payload: string } => {
        const lines = part.split(/\r?\n/)
        let eventName = "message"
        const dataLines: string[] = []

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim()
            continue
          }
          if (!line.startsWith("data:")) continue
          dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5))
        }

        return { eventName, payload: dataLines.join("\n") }
      }

      while (!done) {

        const { value, done: doneReading } = await reader.read()
        done = doneReading

        const chunkText = decoder.decode(value || new Uint8Array(), { stream: true })
        buffer += chunkText

        // ⭐ แยก SSE event
        const parts = buffer.split(/\r?\n\r?\n/)
        buffer = parts.pop() || ""
        let appended = false

        for (const part of parts) {
          const { eventName, payload } = parseSsePart(part)
          if (!payload) continue

          sawSseFrame = true

          if (eventName === "status" || payload.startsWith(STATUS_PREFIX)) {
            const message = payload.startsWith(STATUS_PREFIX)
              ? payload.slice(STATUS_PREFIX.length).trim()
              : payload.trim()
            if (message) setAssistantStatus(message)
            continue
          }

          fullText += payload
          appended = true
        }

        if (!sawSseFrame && chunkText) {
          fullText += chunkText
          appended = true
        }

        if (done && buffer) {
          if (buffer.includes("data:")) {
            const { eventName, payload } = parseSsePart(buffer)
            if (payload) {
              if (eventName === "status" || payload.startsWith(STATUS_PREFIX)) {
                const message = payload.startsWith(STATUS_PREFIX)
                  ? payload.slice(STATUS_PREFIX.length).trim()
                  : payload.trim()
                if (message) setAssistantStatus(message)
              } else {
                fullText += payload
                appended = true
              }
            }
          } else if (!sawSseFrame) {
            fullText += buffer
            appended = true
          }
          buffer = ""
        }

        // realtime update
        if (appended) {
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1].content = fullText
            return copy
          })
        }
      }

    } catch (e: any) {

      setChatError(e?.message || "ส่งคำถามไม่สำเร็จ")

      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1].content = "❌ เกิดข้อผิดพลาด"
        return copy
      })

    } finally {
      setLoading(false)
      setAssistantStatus("")
    }
  }

  return (
    <div className="space-y-4">

      {/* ================= AI COMMENT + SUGGESTION (เหมือนเดิม) ================= */}
      <div className="grid md:grid-cols-2 gap-4">

        <div className="rounded-xl overflow-hidden border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <InformationCircleIcon className="h-5 w-5 text-white" />
                <h3 className="text-base font-bold text-white">ความคิดเห็นจาก AI</h3>
              </div>
            </div>
          </div>
          <div className="p-4">
            <ExpandableText text={change.ai_comment} type="ai" />
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white shadow-sm">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LightBulbIcon className="h-5 w-5 text-white" />
                <h3 className="text-base font-bold text-white">คำแนะนำจาก AI</h3>
              </div>
            </div>
          </div>
          <div className="p-4">
            <ExpandableText text={change.ai_suggestion} type="ai" />
          </div>
        </div>

      </div>

      {/* ================= CHAT BUBBLE ================= */}
      <div className="rounded-xl border border-purple-200 overflow-hidden bg-gradient-to-br from-purple-50/30 to-white shadow-sm">

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
            <span className="text-base font-bold text-white">
              ถาม AI เพิ่มเติมเกี่ยวกับจุดนี้
            </span>
          </div>
          <span className="text-white font-bold">{chatOpen ? "▲" : "▼"}</span>
        </button>

        {chatOpen && (
          <div className="flex flex-col h-[420px]">

            <div
              ref={scrollRef}
              className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      px-4 py-2 rounded-2xl max-w-[75%]
                      text-sm shadow
                      ${m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200"}
                    `}
                  >
                    <ChatMessageContent
                      role={m.role}
                      content={m.content || (loading && m.role === "assistant" ? (assistantStatus || "Thinking...") : "")}
                    />
                  </div>
                </div>
              ))}
            </div>

            {chatError && (
              <div className="px-4 pb-2 text-sm text-red-600">
                {chatError}
              </div>
            )}

            <div className="border-t p-3 flex gap-2 bg-white">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="พิมพ์คำถาม..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={e => {
                  if (e.key === "Enter") sendChat()
                }}
              />
              <button
                onClick={sendChat}
                disabled={loading}
                className="bg-blue-600 text-white px-4 rounded-lg text-sm font-medium"
              >
                ส่ง
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  )
}


/* ================= MAIN PAGE ================= */

export default function CompareReportPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ComparisonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ChangeType>("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenChangeIndex, setFullscreenChangeIndex] = useState(0);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/comparisons/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data: ComparisonDetail = await res.json();
      setDetail(data);
    } catch (err: any) {
      setError(err?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFullscreen = (index: number) => {
    setFullscreenChangeIndex(index);
    setShowFullscreen(true);
  };

  const filteredChanges = useMemo(() => {
    const changes = detail?.changes || [];
    const query = searchQuery.trim();

    return changes.filter(c => {
      if (riskFilter !== "ALL") {
        const lv = (c.risk_level || "LOW").toUpperCase();
        if (lv !== riskFilter) return false;
      }

      if (typeFilter !== "ALL") {
        if (c.change_type !== typeFilter) return false;
      }

      if (query.length > 0) {
        const hay = [
          c.section_label,
          c.old_text,
          c.new_text,
          c.ai_comment,
          c.ai_suggestion,
          c.risk_reason,
          c.change_type,
          c.risk_level,
        ]
          .map(x => normalizeText(x as any))
          .join(" | ");

        if (!contains(hay, query)) return false;
      }

      return true;
    });
  }, [detail?.changes, searchQuery, riskFilter, typeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-gray-700 font-medium">กำลังโหลดรายงาน...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md shadow-sm">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 mt-4 text-center">ไม่พบรายงาน</h2>
          <p className="text-gray-600 mt-2 text-center">{error || "ไม่พบข้อมูลการเปรียบเทียบนี้"}</p>
          <button
            onClick={loadDetail}
            className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-sm"
          >
            โหลดใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showFullscreen && detail && (
        <FullscreenDiffViewer 
          detail={detail} 
          onClose={() => setShowFullscreen(false)} 
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                    {detail.document_name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-gray-700 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg font-semibold shadow-sm">
                        {detail.version_old_label}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm rounded-lg font-semibold shadow-sm">
                        {detail.version_new_label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">•</span>
                      {formatDateTime(detail.created_at)}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">•</span>
                      <span>ID: {detail.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 font-medium mb-1">ความเสี่ยงรวม</div>
                    <div className={`text-2xl font-bold ${
                      detail.overall_risk_level?.includes("HIGH") ? "text-red-600" :
                      detail.overall_risk_level?.includes("MEDIUM") ? "text-amber-600" :
                      "text-emerald-600"
                    }`}>
                      {detail.overall_risk_level || "ไม่ระบุ"}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    
                    
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium shadow-sm"
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4" />
                      ฟิลเตอร์
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* AI Summary */}
            {detail.summary_text && (
              <div className="mt-6 bg-gradient-to-br from-blue-50/80 to-white rounded-2xl border border-blue-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DocumentMagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">สรุปผลการวิเคราะห์</h2>
                </div>
                <div className="text-base text-gray-800 leading-relaxed bg-white/50 border border-blue-100 rounded-xl p-4">
                  <ChatMessageContent role="assistant" content={detail.summary_text} />
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-700" />
                  <h3 className="font-bold text-gray-900">ค้นหาและกรองข้อมูล</h3>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ปิด
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหาคำ</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาคำในรายการเปลี่ยนแปลง..."
                      className="w-full pl-10 pr-3 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">กรองความเสี่ยง</label>
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value as any)}
                      className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">ความเสี่ยงทั้งหมด</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">กรองประเภท</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full px-3 py-3 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">ประเภททั้งหมด</option>
                      <option value="ADDED">ADDED</option>
                      <option value="REMOVED">REMOVED</option>
                      <option value="MODIFIED">MODIFIED</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                แสดง {filteredChanges.length} จาก {detail.changes.length} รายการ
              </div>
            </div>
          )}

          {/* Changes List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">รายการเปลี่ยนแปลง</h2>
              <div className="text-sm text-gray-600">
                {filteredChanges.length} รายการ
              </div>
            </div>

            {filteredChanges.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                <p className="text-lg text-gray-500">ไม่พบรายการเปลี่ยนแปลงตามเงื่อนไขที่เลือก</p>
              </div>
            ) : (
              filteredChanges.map((change, index) => (
                <div key={change.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {changeTypeBadge(change.change_type)}
                        <h3 className="text-lg font-bold text-gray-900">
                          {change.section_label || "ไม่มีหัวข้อ"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        {riskBadge(change.risk_level)}
                        <span className="text-sm text-gray-500">ID: {change.id}</span>
                        <button
                          onClick={() => handleOpenFullscreen(index)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-sm"
                        >
                          <ArrowsPointingOutIcon className="h-4 w-4" />
                          เปิดเต็มจอ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-6">
                    {/* Diff View with highlighted changes */}
                    <div>
                      <h4 className="text-base font-bold text-gray-800 mb-3">การเปลี่ยนแปลงข้อความ</h4>
                      <DiffView
                        oldText={normalizeText(change.old_text)}
                        newText={normalizeText(change.new_text)}
                      />
                    </div>

                    {/* AI Analysis Section */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                        <h4 className="text-lg font-bold text-gray-900">การวิเคราะห์ด้วย AI</h4>
                      </div>
                      <AIChat change={change} />
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

