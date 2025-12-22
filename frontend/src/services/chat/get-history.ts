import axios from "@/lib/axios";
import type { GetHistoryResponse } from "@/types/chat.types";
import ensureError from "@/lib/ensure-error";

type Parameters = {
  sessionId: string;
};

export async function getHistory(data: Parameters): Promise<GetHistoryResponse> {
  try {
    const response = await axios.get<GetHistoryResponse>(
      `/chat/history/${data.sessionId}`
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

export default getHistory;
