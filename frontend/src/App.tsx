import { useState, useEffect } from "react";
import { Chat } from "@/features/chat";
import { MessageCircle, X } from "lucide-react";
import "./index.css";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [showInitialPopup, setShowInitialPopup] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  // Auto-open chat widget after 2 seconds on first load
  useEffect(() => {
    const hasVisited = sessionStorage.getItem("_chat_visited");

    if (!hasVisited) {
      const timer = setTimeout(() => {
        setShowInitialPopup(true);
        setTimeout(() => {
          setIsOpen(true);
          setHasBeenOpened(true);
          sessionStorage.setItem("_chat_visited", "true");
        }, 100);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setHasBeenOpened(true);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasBeenOpened(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Demo page content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Welcome to ShopEase
          </h1>
          <p className="text-slate-600 text-lg">
            Your one-stop shop for electronics and gadgets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {["Smartphones", "Laptops", "Accessories"].map((category) => (
            <div
              key={category}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">
                  {category === "Smartphones" ? "📱" : category === "Laptops" ? "💻" : "🎧"}
                </span>
              </div>
              <h3 className="font-semibold text-lg text-slate-800 mb-2">
                {category}
              </h3>
              <p className="text-slate-500 text-sm">
                Browse our latest {category.toLowerCase()} collection
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Need Help?
          </h2>
          <p className="text-slate-600 mb-6">
            Click the chat icon in the bottom right corner to talk with Ava, our AI support assistant.
          </p>
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Available 24/7</span>
          </div>
        </div>
      </div>

      {/* Chat Widget Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Chat Window */}
        {isOpen && (
          <div
            className="mb-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
            style={{
              animation: "slideUp 0.3s ease-out"
            }}
          >
            <Chat onClose={handleClose} />
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={isOpen ? handleClose : handleOpen}
          className={`
            w-16 h-16 rounded-full shadow-xl
            flex items-center justify-center
            transition-all duration-300 ease-out
            ${isOpen
              ? "bg-slate-700 hover:bg-slate-800"
              : "bg-blue-600 hover:bg-blue-700 hover:scale-110"
            }
            ${!hasBeenOpened && showInitialPopup ? "animate-bounce" : ""}
          `}
          style={{
            boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5)"
          }}
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? (
            <X className="w-7 h-7 text-white" />
          ) : (
            <MessageCircle className="w-7 h-7 text-white" />
          )}
        </button>

        {/* Notification dot for new visitors */}
        {!hasBeenOpened && !isOpen && (
          <span
            className="absolute bottom-12 right-0 w-5 h-5 bg-red-500 rounded-full animate-pulse border-2 border-white"
            style={{ boxShadow: "0 2px 8px rgba(239, 68, 68, 0.5)" }}
          />
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
