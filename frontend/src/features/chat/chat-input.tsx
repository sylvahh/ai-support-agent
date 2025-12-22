import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { variables } from "@/constants";

interface ChatInputProps {
  onSend: (message: string, file?: File) => void;
  disabled?: boolean;
  placeholder?: string;
  onTyping?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your message...",
  onTyping,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage && !file) return;

    onSend(trimmedMessage || "Please see the attached file.", file || undefined);
    setMessage("");
    setFile(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!variables.ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      alert("File type not supported. Please upload an image, PDF, or text file.");
      return;
    }

    // Validate file size
    if (selectedFile.size > variables.MAX_FILE_SIZE) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }

    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-md">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground flex-1 truncate">
            {file.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={removeFile}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {/* File upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept={variables.ALLOWED_FILE_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "min-h-[40px] max-h-[120px] placeholder:text-xs!"
            )}
            style={{
              height: "40px",
              overflowY: message.split("\n").length > 3 ? "auto" : "hidden",
            }}
          />
        </div>

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={disabled || (!message.trim() && !file)}
          className="shrink-0 p-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
