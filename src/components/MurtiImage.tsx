import { useEffect, useState } from "react";
import { getSignedPhotoUrl } from "@/lib/bookings";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  path: string | null | undefined;
  alt: string;
  className?: string;
}

export function MurtiImage({ path, alt, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancel = false;
    setUrl(null);
    setErr(false);
    if (!path) return;
    getSignedPhotoUrl(path)
      .then((u) => !cancel && setUrl(u))
      .catch(() => !cancel && setErr(true));
    return () => {
      cancel = true;
    };
  }, [path]);

  if (!path || err) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="h-6 w-6 opacity-50" />
      </div>
    );
  }

  if (!url) {
    return <div className={cn("animate-pulse bg-muted", className)} />;
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
    />
  );
}
