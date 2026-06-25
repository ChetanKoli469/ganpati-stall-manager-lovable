import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/lib/bookings";
import { AppShell } from "@/components/AppShell";
import { BookingCard } from "@/components/BookingCard";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/search")({
  ssr: false,
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const term = q.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["search", term],
    queryFn: async (): Promise<Booking[]> => {
      let query = supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(50);
      if (term) {
        const like = `%${term}%`;
        query = query.or(
          `customer_name.ilike.${like},mobile_number.ilike.${like},booking_number.ilike.${like}`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const empty = useMemo(() => !isFetching && data && data.length === 0, [isFetching, data]);

  return (
    <AppShell title="Search Bookings">
      <div className="sticky top-[68px] z-10 -mx-4 mb-3 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, mobile or booking #"
            className="h-12 pl-10 pr-10 text-base"
            autoFocus
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isFetching ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No bookings match "{term}"
        </div>
      ) : (
        <div className="space-y-2">
          {data?.map((b) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </AppShell>
  );
}
