import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ReopenBannerProps {
  onReopen: () => void;
  isLoading?: boolean;
}

export function ReopenBanner({ onReopen, isLoading = false }: ReopenBannerProps) {
  return (
    <div className="border-t p-4 bg-muted/50">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-3">
          This conversation has been closed due to inactivity.
        </p>
        <Button
          onClick={onReopen}
          disabled={isLoading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Reopening..." : "Reopen Conversation"}
        </Button>
      </div>
    </div>
  );
}
