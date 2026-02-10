import { useState, useMemo } from "react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV } from "@/hooks/useStoreReportData";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { ReportBackLink } from "@/components/admin/team-stores/ReportBackLink";

export default function ReportStoreTax() {
  const { store } = useTeamStoreContext();
  const { orders, isLoading } = useStoreReportData(store.id);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  const taxByJurisdiction = useMemo(() => {
    const map = new Map<string, { jurisdiction: string; taxable: number; tax: number }>();
    filtered.forEach((o) => {
      const jurisdiction = o.shipping_state || "Unknown";
      const c = map.get(jurisdiction) ?? { jurisdiction, taxable: 0, tax: 0 };
      c.taxable += Number(o.subtotal);
      c.tax += Number(o.tax_total);
      map.set(jurisdiction, c);
    });
    return Array.from(map.values()).sort((a, b) => b.tax - a.tax);
  }, [filtered]);

  const totalTax = taxByJurisdiction.reduce((s, t) => s + t.tax, 0);
  const totalTaxable = taxByJurisdiction.reduce((s, t) => s + t.taxable, 0);

  const exportCSVHandler = () => {
    downloadCSV(
      `${store.name}-sales-tax.csv`,
      ["Jurisdiction", "Taxable Sales", "Tax Collected"],
      taxByJurisdiction.map((t) => [t.jurisdiction, t.taxable.toFixed(2), t.tax.toFixed(2)])
    );
  };

  return (
    <div className="space-y-6">
      <ReportBackLink />
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Sales Tax Report</h3>
        <Button variant="outline" size="sm" onClick={exportCSVHandler} disabled={taxByJurisdiction.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : taxByJurisdiction.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No tax data.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead className="text-right">Taxable Sales</TableHead>
                    <TableHead className="text-right">Tax Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxByJurisdiction.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{t.jurisdiction}</TableCell>
                      <TableCell className="text-right text-sm">${t.taxable.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${t.tax.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold text-sm">Total</TableCell>
                    <TableCell className="text-right text-sm font-bold">${totalTaxable.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm font-bold">${totalTax.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
