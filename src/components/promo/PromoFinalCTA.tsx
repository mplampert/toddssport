import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const interestOptions = [
  { value: "branded-merchandise", label: "Branded merchandise" },
  { value: "gifting", label: "Gifting" },
  { value: "event-kits", label: "Event kits" },
  { value: "not-sure", label: "Not sure" },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  organization: z.string().trim().min(1, "Organization is required").max(200),
  interest: z.string().min(1, "Please select an interest"),
  quantityTimeline: z.string().trim().max(1000).optional(),
});

export function PromoFinalCTA() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    interest: "",
    quantityTimeline: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = formSchema.parse(formData);

      const { error } = await supabase.from("promo_leads").insert({
        name: validated.name,
        email: validated.email,
        company_name: validated.organization,
        interested_in_branded_merch: validated.interest === "branded-merchandise",
        interested_in_employee_gifts: validated.interest === "gifting",
        interested_in_event_kits: validated.interest === "event-kits",
        interested_in_other: validated.interest === "not-sure",
        quantity_and_budget: validated.quantityTimeline || null,
      });

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "We'll get back to you with ideas and pricing shortly.",
      });

      setFormData({
        name: "",
        email: "",
        organization: "",
        interest: "",
        quantityTimeline: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error submitting form:", error);
        toast({
          title: "Submission Error",
          description: "There was an error submitting your request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="promo-form" className="section-padding bg-[hsl(var(--charcoal))] text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tell Us About Your Promotional Project.
          </h2>
          <p className="text-white/80">
            Share a few details about your audience, timeline, and budget. We'll send back kit ideas, product recommendations, and pricing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="form-label text-white/90">
                Name *
              </label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="form-label text-white/90">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="organization" className="form-label text-white/90">
              Organization *
            </label>
            <Input
              id="organization"
              type="text"
              required
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent"
              placeholder="Your organization"
            />
          </div>

          <div>
            <label htmlFor="interest" className="form-label text-white/90">
              What are you interested in? *
            </label>
            <Select
              value={formData.interest}
              onValueChange={(value) => setFormData({ ...formData, interest: value })}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-accent">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {interestOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="quantityTimeline" className="form-label text-white/90">
              Approx. quantity and timeline
            </label>
            <Textarea
              id="quantityTimeline"
              value={formData.quantityTimeline}
              onChange={(e) => setFormData({ ...formData, quantityTimeline: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent min-h-[100px]"
              placeholder="e.g., 200 pieces, need by April 15th..."
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full btn-cta"
          >
            {isSubmitting ? "Submitting..." : "Get ideas & pricing"}
          </Button>
        </form>
      </div>
    </section>
  );
}
