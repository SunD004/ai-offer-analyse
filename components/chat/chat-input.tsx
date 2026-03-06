"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  // Handle auto-resizing of textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Only resize when not composing (for IME input)
      if (!isComposing) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
      }
    }
  }, [value, isComposing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSubmit();
    }
  };

  // Handle composition events for IME input (Chinese, Japanese, etc.)
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <div className="flex items-end gap-2 border-t bg-background p-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="Ask a question about your documents..."
        rows={1}
        className="flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        // Prevent auto-resizing during composition to avoid flickering
        style={{
          height: "auto",
          minHeight: "40px",
          maxHeight: "150px"
        }}
      />
      <Button
        size="icon"
        onClick={onSubmit}
        disabled={!value.trim() || isLoading}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
