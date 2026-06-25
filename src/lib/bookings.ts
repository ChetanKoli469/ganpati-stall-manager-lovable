import { supabase } from "@/integrations/supabase/client";

export type BookingStatus = "Pending" | "Delivered";

export interface Booking {
  id: string;
  booking_number: string;
  customer_name: string;
  mobile_number: string;
  total_amount: number;
  advance_amount: number;
  pending_amount: number;
  murti_photo_url: string | null;
  notes: string | null;
  status: BookingStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
}

export const BUCKET = "murti-photos";

export async function uploadMurtiPhoto(file: Blob, ext = "jpg"): Promise<string> {
  const name = `${crypto.randomUUID()}.${ext}`;
  const path = `bookings/${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

const signedCache = new Map<string, { url: string; exp: number }>();

export async function getSignedPhotoUrl(path: string): Promise<string> {
  const cached = signedCache.get(path);
  if (cached && cached.exp > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("Failed to sign URL");
  signedCache.set(path, { url: data.signedUrl, exp: Date.now() + 3600_000 });
  return data.signedUrl;
}
