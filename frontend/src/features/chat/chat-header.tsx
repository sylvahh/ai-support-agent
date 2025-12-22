import { Bot, X, Minus } from "lucide-react";
import type { ConversationStatus } from "@/types/chat.types";

interface ChatHeaderProps {
  status: ConversationStatus;
  onClose?: () => void;
}

export function ChatHeader({ status, onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">ShopEase Support</h2>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "open" ? "bg-green-400" : "bg-gray-300"
              }`}
            />
            <span className="text-xs text-white/80">
              {status === "open" ? "Online" : "Conversation closed"}
            </span>
          </div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Minimize chat"
        >
          <Minus className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
