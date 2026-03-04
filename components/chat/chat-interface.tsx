"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { WEB_SEARCH_START, WEB_SEARCH_END } from "@/lib/ai/generate";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Globe, Plus, MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  _count: { messages: number };
}

interface ChatInterfaceProps {
  chatbotId: string;
}

export function ChatInterface({ chatbotId }: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { chatbotId, conversationId },
      }),
    [chatbotId, conversationId]
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    onFinish() {
      fetchConversations();
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const getRawText = (m: (typeof messages)[number]) =>
    m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  const isWebSearching = messages.some((m) => {
    const raw = getRawText(m);
    return raw.includes(WEB_SEARCH_START) && !raw.includes(WEB_SEARCH_END);
  });

  const stripSearchMarkers = (text: string) =>
    text.replace(new RegExp(WEB_SEARCH_START, "g"), "").replace(new RegExp(WEB_SEARCH_END, "g"), "");

  const fetchConversations = async () => {
    const res = await fetch(`/api/conversations?chatbotId=${chatbotId}`);
    setConversations(await res.json());
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId]);

  // Load conversation messages when switching
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((msgs) => {
        setMessages(
          msgs.map((m: { role: string; content: string; id: string }) => ({
            id: m.id,
            role: m.role.toLowerCase() as "user" | "assistant",
            content: m.content,
            parts: [{ type: "text" as const, text: m.content }],
          }))
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    sendMessage({ parts: [{ type: "text", text: message }] });
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 lg:h-[calc(100vh-3rem)]">
      {/* Conversation sidebar */}
      <div className="hidden w-56 shrink-0 flex-col border-r pr-4 md:flex">
        <Button
          variant="outline"
          size="sm"
          className="mb-3 w-full"
          onClick={startNewConversation}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setConversationId(conv.id)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                  conversationId === conv.id ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <MessageSquare className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {conv.title || "Untitled chat"}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Start a conversation by asking a question about your documents.
              </p>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role as "user" | "assistant"}
                content={stripSearchMarkers(getRawText(message))}
              />
            ))}
            {isWebSearching && (
              <div className="flex items-center gap-2.5 rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground w-fit">
                <Globe className="h-4 w-4 animate-spin" />
                <span>Searching the web…</span>
              </div>
            )}
            {isLoading && !isWebSearching && messages[messages.length - 1]?.role === "user" && (
              <MessageBubble role="assistant" content="Thinking..." />
            )}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error.message || "Une erreur s'est produite."}
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
