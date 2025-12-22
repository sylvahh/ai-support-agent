import axios from "@/lib/axios";
import type { MarkReadResponse } from "@/types/chat.types";
import ensureError from "@/lib/ensure-error";

type Parameters = {
  sessionId: string;
};

export async function markAllRead(data: Parameters): Promise<MarkReadResponse> {
  try {
    const response = await axios.patch<MarkReadResponse>(
      `/chat/read-all/${data.sessionId}`
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

export default markAllRead;
