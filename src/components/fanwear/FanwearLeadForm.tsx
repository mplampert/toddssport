import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  organization: z.string().min(2, "Organization name is required"),
  role: z.string().min(1, "Please select your role"),
  sports_or_groups: z.string().optional(),
  approximate_size: z.string().optional(),
  launch_date: z.string().optional(),
  interested_in_fundraising: z.boolean().default(false),
  additional_info: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const roles = [
  "Coach",
  "Athletic Director",
  "Booster Club Member",
  "PTO/PTA",
  "School Administrator",
  "League Director",
  "Other",
];

export function FanwearLeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [interestedInFundraising, setInterestedInFundraising] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interested_in_fundraising: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("fanwear_leads")
        .insert([{
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          organization: data.organization,
          role: data.role,
          sports_or_groups: data.sports_or_groups || null,
          approximate_size: data.approximate_size || null,
          launch_date: data.launch_date || null,
          interested_in_fundraising: interestedInFundraising,
          additional_info: data.additional_info || null,
        }]);

      if (error) throw error;

      setIsSuccess(true);
      reset();
      toast({
        title: "Request Submitted!",
        description: "We'll be in touch within 1-2 business days with fanwear concepts.",
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

  if (isSuccess) {
    return (
      <section id="fanwear-form" className="py-16 md:py-24 bg-charcoal">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Thank You!
            </h2>
            <p className="text-white/80 text-lg mb-8">
              We've received your fanwear request. A Todd's representative will reach out within 1-2 business days with fanwear concepts and pricing information.
            </p>
            <Button 
              onClick={() => setIsSuccess(false)}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Submit Another Request
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="fanwear-form" className="py-16 md:py-24 bg-charcoal">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Ready to Launch Your Fanwear & Spirit Wear Line?
          </h2>
          <p className="text-center text-white/80 mb-10 max-w-2xl mx-auto">
            Tell us about your school, club, or organization and we'll send you fanwear concepts and a sample store layout.
          </p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-white">Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Your full name"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-white">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="you@example.com"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-white">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="(555) 123-4567"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {/* Organization */}
              <div>
                <Label htmlFor="organization" className="text-white">Organization / School / Club *</Label>
                <Input
                  id="organization"
                  {...register("organization")}
                  placeholder="Organization name"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                {errors.organization && (
                  <p className="text-red-400 text-sm mt-1">{errors.organization.message}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role" className="text-white">Your Role *</Label>
                <Select onValueChange={(value) => setValue("role", value)}>
                  <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>
                )}
              </div>

              {/* Approximate Size */}
              <div>
                <Label htmlFor="approximate_size" className="text-white">Approximate # of Students/Families</Label>
                <Input
                  id="approximate_size"
                  {...register("approximate_size")}
                  placeholder="e.g., 100, 500, 1000+"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {/* Launch Date */}
              <div className="md:col-span-2">
                <Label htmlFor="launch_date" className="text-white">When do you want to launch fanwear?</Label>
                <Input
                  id="launch_date"
                  {...register("launch_date")}
                  placeholder="e.g., Fall season, Spirit week in October"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            {/* Sports or Groups */}
            <div>
              <Label htmlFor="sports_or_groups" className="text-white">Sport(s) or Groups</Label>
              <Textarea
                id="sports_or_groups"
                {...register("sports_or_groups")}
                placeholder="List the sports or groups you need fanwear for..."
                rows={2}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* Fundraising Checkbox */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="interested_in_fundraising"
                checked={interestedInFundraising}
                onCheckedChange={(checked) => setInterestedInFundraising(checked as boolean)}
                className="border-white/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
              />
              <Label htmlFor="interested_in_fundraising" className="text-white cursor-pointer">
                I'm interested in fundraising with fanwear
              </Label>
            </div>

            {/* Additional Info */}
            <div>
              <Label htmlFor="additional_info" className="text-white">Anything else we should know?</Label>
              <Textarea
                id="additional_info"
                {...register("additional_info")}
                placeholder="Tell us about your needs, timeline, or any questions you have..."
                rows={4}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <div className="text-center pt-4">
              <Button 
                type="submit" 
                size="lg"
                disabled={isSubmitting}
                className="btn-cta text-lg px-10 py-6 font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Request Fanwear Concepts"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
