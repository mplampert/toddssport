import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, FileText, Loader2, Trash2, ExternalLink, Pencil } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProductForFlyer {
  imageUrl?: string;
  title: string;
  description?: string;
  priceLine?: string;
}

interface Flyer {
  id: string;
  client_name: string | null;
  product_name: string;
  products: ProductForFlyer[] | null;
  pdf_url: string | null;
  created_at: string;
}

export default function AdminFlyers() {
  const { toast } = useToast();
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFlyers = async () => {
    try {
      const { data, error } = await supabase
        .from('flyers')
        .select('id, client_name, product_name, products, pdf_url, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Type assertion since Supabase doesn't know about the JSONB structure
      setFlyers((data as unknown as Flyer[]) || []);
    } catch (error: any) {
      console.error('Error fetching flyers:', error);
      toast({
        title: "Error loading flyers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlyers();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('flyers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFlyers(prev => prev.filter(f => f.id !== id));
      toast({
        title: "Flyer deleted",
        description: "The flyer has been removed.",
      });
    } catch (error: any) {
      console.error('Error deleting flyer:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewPdf = (url: string | null) => {
    if (!url) {
      toast({
        title: "PDF not available",
        description: "This flyer doesn't have a PDF file. Please regenerate it.",
        variant: "destructive",
      });
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Flyers</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage product flyers for your sales team
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/flyers/new">
              <Plus className="mr-2 h-4 w-4" />
              New Flyer
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Flyers</CardTitle>
            <CardDescription>
              Click "View/Print" to open the flyer, then use your browser's print function to save as PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : flyers.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No flyers yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first sales flyer to get started.
                </p>
                <Button asChild>
                  <Link to="/admin/flyers/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Flyer
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Flyer Name</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flyers.map((flyer) => {
                    const productCount = flyer.products?.length || 0;
                    return (
                      <TableRow key={flyer.id}>
                        <TableCell className="text-muted-foreground">
                          {flyer.client_name || "—"}
                        </TableCell>
                        <TableCell className="font-medium">{flyer.product_name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                            {productCount} {productCount === 1 ? 'product' : 'products'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(flyer.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/admin/flyers/${flyer.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {flyer.pdf_url ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewPdf(flyer.pdf_url)}
                              >
                                <Download className="mr-1 h-3 w-3" />
                                View PDF
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                              >
                                <a href={flyer.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">No PDF</span>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete flyer?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the flyer for "{flyer.product_name}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(flyer.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingId === flyer.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
