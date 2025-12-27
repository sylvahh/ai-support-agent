import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { uploadDocument } from "@/services/document/upload-document";
import { getDocuments, type Document } from "@/services/document/get-documents";
import { deleteDocument } from "@/services/document/delete-document";
import ensureError from "@/lib/ensure-error";

export default function UploadPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(ensureError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await handleUpload(files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await handleUpload(files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const result = await uploadDocument(file);
      if (result.success) {
        setSuccess(`"${file.name}" uploaded successfully with ${result.document?.totalChunks} chunks`);
        await fetchDocuments();
      } else {
        setError(result.error || "Upload failed");
      }
    } catch (err) {
      setError(ensureError(err).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await deleteDocument(id);
      if (result.success) {
        setSuccess(`"${filename}" deleted successfully`);
        await fetchDocuments();
      } else {
        setError(result.error || "Delete failed");
      }
    } catch (err) {
      setError(ensureError(err).message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Knowledge Base
          </h1>
          <p className="text-slate-600">
            Upload documents to train the AI support agent
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`
            mb-8 p-8 border-2 border-dashed rounded-xl text-center transition-colors
            ${dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-white hover:border-blue-400"
            }
            ${isUploading ? "opacity-50 pointer-events-none" : ""}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.txt,.md"
            onChange={handleFileInput}
            disabled={isUploading}
          />

          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            {isUploading ? (
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            ) : (
              <Upload className="w-12 h-12 text-slate-400 mb-4" />
            )}

            <span className="text-lg font-medium text-slate-700 mb-2">
              {isUploading ? "Uploading..." : "Drop files here or click to upload"}
            </span>

            <span className="text-sm text-slate-500">
              Supported formats: PDF, TXT, MD
            </span>
          </label>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">
              Uploaded Documents ({documents.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <span className="text-slate-500">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-1">
                Upload PDF or text files to build your knowledge base
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{doc.filename}</p>
                      <p className="text-sm text-slate-500">
                        {formatFileSize(doc.size)} • {doc.totalChunks} chunks • {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">How it works</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Upload PDF or text documents containing your FAQ, policies, or product info</li>
            <li>2. Documents are automatically chunked and indexed for semantic search</li>
            <li>3. The AI will use this knowledge to answer customer questions</li>
            <li>4. If no documents are uploaded, it falls back to default ShopEase FAQ</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
