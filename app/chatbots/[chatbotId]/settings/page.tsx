"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ChatbotDocumentPicker } from "@/components/chatbots/chatbot-document-picker";
import { toast } from "sonner";

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
}

export default function ChatbotSettingsPage() {
  const params = useParams<{ chatbotId: string }>();
  const chatbotId = params.chatbotId;
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/chatbots/${chatbotId}`)
      .then((r) => r.json())
      .then((data) => {
        setChatbot(data);
        setName(data.name);
        setDescription(data.description ?? "");
        setSystemPrompt(data.systemPrompt);
      });
  }, [chatbotId]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/chatbots/${chatbotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, systemPrompt }),
    });
    setSaving(false);
    toast.success("Settings saved");
  };

  if (!chatbot) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Chatbot Settings</h1>

      <section className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </section>

      <Separator />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Documents</h2>
        <ChatbotDocumentPicker chatbotId={chatbotId} />
      </section>
    </div>
  );
}
