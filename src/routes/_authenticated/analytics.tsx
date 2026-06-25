import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/lib/bookings";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate, formatDateTime } from "@/lib/format";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analytics")({
  ssr: false,
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["all-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const rows = data ?? [];
  const total = rows.length;
  const delivered = rows.filter((r) => r.status === "Delivered").length;
  const pending = total - delivered;
  const advance = rows.reduce((s, r) => s + Number(r.advance_amount), 0);
  const pendingAmt = rows
    .filter((r) => r.status === "Pending")
    .reduce((s, r) => s + Number(r.pending_amount), 0);

  // Daily counts last 14 days
  const days: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      count: rows.filter((r) => r.created_at.slice(0, 10) === key).length,
    });
  }

  function exportData(fmt: "xlsx" | "csv") {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const sheet = rows.map((r) => ({
      "Booking #": r.booking_number,
      "Customer Name": r.customer_name,
      "Mobile Number": r.mobile_number,
      "Total Amount": Number(r.total_amount),
      "Advance Amount": Number(r.advance_amount),
      "Pending Amount": Number(r.pending_amount),
      Status: r.status,
      "Booking Date": formatDateTime(r.created_at),
      "Delivery Date": r.delivered_at ? formatDateTime(r.delivered_at) : "",
      Notes: r.notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(sheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    const stamp = formatDate(new Date()).replace(/\s/g, "_");
    if (fmt === "xlsx") {
      XLSX.writeFile(wb, `ganpati_bookings_${stamp}.xlsx`);
    } else {
      XLSX.writeFile(wb, `ganpati_bookings_${stamp}.csv`, { bookType: "csv" });
    }
    toast.success(`Exported ${rows.length} bookings`);
  }

  return (
    <AppShell title="Analytics">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total" value={total} />
        <Stat label="Delivered" value={delivered} tone="success" />
        <Stat label="Pending" value={pending} tone="warning" />
        <Stat label="Advance Collected" value={formatINR(advance)} />
        <Stat label="Pending Payment" value={formatINR(pendingAmt)} tone="destructive" />
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Bookings (last 14 days)</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Export Data</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => exportData("xlsx")}
            disabled={isLoading}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={() => exportData("csv")}
            disabled={isLoading}
          >
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "destructive";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning-foreground"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}
