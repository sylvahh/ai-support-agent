import api from "@/lib/axios";
import axios from "axios";

interface UploadResponse {
  success: boolean;
  document?: {
    id: string;
    filename: string;
    totalChunks: number;
    size: number;
  };
  error?: string;
  retryable?: boolean;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<UploadResponse>("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    // Handle axios errors and extract server response
    if (axios.isAxiosError(error) && error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || "Upload failed",
        retryable: error.response.data.retryable || false,
      };
    }

    return {
      success: false,
      error: "Network error. Please check your connection.",
      retryable: true,
    };
  }
}
