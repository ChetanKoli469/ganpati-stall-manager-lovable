import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Home, Plus, Search, Clock, CheckCheck, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: typeof Home; primary?: boolean };
const navItems: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/bookings/new", label: "Add", icon: Plus, primary: true },
  { to: "/pending", label: "Pending", icon: Clock },
  { to: "/delivered", label: "Done", icon: CheckCheck },
];

export function AppShell({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            ॐ
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight text-foreground">
              {title}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Ganpati Stall Manager
            </p>
          </div>
          {right}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as "/dashboard"}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                  item.primary &&
                    "relative -mt-5 mx-1 max-w-[68px] bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90",
                  !item.primary &&
                    (active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"),
                )}
              >
                <Icon className={cn(item.primary ? "h-6 w-6" : "h-5 w-5")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
