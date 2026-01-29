import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Users } from "lucide-react";

const organizationTypes = [
  { value: "youth-league", label: "Youth League" },
  { value: "high-school", label: "High School" },
  { value: "college", label: "College" },
  { value: "club", label: "Club/Organization" },
  { value: "business", label: "Business" },
  { value: "event", label: "Event/Camp" },
];

export function FindYourRep() {
  const [location, setLocation] = useState("");
  const [orgType, setOrgType] = useState("");

  const scrollToQuote = () => {
    const quoteSection = document.getElementById("quote-form");
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="find-rep" className="py-14 md:py-20 bg-navy">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
            Find Your Todd's Rep
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Wherever you are, a Todd's Sporting Goods rep is ready to help your program gear up. 
            Get personalized service and expert guidance for your team's needs.
          </p>

          {/* Mini Form */}
          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-primary-foreground/20 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/60" />
                <Input
                  placeholder="Your City or Zip Code"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 h-12"
                />
              </div>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/60 z-10" />
                <Select value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger className="pl-10 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground h-12">
                    <SelectValue placeholder="Organization Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {organizationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={scrollToQuote}
              className="w-full md:w-auto btn-cta px-10 py-6 text-lg font-bold"
            >
              Contact Our Team
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
