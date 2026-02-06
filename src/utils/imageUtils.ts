export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const LARGE_IMAGE_WARNING_THRESHOLD = 2 * 1024 * 1024; // 2MB

const VALID_IMAGE_PREFIX = 'image/';

/**
 * Converts a File object to a base64 data URL string.
 *
 * @param file - The File object to convert
 * @returns A promise that resolves to the base64 data URL
 * @throws Error if the file is not an image type or exceeds size limit
 */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith(VALID_IMAGE_PREFIX)) {
    return Promise.reject(
      new Error(`Invalid file type: ${file.type}. Only image files are allowed.`)
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return Promise.reject(
      new Error(`File size (${sizeMB}MB) exceeds maximum allowed size of ${maxSizeMB}MB.`)
    );
  }

  // Warn about large files but allow upload
  if (file.size > LARGE_IMAGE_WARNING_THRESHOLD) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.warn(
      `Large image file detected (${sizeMB}MB). This may impact performance and localStorage capacity.`
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };

    reader.readAsDataURL(file);
  });
}
