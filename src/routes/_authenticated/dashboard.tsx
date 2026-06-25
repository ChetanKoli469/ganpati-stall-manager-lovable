import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/lib/bookings";
import { AppShell } from "@/components/AppShell";
import { BookingCard } from "@/components/BookingCard";
import { formatINR } from "@/lib/format";
import { Plus, Search, Clock, CheckCheck, IndianRupee, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

interface Stats {
  total: number;
  pending: number;
  delivered: number;
  advance: number;
  pendingAmount: number;
  recent: Booking[];
}

async function fetchDashboard(): Promise<Stats> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Booking[];
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === "Pending").length,
    delivered: rows.filter((r) => r.status === "Delivered").length,
    advance: rows.reduce((s, r) => s + Number(r.advance_amount), 0),
    pendingAmount: rows
      .filter((r) => r.status === "Pending")
      .reduce((s, r) => s + Number(r.pending_amount), 0),
    recent: rows.slice(0, 6),
  };
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  return (
    <AppShell title="Dashboard">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Bookings"
          value={data?.total ?? 0}
          icon={<BookOpen className="h-4 w-4" />}
          loading={isLoading}
          accent="primary"
        />
        <StatCard
          label="Pending Pickups"
          value={data?.pending ?? 0}
          icon={<Clock className="h-4 w-4" />}
          loading={isLoading}
          accent="warning"
        />
        <StatCard
          label="Delivered"
          value={data?.delivered ?? 0}
          icon={<CheckCheck className="h-4 w-4" />}
          loading={isLoading}
          accent="success"
        />
        <StatCard
          label="Advance Collected"
          value={formatINR(data?.advance ?? 0)}
          icon={<IndianRupee className="h-4 w-4" />}
          loading={isLoading}
          accent="primary"
        />
        <StatCard
          label="Pending Payment"
          value={formatINR(data?.pendingAmount ?? 0)}
          icon={<IndianRupee className="h-4 w-4" />}
          loading={isLoading}
          accent="destructive"
        />
        <Link
          to="/analytics"
          className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/50 p-3 text-xs font-medium text-muted-foreground hover:bg-accent/10"
        >
          View analytics →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <QuickAction to="/bookings/new" icon={<Plus />} label="Add Booking" primary />
        <QuickAction to="/search" icon={<Search />} label="Search" />
        <QuickAction to="/pending" icon={<Clock />} label="Pending" />
        <QuickAction to="/delivered" icon={<CheckCheck />} label="Delivered" />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent Bookings</h2>
          <Link to="/pending" className="text-sm font-medium text-primary">
            See all
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : data && data.recent.length > 0 ? (
          <div className="space-y-2">
            {data.recent.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  loading,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  loading?: boolean;
  accent: "primary" | "warning" | "success" | "destructive";
}) {
  const tone = {
    primary: "from-primary/10 to-primary/5 text-primary",
    warning: "from-warning/20 to-warning/5 text-warning-foreground",
    success: "from-success/15 to-success/5 text-success",
    destructive: "from-destructive/15 to-destructive/5 text-destructive",
  }[accent];

  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${tone} p-3 shadow-sm`}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-foreground">
        {loading ? <Skeleton className="h-7 w-16" /> : value}
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
  primary,
}: {
  to: "/bookings/new" | "/search" | "/pending" | "/delivered";
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        primary
          ? "flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-md shadow-primary/20 active:scale-[0.98]"
          : "flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-foreground active:scale-[0.98]"
      }
    >
      <div
        className={
          primary
            ? "grid h-10 w-10 place-items-center rounded-xl bg-primary-foreground/20"
            : "grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-primary"
        }
      >
        {icon}
      </div>
      <span className="font-semibold">{label}</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/20 text-primary">
        <BookOpen className="h-7 w-7" />
      </div>
      <p className="mt-3 font-semibold text-foreground">No bookings yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your first murti booking to get started.
      </p>
      <Link
        to="/bookings/new"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Add Booking
      </Link>
    </div>
  );
}
