"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2.5 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Source badges inline : [Source N]
              p: ({ children }) => (
                <p className="my-1 leading-relaxed last:mb-0">
                  {typeof children === "string"
                    ? renderSourceBadges(children)
                    : children}
                </p>
              ),
              // Code blocks
              code: ({ className, children, ...props }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code
                    className={cn(
                      "block overflow-x-auto rounded bg-background/50 p-3 font-mono text-xs",
                      className
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className="rounded bg-background/50 px-1 py-0.5 font-mono text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              // Lists
              ul: ({ children }) => (
                <ul className="my-1 list-disc pl-4">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-1 list-decimal pl-4">{children}</ol>
              ),
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              // Headings
              h1: ({ children }) => (
                <h1 className="mb-1 mt-3 text-base font-semibold">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-1 mt-2 text-sm font-semibold">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 mt-2 text-sm font-medium">{children}</h3>
              ),
              // Tables (GFM)
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border bg-background/30 px-2 py-1 text-left font-medium">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-2 py-1">{children}</td>
              ),
              // Links
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  {children}
                </a>
              ),
              // Blockquote
              blockquote: ({ children }) => (
                <blockquote className="my-1 border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
              // Horizontal rule
              hr: () => <hr className="my-2 border-border" />,
            }}
          >
            {content}
          </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function renderSourceBadges(text: string): React.ReactNode {
  const parts = text.split(/(\[Source \d+\])/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const match = part.match(/\[Source (\d+)\]/);
    if (match) {
      return (
        <span
          key={i}
          className="mx-0.5 inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
        >
          Source {match[1]}
        </span>
      );
    }
    return part;
  });
}
