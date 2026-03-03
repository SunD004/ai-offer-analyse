import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatbotId: string }>;
}) {
  const { chatbotId } = await params;

  return <ChatInterface chatbotId={chatbotId} />;
}
