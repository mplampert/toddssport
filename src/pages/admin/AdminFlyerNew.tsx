import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, ArrowLeft, Upload, X, ImageIcon, Plus, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { FlyerPreview } from "@/components/admin/flyers/FlyerPreview";

interface ProductForFlyer {
  imageUrl: string;
  title: string;
  description: string;
  priceLine: string;
}

const emptyProduct: ProductForFlyer = {
  imageUrl: "",
  title: "",
  description: "",
  priceLine: "",
};

export default function AdminFlyerNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [flyerName, setFlyerName] = useState("");
  const [clientName, setClientName] = useState("");
  const [notesCta, setNotesCta] = useState("");
  const [products, setProducts] = useState<ProductForFlyer[]>([{ ...emptyProduct }]);

  const handleProductChange = (index: number, field: keyof ProductForFlyer, value: string) => {
    setProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addProduct = () => {
    if (products.length < 6) {
      setProducts(prev => [...prev, { ...emptyProduct }]);
    }
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingIndex(index);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please log in to upload images.",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('flyer-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('flyer-images')
        .getPublicUrl(fileName);

      handleProductChange(index, 'imageUrl', urlData.publicUrl);

      toast({
        title: "Image uploaded",
        description: "Product image uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleFileInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(index, file);
    }
    // Reset input
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validProducts = products.filter(p => p.title.trim());
    if (validProducts.length === 0) {
      toast({
        title: "At least one product required",
        description: "Please add at least one product with a title.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please log in to generate flyers.",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('generate-flyer', {
        body: {
          flyerName: flyerName || `Flyer - ${validProducts.length} products`,
          clientName: clientName || undefined,
          products: validProducts,
          notesCta: notesCta || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate flyer');
      }

      toast({
        title: "Flyer generated!",
        description: "Your sales flyer has been created successfully.",
      });

      navigate('/admin/flyers');
    } catch (error: any) {
      console.error('Error generating flyer:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate flyer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/flyers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Sales Flyer</h1>
            <p className="text-muted-foreground mt-1">
              Add up to 6 products to generate a multi-product flyer
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Flyer Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Flyer Details</CardTitle>
              <CardDescription>General information for this flyer</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flyerName">Flyer Name</Label>
                <Input
                  id="flyerName"
                  placeholder="e.g., Spring 2024 Baseball Collection"
                  value={flyerName}
                  onChange={(e) => setFlyerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client / Team Name</Label>
                <Input
                  id="clientName"
                  placeholder="e.g., Lincoln High School"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notesCta">Footer CTA / Notes</Label>
                <Textarea
                  id="notesCta"
                  placeholder="e.g., Contact your Todd's rep today! Orders by March 15th ship in 2 weeks."
                  value={notesCta}
                  onChange={(e) => setNotesCta(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Products ({products.length}/6)</h2>
                <p className="text-sm text-muted-foreground">Add 2, 4, or 6 products for best layout</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addProduct}
                disabled={products.length >= 6}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {products.map((product, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Product {index + 1}</CardTitle>
                      {products.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeProduct(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label>Product Image</Label>
                      <div className="flex items-start gap-3">
                        {product.imageUrl ? (
                          <div className="relative shrink-0">
                            <img 
                              src={product.imageUrl} 
                              alt="Product preview" 
                              className="w-16 h-16 object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-1 -right-1 h-5 w-5"
                              onClick={() => handleProductChange(index, 'imageUrl', '')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 shrink-0 rounded-md border border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/50">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <input
                            ref={el => fileInputRefs.current[index] = el}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileInputChange(index, e)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRefs.current[index]?.click()}
                            disabled={uploadingIndex === index}
                            className="w-full"
                          >
                            {uploadingIndex === index ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-3 w-3" />
                                Upload
                              </>
                            )}
                          </Button>
                          <Input
                            type="url"
                            placeholder="Or paste image URL"
                            value={product.imageUrl}
                            onChange={(e) => handleProductChange(index, 'imageUrl', e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <Label htmlFor={`title-${index}`}>Title *</Label>
                      <Input
                        id={`title-${index}`}
                        placeholder="e.g., Custom Baseball Jersey"
                        value={product.title}
                        onChange={(e) => handleProductChange(index, 'title', e.target.value)}
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <Textarea
                        id={`description-${index}`}
                        placeholder="e.g., Full sublimation, moisture-wicking fabric"
                        value={product.description}
                        onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    {/* Price Line */}
                    <div className="space-y-1">
                      <Label htmlFor={`price-${index}`}>Price Line</Label>
                      <Input
                        id={`price-${index}`}
                        placeholder="e.g., Starting at $24.99"
                        value={product.priceLine}
                        onChange={(e) => handleProductChange(index, 'priceLine', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/flyers">Cancel</Link>
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowPreview(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button type="submit" disabled={isGenerating || uploadingIndex !== null}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Flyer
                </>
              )}
            </Button>
          </div>
        </form>
        
        <FlyerPreview
          open={showPreview}
          onOpenChange={setShowPreview}
          clientName={clientName}
          notesCta={notesCta}
          products={products}
        />
      </div>
    </AdminLayout>
  );
}
