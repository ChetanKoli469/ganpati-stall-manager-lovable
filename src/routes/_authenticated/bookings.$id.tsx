import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/lib/bookings";
import { AppShell } from "@/components/AppShell";
import { MurtiImage } from "@/components/MurtiImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateTime, formatINR } from "@/lib/format";
import { CheckCheck, Loader2, Pencil, Phone, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  ssr: false,
  component: BookingDetails,
});

function BookingDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Booking;
    },
  });

  const deliverMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "Delivered", delivered_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as delivered");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking deleted");
      qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) {
    return (
      <AppShell title="Booking">
        <div className="grid place-items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }
  if (!booking) {
    return (
      <AppShell title="Booking">
        <p className="text-center text-muted-foreground">Not found</p>
      </AppShell>
    );
  }

  if (editing) return <EditView booking={booking} onClose={() => setEditing(false)} />;

  return (
    <AppShell title={booking.booking_number}>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <MurtiImage
          path={booking.murti_photo_url}
          alt={booking.customer_name}
          className="aspect-square w-full"
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-sm font-semibold text-primary">
                {booking.booking_number}
              </div>
              <h2 className="mt-0.5 text-2xl font-bold">{booking.customer_name}</h2>
              <a
                href={`tel:${booking.mobile_number}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary"
              >
                <Phone className="h-4 w-4" />
                {booking.mobile_number}
              </a>
            </div>
            <Badge
              variant="outline"
              className={
                booking.status === "Delivered"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/40 bg-warning/15 text-warning-foreground"
              }
            >
              {booking.status}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3">
            <Stat label="Total" value={formatINR(booking.total_amount)} />
            <Stat label="Advance" value={formatINR(booking.advance_amount)} />
            <Stat
              label="Pending"
              value={formatINR(booking.pending_amount)}
              accent={Number(booking.pending_amount) > 0 ? "destructive" : "success"}
            />
          </div>

          {booking.notes && (
            <div className="mt-4 rounded-2xl border border-border bg-background p-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </div>
              {booking.notes}
            </div>
          )}

          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div>Booked {formatDateTime(booking.created_at)}</div>
            {booking.delivered_at && <div>Delivered {formatDateTime(booking.delivered_at)}</div>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {booking.status === "Pending" && (
          <Button
            className="h-14 bg-success text-success-foreground hover:bg-success/90"
            onClick={() => deliverMut.mutate()}
            disabled={deliverMut.isPending}
          >
            {deliverMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-5 w-5" />
            )}
            Mark as Delivered
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-12 border-destructive/30 text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove booking {booking.booking_number} for{" "}
                  {booking.customer_name}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMut.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "destructive" | "success";
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "mt-0.5 text-sm font-bold " +
          (accent === "destructive"
            ? "text-destructive"
            : accent === "success"
              ? "text-success"
              : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

function EditView({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(booking.customer_name);
  const [mobile, setMobile] = useState(booking.mobile_number);
  const [total, setTotal] = useState(String(booking.total_amount));
  const [advance, setAdvance] = useState(String(booking.advance_amount));
  const [notes, setNotes] = useState(booking.notes ?? "");

  const mut = useMutation({
    mutationFn: async () => {
      const totalN = Number(total);
      const advN = Number(advance);
      if (!name.trim() || !mobile.trim()) throw new Error("Name and mobile are required");
      if (advN > totalN) throw new Error("Advance cannot exceed total");
      const { error } = await supabase
        .from("bookings")
        .update({
          customer_name: name.trim(),
          mobile_number: mobile.trim(),
          total_amount: totalN,
          advance_amount: advN,
          notes: notes.trim() || null,
        })
        .eq("id", booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <AppShell
      title={`Edit ${booking.booking_number}`}
      right={
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cancel">
          <X className="h-5 w-5" />
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="space-y-4 rounded-2xl border border-border bg-card p-4"
      >
        <div className="space-y-2">
          <Label>Customer Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-2">
          <Label>Mobile</Label>
          <Input value={mobile} onChange={(e) => setMobile(e.target.value)} className="h-12" inputMode="tel" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Total (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Advance (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
              className="h-12"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} />
        </div>
        <Button type="submit" className="h-12 w-full" disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </AppShell>
  );
}
