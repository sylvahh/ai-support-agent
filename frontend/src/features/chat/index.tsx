import { useState, useEffect, useCallback, useRef } from "react";
import { variables } from "@/constants";
import type { Message, ConversationStatus } from "@/types/chat.types";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ReopenBanner } from "./reopen-banner";
import sendMessage from "@/services/chat/send-message";
import getHistory from "@/services/chat/get-history";
import getStatus from "@/services/chat/get-status";
import markAllRead from "@/services/chat/mark-read";
import reopenConversation from "@/services/chat/reopen-conversation";
import ensureError from "@/lib/ensure-error";

interface ChatProps {
  onClose?: () => void;
}

export function Chat({ onClose }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationStatus>("open");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReopening, setIsReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningShown, setWarningShown] = useState(false);
  const lastMessageCountRef = useRef(0);

  // Load session from sessionStorage on mount
  useEffect(() => {
    const init = async () => {
      const storedSessionId = sessionStorage.getItem(variables.STORAGE_KEYS.sessionId);
      if (storedSessionId) {
        setSessionId(storedSessionId);
        await loadHistory(storedSessionId);
      }
      setIsInitialLoading(false);
    };
    init();
  }, []);

  // Poll for conversation status and new messages when session exists
  useEffect(() => {
    if (!sessionId || status === "closed") return;

    const pollForUpdates = async () => {
      try {
        // Check status
        const statusResponse = await getStatus({ sessionId });
        if (statusResponse.success && statusResponse.data) {
          // Check if warning was issued
          if (statusResponse.data.warningIssued && !warningShown) {
            setWarningShown(true);
            // Add warning message to chat
            const warningMessage: Message = {
              id: `warning-${Date.now()}`,
              sender: "ai",
              text: "This conversation will be closed in 1 minute due to inactivity. Please respond if you need further assistance.",
              isRead: true,
              createdAt: new Date().toISOString(),
              attachments: [],
            };
            setMessages((prev) => [...prev, warningMessage]);
          }

          if (statusResponse.data.status === "closed") {
            setStatus("closed");
            // Reload history to get the closing message
            await loadHistory(sessionId);
          }
        }

        // Also poll for new messages (in case AI sends warning via backend)
        const historyResponse = await getHistory({ sessionId });
        if (historyResponse.success && historyResponse.data) {
          const newMessages = historyResponse.data.messages;
          if (newMessages.length > lastMessageCountRef.current) {
            setMessages(newMessages);
            lastMessageCountRef.current = newMessages.length;
            await markAllRead({ sessionId });
          }
        }
      } catch (err) {
        console.error("Error polling:", err);
      }
    };

    // Poll for updates at configured interval
    const interval = setInterval(pollForUpdates, variables.STATUS_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [sessionId, status, warningShown]);

  // Load conversation history
  const loadHistory = async (sid: string) => {
    try {
      const response = await getHistory({ sessionId: sid });
      if (response.success && response.data) {
        setMessages(response.data.messages);
        setStatus(response.data.status);
        lastMessageCountRef.current = response.data.messages.length;

        // Mark messages as read
        await markAllRead({ sessionId: sid });
      } else {
        // Conversation doesn't exist anymore - clear stale session
        console.log("Conversation not found, clearing stale session");
        sessionStorage.removeItem(variables.STORAGE_KEYS.sessionId);
        setSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error loading history:", err);
      // Clear stale session on error
      sessionStorage.removeItem(variables.STORAGE_KEYS.sessionId);
      setSessionId(null);
    }
  };

  // Send a message
  const handleSend = useCallback(
    async (message: string, file?: File) => {
      setIsLoading(true);
      setError(null);
      setWarningShown(false); // Reset warning when user responds

      // Optimistically add user message
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        sender: "user",
        text: message,
        isRead: true,
        createdAt: new Date().toISOString(),
        attachments: file
          ? [
              {
                id: `temp-file-${Date.now()}`,
                fileName: file.name,
                fileType: file.type,
                fileUrl: URL.createObjectURL(file),
              },
            ]
          : [],
      };

      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        const response = await sendMessage({
          message,
          sessionId: sessionId || undefined,
          file,
        });

        if (response.success && response.reply && response.sessionId) {
          // Save session ID
          if (!sessionId) {
            setSessionId(response.sessionId);
            sessionStorage.setItem(
              variables.STORAGE_KEYS.sessionId,
              response.sessionId
            );
          }

          // Turn off loading BEFORE adding AI response
          setIsLoading(false);

          // Add AI response
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: response.reply,
            isRead: false,
            createdAt: new Date().toISOString(),
            attachments: [],
          };

          setMessages((prev) => [...prev, aiMessage]);
          lastMessageCountRef.current += 2; // User message + AI response

          // Mark as read after displaying
          if (response.sessionId) {
            await markAllRead({ sessionId: response.sessionId });
          }
        } else {
          setIsLoading(false);
          setError(response.error || "Failed to send message");
          // Remove optimistic message on error
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempUserMessage.id)
          );
        }
      } catch (err) {
        const error = ensureError(err);
        console.error("Error sending message:", error);
        setIsLoading(false);
        setError(error.message);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      }
    },
    [sessionId]
  );

  // Reopen conversation
  const handleReopen = async () => {
    if (!sessionId) return;

    setIsReopening(true);
    setError(null); // Clear any existing error
    try {
      const response = await reopenConversation({ sessionId });
      if (response.success) {
        setStatus("open");
        setWarningShown(false);
        // Reload history to get the summary message
        await loadHistory(sessionId);
      } else {
        setError(response.error || "Failed to reopen conversation");
      }
    } catch (err) {
      const error = ensureError(err);
      console.error("Error reopening conversation:", error);
      setError(error.message);
    } finally {
      setIsReopening(false);
    }
  };

  // Show loading state while initializing
  if (isInitialLoading) {
    return (
      <div className="flex flex-col h-[480px] w-[360px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        <ChatHeader status={status} onClose={onClose} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[480px] w-[360px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
      <ChatHeader status={status} onClose={onClose} />

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <MessageList messages={messages} isLoading={isLoading} />

      {status === "closed" ? (
        <ReopenBanner onReopen={handleReopen} isLoading={isReopening} />
      ) : (
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder="Ask about orders, shipping, returns..."
          onTyping={() => setError(null)}
        />
      )}
    </div>
  );
}

export default Chat;
