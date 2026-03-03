"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatbotCreateDialog } from "./chatbot-create-dialog";
import { Bot, MessageSquare, FileText, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { documents: number; conversations: number };
}

export function ChatbotList() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);

  const fetchChatbots = async () => {
    const res = await fetch("/api/chatbots");
    setChatbots(await res.json());
  };

  useEffect(() => {
    fetchChatbots();
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/chatbots/${id}`, { method: "DELETE" });
    toast.success("Chatbot deleted");
    fetchChatbots();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chatbots</h1>
        <ChatbotCreateDialog onCreated={fetchChatbots} />
      </div>

      {chatbots.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No chatbots yet. Create your first one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((bot) => (
            <Card key={bot.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <Bot className="mt-0.5 h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{bot.name}</h3>
                  {bot.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {bot.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {bot._count.documents} docs
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {bot._count.conversations} chats
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/chatbots/${bot.id}`}>Chat</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/chatbots/${bot.id}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(bot.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
