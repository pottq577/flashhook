import type { ReactNode } from "react";

import styles from "@/widgets/legal/legal.module.css";

type Block =
  | { type: "h1" | "h2" | "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; lines: string[] };

const parseInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const pattern = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={nodes.length}>{token.slice(2, -2)}</strong>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a key={nodes.length} className={styles.link} href={linkMatch[2]}>
            {linkMatch[1]}
          </a>,
        );
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const parseMarkdown = (source: string): Block[] => {
  const blocks: Block[] = [];
  const lines = source.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: "ul", items: list });
      list = [];
    }
  };

  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push({ type: "quote", lines: quote });
      quote = [];
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushAll();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushAll();
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushAll();
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      flushQuote();
      list.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      const quoteLine = trimmed.replace(/^>\s?/, "");
      if (quoteLine !== "") {
        quote.push(quoteLine);
      }
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  flushAll();
  return blocks;
};

type LegalMarkdownProps = {
  source: string;
};

export const LegalMarkdown = ({ source }: LegalMarkdownProps) => {
  const blocks = parseMarkdown(source);

  return (
    <div className={styles.legalContainer}>
      {blocks.map((block, index) => {
        if (block.type === "h1") {
          return (
            <h1 key={index} className={styles.title}>
              {parseInline(block.text)}
            </h1>
          );
        }

        if (block.type === "h2") {
          return (
            <h2 key={index} className={styles.sectionTitle}>
              {parseInline(block.text)}
            </h2>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={index} className={styles.list}>
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-ul-${itemIndex}`} className={styles.listItem}>
                  {parseInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "quote") {
          const quoteListItems = block.lines.flatMap((line) =>
            line.startsWith("- ") ? [line.slice(2)] : []
          );

          if (quoteListItems.length === block.lines.length) {
            return (
              <div key={index} className={styles.highlightBox}>
                <ul className={styles.list}>
                  {quoteListItems.map((item, itemIndex) => (
                    <li key={`${index}-quote-ul-${itemIndex}`} className={styles.listItem}>
                      {parseInline(item)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <div key={index} className={styles.highlightBox}>
              {block.lines.map((line, lineIndex) => {
                return (
                  <p key={`${index}-quote-p-${lineIndex}`} className={styles.paragraph}>
                    {parseInline(line)}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <p key={index} className={styles.paragraph}>
            {parseInline(block.text)}
          </p>
        );
      })}
    </div>
  );
};
