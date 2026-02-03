import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, ArrowLeft, Upload, X, ImageIcon, Plus, Trash2, Eye, Save, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { FlyerPreview } from "@/components/admin/flyers/FlyerPreview";
import { FlyerEmailTemplate } from "@/components/admin/flyers/FlyerEmailTemplate";

interface ProductForFlyer {
  imageUrl: string;
  title: string;
  description: string;
  priceLine: string;
}

interface Rep {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

const emptyProduct: ProductForFlyer = {
  imageUrl: "",
  title: "",
  description: "",
  priceLine: "",
};

export default function AdminFlyerNew() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [flyerName, setFlyerName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContactName, setClientContactName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientState, setClientState] = useState("");
  const [clientZip, setClientZip] = useState("");
  const [notesCta, setNotesCta] = useState("");
  const [products, setProducts] = useState<ProductForFlyer[]>([{ ...emptyProduct }]);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [reps, setReps] = useState<Rep[]>([]);
  const [repsLoading, setRepsLoading] = useState(true);

  // Load reps on mount
  useEffect(() => {
    loadReps();
  }, []);

  const loadReps = async () => {
    try {
      const { data, error } = await supabase
        .from('reps')
        .select('id, name, email, phone')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setReps(data || []);
    } catch (error) {
      console.error('Error loading reps:', error);
    } finally {
      setRepsLoading(false);
    }
  };

  const selectedRep = reps.find(r => r.id === selectedRepId);

  // Load flyer data when editing
  useEffect(() => {
    if (isEditMode && id) {
      loadFlyer(id);
    }
  }, [id, isEditMode]);

