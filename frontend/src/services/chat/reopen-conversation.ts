import axios from "@/lib/axios";
import type { ReopenResponse } from "@/types/chat.types";
import ensureError from "@/lib/ensure-error";

type Parameters = {
  sessionId: string;
};

export async function reopenConversation(data: Parameters): Promise<ReopenResponse> {
  try {
    const response = await axios.patch<ReopenResponse>(
      `/chat/reopen/${data.sessionId}`
    );

    return response.data;
  } catch (err) {
    const error = ensureError(err);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default reopenConversation;
