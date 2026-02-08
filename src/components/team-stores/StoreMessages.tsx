import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Info, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

const VARIANT_STYLES: Record<string, { bg: string; icon: typeof Info }> = {
  info: { bg: "bg-blue-50 border-blue-200 text-blue-800", icon: Info },
  warning: { bg: "bg-yellow-50 border-yellow-200 text-yellow-800", icon: AlertTriangle },
  danger: { bg: "bg-red-50 border-red-200 text-red-800", icon: AlertCircle },
  success: { bg: "bg-green-50 border-green-200 text-green-800", icon: CheckCircle },
};

interface Props {
  storeId: string;
  location: "home" | "product" | "checkout";
}

export function StoreMessages({ storeId, location }: Props) {
  const { data: messages = [] } = useQuery({
    queryKey: ["store-messages-public", storeId, location],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_messages")
        .select("id, title, content, style_variant, location")
        .eq("team_store_id", storeId)
        .eq("is_active", true)
        .in("location", [location, "global"])
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  if (messages.length === 0) return null;

  return (
    <div className="space-y-2">
      {messages.map((msg) => {
        const variant = VARIANT_STYLES[msg.style_variant] || VARIANT_STYLES.info;
        const Icon = variant.icon;
        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${variant.bg}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              {msg.title && <p className="font-semibold">{msg.title}</p>}
              <div
                className="[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_a]:underline [&_a]:font-medium"
                dangerouslySetInnerHTML={{ __html: msg.content }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
