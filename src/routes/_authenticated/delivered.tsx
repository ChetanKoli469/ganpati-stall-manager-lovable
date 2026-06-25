import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/lib/bookings";
import { AppShell } from "@/components/AppShell";
import { BookingCard } from "@/components/BookingCard";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/delivered")({
  ssr: false,
  component: DeliveredPage,
});

function DeliveredPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["delivered"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "Delivered")
        .order("delivered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const filtered = (data ?? []).filter((b) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (
      b.customer_name.toLowerCase().includes(t) ||
      b.mobile_number.toLowerCase().includes(t) ||
      b.booking_number.toLowerCase().includes(t)
    );
  });

  return (
    <AppShell title="Delivered">
      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter delivered"
          className="h-11 pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No delivered bookings yet
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </AppShell>
  );
}
