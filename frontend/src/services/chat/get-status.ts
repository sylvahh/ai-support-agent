import axios from "@/lib/axios";
import type { ConversationStatusResponse } from "@/types/chat.types";
import ensureError from "@/lib/ensure-error";

type Parameters = {
  sessionId: string;
};

export async function getStatus(data: Parameters): Promise<ConversationStatusResponse> {
  try {
    const response = await axios.get<ConversationStatusResponse>(
      `/chat/status/${data.sessionId}`
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

export default getStatus;