  const loadFlyer = async (flyerId: string) => {
    try {
      const { data, error } = await supabase
        .from('flyers')
        .select('*')
        .eq('id', flyerId)
        .single();

      if (error) throw error;

      if (data) {
        setFlyerName(data.product_name || '');
        setClientName(data.client_name || '');
        setNotesCta(data.notes_cta || '');
        setPdfUrl(data.pdf_url || null);
        // Type assertion needed since types.ts doesn't have new columns yet
        const flyerData = data as typeof data & { 
          rep_id?: string;
          client_contact_name?: string;
          client_email?: string;
          client_phone?: string;
          client_address?: string;
          client_city?: string;
          client_state?: string;
          client_zip?: string;
        };
        setSelectedRepId(flyerData.rep_id || '');
        setClientContactName(flyerData.client_contact_name || '');
        setClientEmail(flyerData.client_email || '');
        setClientPhone(flyerData.client_phone || '');
        setClientAddress(flyerData.client_address || '');
        setClientCity(flyerData.client_city || '');
        setClientState(flyerData.client_state || '');
        setClientZip(flyerData.client_zip || '');
        // Parse products from JSONB
        const loadedProducts = data.products as unknown as ProductForFlyer[] | null;
        if (loadedProducts && Array.isArray(loadedProducts) && loadedProducts.length > 0) {
          setProducts(loadedProducts.map(p => ({
            imageUrl: p.imageUrl || '',
            title: p.title || '',
            description: p.description || '',
            priceLine: p.priceLine || '',
          })));
        }
      }
    } catch (error: any) {
      console.error('Error loading flyer:', error);
      toast({
        title: "Error loading flyer",
        description: error.message,
        variant: "destructive",
      });
      navigate('/admin/flyers');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSave = async () => {
    const validProducts = products.filter(p => p.title.trim());
    if (validProducts.length === 0) {
      toast({
        title: "At least one product required",
        description: "Please add at least one product with a title.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please log in to save flyers.",
          variant: "destructive",
        });
        return;
      }

      const flyerData = {
        product_name: flyerName || `Flyer - ${validProducts.length} products`,
        client_name: clientName || null,
        client_contact_name: clientContactName || null,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        client_address: clientAddress || null,
        client_city: clientCity || null,
        client_state: clientState || null,
        client_zip: clientZip || null,
        products: validProducts as unknown as null,  // Cast for Supabase JSONB
        notes_cta: notesCta || null,
        rep_id: selectedRepId || null,
      };

      if (isEditMode && id) {
        const { error } = await supabase
          .from('flyers')
          .update({
            ...flyerData,
            products: validProducts as unknown as null,
          })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Flyer saved!",
          description: "Your changes have been saved.",
        });
      } else {
        const { error } = await supabase
          .from('flyers')
          .insert({
            product_name: flyerData.product_name,
            client_name: flyerData.client_name,
            notes_cta: flyerData.notes_cta,
            products: validProducts as unknown as null,
          });

        if (error) throw error;

        toast({
          title: "Flyer saved!",
          description: "Your flyer has been saved as a draft.",
        });
        
        navigate('/admin/flyers');
      }
    } catch (error: any) {
      console.error('Error saving flyer:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save flyer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdf = async (e: React.FormEvent) => {
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
          flyerId: isEditMode ? id : undefined,
          flyerName: flyerName || `Flyer - ${validProducts.length} products`,
          clientName: clientName || undefined,
          clientContactName: clientContactName || undefined,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          clientAddress: clientAddress || undefined,
          clientCity: clientCity || undefined,
          clientState: clientState || undefined,
          clientZip: clientZip || undefined,
          products: validProducts,
          notesCta: notesCta || undefined,
          repId: selectedRepId || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate flyer');
      }

      toast({
        title: "Flyer generated!",
        description: "Your sales flyer PDF has been created successfully.",
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
            <h1 className="text-3xl font-bold text-foreground">
              {isEditMode ? 'Edit Sales Flyer' : 'Create Sales Flyer'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditMode 
                ? 'Update your flyer and regenerate the PDF'
                : 'Add up to 6 products to generate a multi-product flyer'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <form onSubmit={handleGeneratePdf}>
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
              <div className="space-y-2">
                <Label htmlFor="clientContactName">Contact Person</Label>
                <Input
                  id="clientContactName"
                  placeholder="e.g., John Smith"
                  value={clientContactName}
                  onChange={(e) => setClientContactName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="e.g., coach@school.edu"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Client Phone</Label>
                <Input
                  id="clientPhone"
                  placeholder="e.g., (555) 123-4567"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientAddress">Street Address</Label>
                <Input
                  id="clientAddress"
                  placeholder="e.g., 123 Main Street"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientCity">City</Label>
                <Input
                  id="clientCity"
                  placeholder="e.g., Boston"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="clientState">State</Label>
                  <Input
                    id="clientState"
                    placeholder="e.g., MA"
                    value={clientState}
                    onChange={(e) => setClientState(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientZip">ZIP Code</Label>
                  <Input
                    id="clientZip"
                    placeholder="e.g., 02101"
                    value={clientZip}
                    onChange={(e) => setClientZip(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesRep">Sales Rep</Label>
                <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                  <SelectTrigger id="salesRep">
                    <SelectValue placeholder="Select a sales rep (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {reps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
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
            {isEditMode && (
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowEmailTemplate(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Copy Email
              </Button>
            )}
            {isEditMode && (
              <Button 
                type="button" 
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || uploadingIndex !== null}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
            <Button type="submit" disabled={isGenerating || uploadingIndex !== null}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Regenerate PDF' : 'Generate Flyer'}
                </>
              )}
            </Button>
          </div>
        </form>
        )}
        
        <FlyerPreview
          open={showPreview}
          onOpenChange={setShowPreview}
          clientName={clientName}
          clientInfo={{
            contactName: clientContactName,
            email: clientEmail,
            phone: clientPhone,
            address: clientAddress,
            city: clientCity,
            state: clientState,
            zip: clientZip,
          }}
          notesCta={notesCta}
          products={products}
          rep={selectedRep}
        />
        
        <FlyerEmailTemplate
          open={showEmailTemplate}
          onOpenChange={setShowEmailTemplate}
          clientName={clientName}
          clientInfo={{
            contactName: clientContactName,
            email: clientEmail,
            phone: clientPhone,
            address: clientAddress,
            city: clientCity,
            state: clientState,
            zip: clientZip,
          }}
          products={products}
          rep={selectedRep}
          pdfUrl={pdfUrl || undefined}
        />
      </div>
    </AdminLayout>
  );
}
