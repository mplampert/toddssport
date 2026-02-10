import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useGlobalOrders } from "@/hooks/useGlobalOrders";
import { useGlobalBatches } from "@/hooks/useFulfillmentBatches";

const UUID_REGEX = /^[0-9a-f]{8}/i;

export function AdminGlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: orders = [] } = useGlobalOrders();
  const { data: batches = [] } = useGlobalBatches();

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.trim().toLowerCase();

  // Match orders
  const matchedOrders = q.length >= 2
    ? orders.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.id.toLowerCase().startsWith(q)
      ).slice(0, 5)
    : [];

  // Match batches
  const matchedBatches = q.length >= 2
    ? batches.filter((b) => b.id.toLowerCase().startsWith(q)).slice(0, 3)
    : [];

  // Match customers (unique by name)
  const matchedCustomers = q.length >= 2
    ? (() => {
        const seen = new Set<string>();
        return orders.filter((o) => {
          const name = o.customer_name?.toLowerCase() ?? "";
          if (!name.includes(q) || seen.has(name)) return false;
          seen.add(name);
          return true;
        }).slice(0, 5);
      })()
    : [];

  const hasResults = matchedOrders.length > 0 || matchedBatches.length > 0 || matchedCustomers.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && q) {
      // If looks like UUID prefix, try batch first then order search
      if (UUID_REGEX.test(q)) {
        const batch = batches.find((b) => b.id.toLowerCase().startsWith(q));
        if (batch) {
          navigate(`/admin/fulfillment/batches?search=${encodeURIComponent(q)}`);
          setQuery("");
          setOpen(false);
          return;
        }
      }
      navigate(`/admin/orders?search=${encodeURIComponent(q)}`);
      setQuery("");
      setOpen(false);
    }
  };

  const go = (path: string) => {
    navigate(path);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search orders, batches, or customers…"
          className="pl-8 w-72 h-8 text-sm"
        />
      </div>
      {open && q.length >= 2 && (
        <div className="absolute top-9 left-0 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
          {!hasResults && (
            <p className="text-sm text-muted-foreground px-3 py-4 text-center">No results. Press Enter to search all orders.</p>
          )}

          {matchedOrders.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-3 pt-2 pb-1">Orders</p>
              {matchedOrders.map((o) => (
                <button
                  key={o.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-sm flex justify-between items-center"
                  onClick={() => go(`/admin/team-stores/${o.store_id}/orders/${o.id}`)}
                >
                  <span className="font-mono text-xs">{o.order_number}</span>
                  <span className="text-xs text-muted-foreground">{o.customer_name}</span>
                </button>
              ))}
            </div>
          )}

          {matchedBatches.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-3 pt-2 pb-1">Batches</p>
              {matchedBatches.map((b) => (
                <button
                  key={b.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-sm flex justify-between items-center"
                  onClick={() => go(`/admin/team-stores/${b.team_store_id}/fulfillment/batch/${b.id}`)}
                >
                  <span className="font-mono text-xs">{b.id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">{b.store_name}</span>
                </button>
              ))}
            </div>
          )}

          {matchedCustomers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-3 pt-2 pb-1">Customers</p>
              {matchedCustomers.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-sm"
                  onClick={() => go(`/admin/orders?search=${encodeURIComponent(c.customer_name ?? "")}`)}
                >
                  <span className="text-sm">{c.customer_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{c.customer_email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
