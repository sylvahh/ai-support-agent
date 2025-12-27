import api from "@/lib/axios";

interface UploadResponse {
  success: boolean;
  document?: {
    id: string;
    filename: string;
    totalChunks: number;
    size: number;
  };
  error?: string;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadResponse>("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
