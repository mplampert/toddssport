import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReportAction {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  actions: ReportAction[];
}

export function StoreDashboardReportCard({ icon: Icon, title, description, actions }: Props) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-12">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={action.onClick ?? (() => toast.info(`${title} → ${action.label} coming soon`))}
            >
              <action.icon className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
