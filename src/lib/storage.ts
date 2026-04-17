import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.warn(
    "[storage] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas. La subida de archivos no funcionará."
  );
}

export const supabaseAdmin: SupabaseClient | null =
  url && serviceRole
    ? createClient(url, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const BUCKET_PHOTOS = "employee-photos";
export const BUCKET_DOCS = "employee-documents";

export const MAX_PHOTO_SIZE_MB = 5;
export const MAX_DOC_SIZE_MB = 10;

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const DOC_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function isValidImageMime(mime: string) {
  return IMAGE_MIMES.includes(mime.toLowerCase());
}

export function isValidDocMime(mime: string) {
  return DOC_MIMES.includes(mime.toLowerCase());
}

export async function uploadPhoto(params: {
  employeeId: string;
  buffer: ArrayBuffer;
  contentType: string;
}) {
  if (!supabaseAdmin) throw new Error("Supabase no configurado");
  const ext = params.contentType.split("/")[1] ?? "jpg";
  const path = `${params.employeeId}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_PHOTOS)
    .upload(path, params.buffer, {
      contentType: params.contentType,
      upsert: true,
    });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(BUCKET_PHOTOS).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function uploadDocument(params: {
  employeeId: string;
  kind: string;
  buffer: ArrayBuffer;
  contentType: string;
  originalName: string;
}) {
  if (!supabaseAdmin) throw new Error("Supabase no configurado");
  const ext = params.originalName.split(".").pop()?.toLowerCase() ?? "bin";
  const filename = `${Date.now()}.${ext}`;
  const path = `${params.employeeId}/${params.kind}/${filename}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_DOCS)
    .upload(path, params.buffer, {
      contentType: params.contentType,
      upsert: false,
    });
  if (error) throw error;
  return { path };
}

export async function getSignedDocUrl(path: string, expiresIn = 60 * 10) {
  if (!supabaseAdmin) throw new Error("Supabase no configurado");
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_DOCS)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
