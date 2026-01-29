import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { CheckCircle, Loader2, Upload } from "lucide-react";

const quoteSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  organization: z.string().min(2, "Organization name is required").max(200),
  organization_type: z.string().min(1, "Please select an organization type"),
  needs_uniforms: z.boolean().default(false),
  needs_spirit_wear: z.boolean().default(false),
  needs_corporate_apparel: z.boolean().default(false),
  needs_promotional_products: z.boolean().default(false),
  needs_other: z.boolean().default(false),
  estimated_quantity: z.string().optional(),
  deadline: z.string().optional(),
  extra_details: z.string().max(2000).optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

const organizationTypes = [
  { value: "youth-league", label: "Youth League" },
  { value: "school", label: "School" },
  { value: "club", label: "Club/Organization" },
  { value: "business", label: "Business" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

export function QuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      organization: "",
      organization_type: "",
      needs_uniforms: false,
      needs_spirit_wear: false,
      needs_corporate_apparel: false,
      needs_promotional_products: false,
      needs_other: false,
      estimated_quantity: "",
      deadline: "",
      extra_details: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setLogoFile(file);
    }
  };

  const onSubmit = async (data: QuoteFormValues) => {
    setIsSubmitting(true);
    
    try {
      let logoUrl = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("quote-logos")
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error("Logo upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("quote-logos")
            .getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        }
      }

      // Insert quote
      const { error } = await supabase.from("quotes").insert([{
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        organization: data.organization,
        organization_type: data.organization_type,
        needs_uniforms: data.needs_uniforms,
        needs_spirit_wear: data.needs_spirit_wear,
        needs_corporate_apparel: data.needs_corporate_apparel,
        needs_promotional_products: data.needs_promotional_products,
        needs_other: data.needs_other,
        estimated_quantity: data.estimated_quantity || null,
        deadline: data.deadline || null,
        extra_details: data.extra_details || null,
        logo_file_url: logoUrl,
      }]);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Quote request submitted successfully!");
    } catch (error) {
      console.error("Error submitting quote:", error);
      toast.error("Failed to submit quote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section id="quote-form" className="section-padding bg-secondary">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-primary mb-4">Thank You!</h2>
            <p className="text-lg text-muted-foreground mb-6">
              We've received your quote request. Our team will review your needs and get back to you within 1-2 business days.
            </p>
            <Button onClick={() => setIsSubmitted(false)} variant="outline">
              Submit Another Request
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="quote-form" className="section-padding bg-secondary">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="section-heading text-primary">Get a Custom Quote</h2>
          <p className="text-center text-muted-foreground mb-8 -mt-8">
            Tell us about your team or organization and we'll create a custom quote for you.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card p-8 rounded-xl border border-border shadow-lg">
              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name *</FormLabel>
                      <FormControl>
                        <Input {...field} className="form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} className="form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} className="form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization / Team Name *</FormLabel>
                      <FormControl>
                        <Input {...field} className="form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="organization_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="form-input">
                          <SelectValue placeholder="Select organization type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {organizationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* What do you need? */}
              <div>
                <FormLabel className="block mb-3">What do you need?</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="needs_uniforms"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">Uniforms</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="needs_spirit_wear"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">Spirit Wear</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="needs_corporate_apparel"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">Corporate Apparel</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="needs_promotional_products"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">Promo Products</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="needs_other"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">Other</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="estimated_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Quantity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 50 jerseys, 100 t-shirts" {...field} className="form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When do you need it?</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., By March 15th" {...field} className="form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Logo Upload */}
              <div>
                <FormLabel>Upload Your Logo (optional)</FormLabel>
                <label className="mt-2 flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {logoFile ? logoFile.name : "Click to upload (max 5MB)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.ai,.eps"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <FormField
                control={form.control}
                name="extra_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us more about your project, specific requirements, or any questions you have..."
                        rows={4}
                        {...field}
                        className="form-input resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-cta text-lg py-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Quote Request"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}
