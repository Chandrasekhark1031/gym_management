export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function validateImageFile(file: File): string | null {
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'Invalid file type. Use JPG, PNG, or WebP.';
  }
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Invalid file extension. Use JPG, PNG, or WebP.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large. Maximum size is 5 MB.';
  }
  if (file.size === 0) {
    return 'File is empty.';
  }
  return null;
}

export const GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
