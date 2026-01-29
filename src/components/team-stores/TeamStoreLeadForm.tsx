import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  sport: z.string().min(1, "Please select a sport"),
  level: z.string().min(1, "Please select a level"),
  number_of_teams: z.string().optional(),
  launch_date: z.string().optional(),
  additional_info: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const sports = [
  "Football",
  "Baseball",
  "Softball",
  "Basketball",
  "Soccer",
  "Volleyball",
  "Track & Field",
  "Swimming",
  "Wrestling",
  "Hockey",
  "Lacrosse",
  "Tennis",
  "Golf",
  "Cheerleading",
  "Dance",
  "Multi-Sport",
  "Other",
];

const levels = [
  "Youth (12 & Under)",
  "Middle School",
  "High School",
  "Club/Travel",
  "College",
  "Adult/Rec League",
  "Other",
];

export function TeamStoreLeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("team_store_leads")
        .insert([{
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          organization: data.organization,
          sport: data.sport,
          level: data.level,
          number_of_teams: data.number_of_teams || null,
          launch_date: data.launch_date || null,
          additional_info: data.additional_info || null,
        }]);

      if (error) throw error;

      setIsSuccess(true);
      reset();
      toast({
        title: "Request Submitted!",
        description: "We'll be in touch within 1-2 business days with a sample store layout.",
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
      <section id="team-store-form" className="py-16 md:py-24 bg-charcoal">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Thank You!
            </h2>
            <p className="text-white/80 text-lg mb-8">
              We've received your team store request. A Todd's representative will reach out within 1-2 business days with a sample store layout and pricing information.
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
    <section id="team-store-form" className="py-16 md:py-24 bg-charcoal">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Ready for Your Own Team Store?
          </h2>
          <p className="text-center text-white/80 mb-10 max-w-2xl mx-auto">
            Tell us about your team or league and we'll send you a sample layout and pricing.
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
                <Label htmlFor="organization" className="text-white">Organization / Team *</Label>
                <Input
                  id="organization"
                  {...register("organization")}
                  placeholder="Team or school name"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                {errors.organization && (
                  <p className="text-red-400 text-sm mt-1">{errors.organization.message}</p>
                )}
              </div>

              {/* Sport */}
              <div>
                <Label htmlFor="sport" className="text-white">Sport *</Label>
                <Select onValueChange={(value) => setValue("sport", value)}>
                  <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sport && (
                  <p className="text-red-400 text-sm mt-1">{errors.sport.message}</p>
                )}
              </div>

              {/* Level */}
              <div>
                <Label htmlFor="level" className="text-white">Level *</Label>
                <Select onValueChange={(value) => setValue("level", value)}>
                  <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.level && (
                  <p className="text-red-400 text-sm mt-1">{errors.level.message}</p>
                )}
              </div>

              {/* Number of Teams */}
              <div>
                <Label htmlFor="number_of_teams" className="text-white">Number of Teams</Label>
                <Input
                  id="number_of_teams"
                  {...register("number_of_teams")}
                  placeholder="e.g., 1, 5, 10+"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {/* Launch Date */}
              <div>
                <Label htmlFor="launch_date" className="text-white">When do you want to launch?</Label>
                <Input
                  id="launch_date"
                  {...register("launch_date")}
                  placeholder="e.g., Next month, Fall season"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
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
                  "Request My Team Store"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
