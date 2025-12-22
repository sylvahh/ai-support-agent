import { AxiosError } from "axios";

/**
 * Ensures that an error is an instance of Error with a proper message
 * Extracts the actual error message from Axios errors
 */
export default function ensureError(err: unknown): Error {
  // Handle Axios errors - extract the backend message
  if (err instanceof AxiosError) {
    if (err.response?.data?.message) {
      return new Error(err.response.data.message);
    }
    if (err.response?.data?.error) {
      return new Error(err.response.data.error);
    }
    if (err.message) {
      return new Error(err.message);
    }
  }

  // Already an Error instance
  if (err instanceof Error) {
    return err;
  }

  // Try to stringify unknown error types
  let stringText = "An unexpected error occurred";
  try {
    if (typeof err === "string") {
      stringText = err;
    } else {
      stringText = JSON.stringify(err);
    }
  } catch {
    // Ignore stringify errors
  }

  return new Error(stringText);
}
