import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company_name: z.string().min(2, "Company name is required"),
  interested_in_branded_merch: z.boolean().default(false),
  interested_in_employee_gifts: z.boolean().default(false),
  interested_in_event_kits: z.boolean().default(false),
  interested_in_company_store: z.boolean().default(false),
  interested_in_other: z.boolean().default(false),
  quantity_and_budget: z.string().optional(),
  target_date: z.string().optional(),
  project_details: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function PromoLeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company_name: "",
      interested_in_branded_merch: false,
      interested_in_employee_gifts: false,
      interested_in_event_kits: false,
      interested_in_company_store: false,
      interested_in_other: false,
      quantity_and_budget: "",
      target_date: "",
      project_details: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("promo_leads").insert([
        {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          company_name: data.company_name,
          interested_in_branded_merch: data.interested_in_branded_merch,
          interested_in_employee_gifts: data.interested_in_employee_gifts,
          interested_in_event_kits: data.interested_in_event_kits,
          interested_in_company_store: data.interested_in_company_store,
          interested_in_other: data.interested_in_other,
          quantity_and_budget: data.quantity_and_budget || null,
          target_date: data.target_date || null,
          project_details: data.project_details || null,
        },
      ]);

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Request submitted!",
        description: "We'll send you promo ideas within 1 business day.",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section id="promo-form" className="py-20 bg-navy">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-navy" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Thank You!
            </h2>
            <p className="text-lg text-white/80">
              We've received your promo request. A member of our team will reach out within 1 business day with curated ideas for your project.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="promo-form" className="py-20 bg-navy">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Let's Build Your Next Promo Drop
            </h2>
            <p className="text-lg text-white/80">
              Share your audience, budget, and timeline, and we'll send curated promotional product ideas tailored to your brand.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
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
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / Organization *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Interest Checkboxes */}
                <div>
                  <FormLabel className="mb-3 block">What are you interested in?</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="interested_in_branded_merch"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Branded Merch
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interested_in_employee_gifts"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Employee Gifts
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interested_in_event_kits"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Event Kits
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interested_in_company_store"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Company Store
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interested_in_other"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Other
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="quantity_and_budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approximate Quantity & Budget</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 100 items, $2,000 budget" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="target_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When do you need items in hand?</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="e.g., March 15, 2026" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="project_details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tell us about your event or program</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share details about your audience, occasion, or any specific products you're interested in..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full btn-cta"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Get Promo Ideas"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
