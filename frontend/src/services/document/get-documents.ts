import api from "@/lib/axios";

export interface Document {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  totalChunks: number;
  createdAt: string;
}

interface GetDocumentsResponse {
  success: boolean;
  documents: Document[];
}

export async function getDocuments(): Promise<Document[]> {
  const response = await api.get<GetDocumentsResponse>("/documents");
  return response.data.documents;
}
