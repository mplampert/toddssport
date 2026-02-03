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
import { Loader2, FileText, ArrowLeft, Upload, X, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminFlyerNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    clientName: "",
    productName: "",
    subtitle: "",
    bulletPoint1: "",
    bulletPoint2: "",
    bulletPoint3: "",
    bulletPoint4: "",
    bulletPoint5: "",
    priceLine: "",
    fundraisingLine: "",
    imageUrl: "",
    notesCta: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setIsUploading(true);

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

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('flyer-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('flyer-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, imageUrl: urlData.publicUrl }));

      toast({
        title: "Image uploaded",
        description: "Product image uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productName.trim()) {
      toast({
        title: "Product name required",
        description: "Please enter a product name for the flyer.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const bulletPoints = [
        formData.bulletPoint1,
        formData.bulletPoint2,
        formData.bulletPoint3,
        formData.bulletPoint4,
        formData.bulletPoint5,
      ].filter(bp => bp.trim());

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
          clientName: formData.clientName || undefined,
          productName: formData.productName,
          subtitle: formData.subtitle || undefined,
          bulletPoints: bulletPoints.length > 0 ? bulletPoints : undefined,
          priceLine: formData.priceLine || undefined,
          fundraisingLine: formData.fundraisingLine || undefined,
          imageUrl: formData.imageUrl || undefined,
          notesCta: formData.notesCta || undefined,
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
              Enter product details to generate a PDF flyer
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Product Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Information</CardTitle>
                <CardDescription>Basic details about the product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client / Team Name</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    placeholder="e.g., Lincoln High School Baseball"
                    value={formData.clientName}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name *</Label>
                  <Input
                    id="productName"
                    name="productName"
                    placeholder="e.g., Custom Baseball Jersey"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    name="subtitle"
                    placeholder="e.g., Fully sublimated, moisture-wicking fabric"
                    value={formData.subtitle}
                    onChange={handleChange}
                  />
                </div>

                {/* Product Image Upload */}
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="flex items-start gap-4">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={formData.imageUrl} 
                          alt="Product preview" 
                          className="w-24 h-24 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-md border border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/50">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="productImage"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Image
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Or paste a URL below
                      </p>
                      <Input
                        id="imageUrl"
                        name="imageUrl"
                        type="url"
                        placeholder="https://example.com/product-image.jpg"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bullet Points */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Benefits</CardTitle>
                <CardDescription>Up to 5 bullet points highlighting features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="space-y-1">
                    <Label htmlFor={`bulletPoint${num}`}>Bullet Point {num}</Label>
                    <Input
                      id={`bulletPoint${num}`}
                      name={`bulletPoint${num}`}
                      placeholder={`e.g., ${num === 1 ? 'Free design assistance' : num === 2 ? 'No minimum order' : 'Feature ' + num}`}
                      value={formData[`bulletPoint${num}` as keyof typeof formData]}
                      onChange={handleChange}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pricing & CTA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing & Offers</CardTitle>
                <CardDescription>Price details and special offers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="priceLine">Price Line</Label>
                  <Input
                    id="priceLine"
                    name="priceLine"
                    placeholder="e.g., Starting at $24.99 per jersey"
                    value={formData.priceLine}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundraisingLine">Fundraising Highlight</Label>
                  <Input
                    id="fundraisingLine"
                    name="fundraisingLine"
                    placeholder="e.g., Earn up to 15% back for your team!"
                    value={formData.fundraisingLine}
                    onChange={handleChange}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notes/CTA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Call to Action</CardTitle>
                <CardDescription>Bottom CTA or additional notes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notesCta">CTA / Notes</Label>
                  <Textarea
                    id="notesCta"
                    name="notesCta"
                    placeholder="e.g., Contact your Todd's rep today to get started! Orders placed by March 15th ship in 2 weeks."
                    value={formData.notesCta}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/flyers">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isGenerating || isUploading}>
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
      </div>
    </AdminLayout>
  );
}
