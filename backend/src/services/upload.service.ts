import cloudinary from '../config/cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  fileType: string;
  fileSize: number;
  fileName: string;
}

export interface UploadError {
  message: string;
  code: string;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  // Convert buffer to base64 data URI
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  // Determine resource type based on mime type
  const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'spur-chat-attachments',
    resource_type: resourceType,
    public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    fileType: mimeType,
    fileSize: result.bytes,
    fileName: fileName,
  };
}

export async function deleteFile(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
}

export async function getFileAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}
