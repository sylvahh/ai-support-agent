import axios from "@/lib/axios";
import type { SendMessageResponse } from "@/types/chat.types";
import ensureError from "@/lib/ensure-error";

type Parameters = {
  message: string;
  sessionId?: string;
  file?: File;
};

export async function sendMessage(data: Parameters): Promise<SendMessageResponse> {
  try {
    const formData = new FormData();
    formData.append("message", data.message);

    if (data.sessionId) {
      formData.append("sessionId", data.sessionId);
    }

    if (data.file) {
      formData.append("file", data.file);
    }

    const response = await axios.post<SendMessageResponse>("/chat/message", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (err) {
    const error = ensureError(err);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default sendMessage;
