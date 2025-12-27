import api from "@/lib/axios";

interface DeleteResponse {
  success: boolean;
  filename?: string;
  error?: string;
}

export async function deleteDocument(id: string): Promise<DeleteResponse> {
  const response = await api.delete<DeleteResponse>(`/documents/${id}`);
  return response.data;
}
