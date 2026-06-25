import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadMurtiPhoto } from "@/lib/bookings";
import type { Booking } from "@/lib/bookings";
import { compressImage } from "@/lib/image";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MurtiImage } from "@/components/MurtiImage";
import { Camera, Image as ImageIcon, Loader2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bookings/new")({
  ssr: false,
  component: NewBooking,
});

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter customer name").max(100),
  mobile_number: z
    .string()
    .trim()
    .regex(/^[+\d\s-]{7,15}$/, "Enter a valid mobile number"),
  total_amount: z.number().nonnegative("Must be ≥ 0").max(10_000_000),
  advance_amount: z.number().nonnegative("Must be ≥ 0").max(10_000_000),
  notes: z.string().max(500).optional(),
});

function NewBooking() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [total, setTotal] = useState("");
  const [advance, setAdvance] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);

  const dupQuery = useQuery({
    queryKey: ["dup", mobile],
    queryFn: async () => {
      if (mobile.length < 7) return [];
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("mobile_number", mobile.trim())
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Booking[];
    },
    enabled: mobile.trim().length >= 7,
  });

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({
        customer_name: customerName,
        mobile_number: mobile,
        total_amount: Number(total || 0),
        advance_amount: Number(advance || 0),
        notes: notes || undefined,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      if (parsed.data.advance_amount > parsed.data.total_amount) {
        throw new Error("Advance cannot be greater than total");
      }

      let photoPath: string | null = null;
      if (photoFile) {
        const compressed = await compressImage(photoFile);
        photoPath = await uploadMurtiPhoto(compressed);
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          customer_name: parsed.data.customer_name,
          mobile_number: parsed.data.mobile_number,
          total_amount: parsed.data.total_amount,
          advance_amount: parsed.data.advance_amount,
          notes: parsed.data.notes ?? null,
          murti_photo_url: photoPath,
          created_by: userData.user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Booking;
    },
    onSuccess: (b) => {
      qc.invalidateQueries();
      setCreated(b);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  if (created) {
    return (
      <AppShell title="Booking Created">
        <div className="overflow-hidden rounded-3xl border border-success/30 bg-gradient-to-b from-success/10 to-card shadow-lg">
          <div className="grid place-items-center bg-success/15 py-6">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-success text-success-foreground text-3xl font-bold">
              ✓
            </div>
            <p className="mt-2 font-semibold text-success">Booking saved</p>
          </div>
          <div className="p-4">
            <div className="mb-4 overflow-hidden rounded-2xl">
              <MurtiImage
                path={created.murti_photo_url}
                alt={created.customer_name}
                className="aspect-square w-full"
              />
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Booking #" value={<span className="font-mono font-bold text-primary">{created.booking_number}</span>} />
              <Row label="Customer" value={created.customer_name} />
              <Row label="Mobile" value={created.mobile_number} />
              <Row label="Total" value={formatINR(created.total_amount)} />
              <Row label="Advance" value={formatINR(created.advance_amount)} />
              <Row label="Pending" value={<span className="font-semibold text-destructive">{formatINR(created.pending_amount)}</span>} />
              <Row label="Booked" value={formatDateTime(created.created_at)} />
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
                Done
              </Button>
              <Button
                onClick={() => {
                  setCreated(null);
                  setCustomerName("");
                  setMobile("");
                  setTotal("");
                  setAdvance("");
                  setNotes("");
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
              >
                Add another
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="New Booking">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {/* Photo */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <Label className="mb-2 block">Murti Photo</Label>
          {photoPreview ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={photoPreview} alt="preview" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow"
                aria-label="Remove photo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background py-8 text-foreground hover:bg-accent/10"
              >
                <Camera className="h-7 w-7 text-primary" />
                <span className="text-sm font-semibold">Camera</span>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onPickPhoto}
                />
              </label>
              <label
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background py-8 text-foreground hover:bg-accent/10"
              >
                <ImageIcon className="h-7 w-7 text-primary" />
                <span className="text-sm font-semibold">Gallery</span>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onPickPhoto}
                />
              </label>
            </div>
          )}

        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-12"
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number *</Label>
            <Input
              id="mobile"
              inputMode="tel"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="h-12"
              required
              maxLength={15}
            />
            {dupQuery.data && dupQuery.data.length > 0 && (
              <div className="mt-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <div className="mb-1 flex items-center gap-1 font-semibold text-warning-foreground">
                  <AlertTriangle className="h-4 w-4" /> Existing customer
                </div>
                <p className="text-xs text-muted-foreground">
                  This mobile has {dupQuery.data.length} previous booking
                  {dupQuery.data.length > 1 ? "s" : ""}.
                </p>
                <div className="mt-2 space-y-1">
                  {dupQuery.data.map((b) => (
                    <Link
                      key={b.id}
                      to="/bookings/$id"
                      params={{ id: b.id }}
                      className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2 py-1.5 text-xs"
                    >
                      <span className="font-mono font-semibold text-primary">{b.booking_number}</span>
                      <span className="truncate">{b.customer_name}</span>
                      <span className="text-muted-foreground">{b.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="total">Total Amount (₹) *</Label>
              <Input
                id="total"
                inputMode="decimal"
                type="number"
                min={0}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance">Advance (₹) *</Label>
              <Input
                id="advance"
                inputMode="decimal"
                type="number"
                min={0}
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="h-12"
                required
              />
            </div>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-bold text-destructive">
                {formatINR(Math.max(0, Number(total || 0) - Number(advance || 0)))}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        </div>

        <Button type="submit" className="h-14 w-full text-base font-semibold" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Booking
        </Button>
      </form>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
