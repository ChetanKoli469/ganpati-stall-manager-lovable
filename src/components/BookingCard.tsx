import { Link } from "@tanstack/react-router";
import { MurtiImage } from "./MurtiImage";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { Booking } from "@/lib/bookings";
import { Phone } from "lucide-react";

export function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Link
      to="/bookings/$id"
      params={{ id: booking.id }}
      className="flex items-stretch gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm transition-colors hover:bg-accent/10"
    >
      <MurtiImage
        path={booking.murti_photo_url}
        alt={booking.customer_name}
        className="h-20 w-20 shrink-0 rounded-xl"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1 pr-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-foreground">
              {booking.customer_name}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="truncate">{booking.mobile_number}</span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              booking.status === "Delivered"
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/15 text-warning-foreground"
            }
          >
            {booking.status}
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-2 text-xs">
          <span className="font-mono font-semibold text-primary">
            {booking.booking_number}
          </span>
          <span className="truncate text-muted-foreground">
            {formatDateTime(booking.status === "Delivered" ? booking.delivered_at : booking.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
