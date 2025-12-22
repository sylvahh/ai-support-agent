export type StorageKeys = {
  sessionId: string;
};

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const SERVER = BASE_URL;

const STORAGE_KEYS: StorageKeys = {
  sessionId: "_SPUR_chat_session_id",
};

// Polling interval for conversation status (in ms)
const STATUS_POLL_INTERVAL = 10000; // 10 seconds for more real-time feel

// Max file size for uploads (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
];

export {
  BASE_URL,
  SERVER,
  STORAGE_KEYS,
  STATUS_POLL_INTERVAL,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
};
