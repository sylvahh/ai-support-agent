import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat.types";
import { MessageItem } from "./message-item";
import { TypingIndicator } from "./typing-indicator";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto chat-scrollbar py-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Welcome to ShopEase Support!</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Hi! I'm Ava, your support assistant. How can I help you today?
          </p>
        </div>
      )}

      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isLoading && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  );
}
