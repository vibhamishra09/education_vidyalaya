import apiClient from './api-client';

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

export interface GenerateUploadUrlParams {
  filename: string;
  contentType: string;
  type?: 'avatar' | 'document';
}

/**
 * Get a presigned URL for uploading a file to S3
 */
export async function getPresignedUploadUrl(
  params: GenerateUploadUrlParams,
): Promise<PresignedUrlResponse> {
  const response = await apiClient.post<PresignedUrlResponse>(
    '/api/upload/presigned-url',
    params,
  );
  return response.data;
}

/**
 * Upload a file directly to S3 using a presigned URL
 */
export async function uploadFileToS3(
  file: File,
  uploadUrl: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }
}

/**
 * Upload a file (gets presigned URL and uploads in one call)
 */
export async function uploadFile(
  file: File,
  type: 'avatar' | 'document' = 'avatar',
): Promise<string> {
  // Get presigned URL
  const { uploadUrl, fileUrl } = await getPresignedUploadUrl({
    filename: file.name,
    contentType: file.type,
    type,
  });

  // Upload to S3
  await uploadFileToS3(file, uploadUrl);

  return fileUrl;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Please upload an image smaller than 5MB.',
    };
  }

  return { valid: true };
}

