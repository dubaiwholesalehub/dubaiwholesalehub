const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function getProductImageUrl(storagePath?: string | null) {
  if (!storagePath || !SUPABASE_URL) {
    return null;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/products-images/${storagePath}`;
}