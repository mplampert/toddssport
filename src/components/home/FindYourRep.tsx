import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

export function FindYourRep() {
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

          {/* CTA Box */}
          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-primary-foreground/20 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-accent" />
              <span className="text-primary-foreground text-lg">
                Search by school, city, zip code, or league
              </span>
            </div>
            <Button 
              asChild
              className="w-full md:w-auto btn-cta px-10 py-6 text-lg font-bold"
            >
              <Link to="/find-your-rep">
                <Search className="w-5 h-5 mr-2" />
                Find Your Rep Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
