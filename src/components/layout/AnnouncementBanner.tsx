import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-accent text-accent-foreground text-sm py-2 px-4 relative">
      <div className="container mx-auto text-center pr-8">
        <span>🏈 Spring season is here — Launch your team store today and be ready for tryouts. </span>
        <Link to="/request-a-store" className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity">
          Request a Store →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent-foreground/20 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
