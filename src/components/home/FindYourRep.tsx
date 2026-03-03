import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Store } from "lucide-react";

export function FindYourRep() {
  return (
    <section id="find-rep" className="py-14 md:py-20 bg-navy">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
            Find Your Team Store
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Already part of a team or organization with a Todd's store? Search for your store to start shopping.
          </p>

          {/* CTA Box */}
          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-primary-foreground/20 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Store className="w-6 h-6 text-accent" />
              <span className="text-primary-foreground text-lg">
                Search by team name, school, or organization
              </span>
            </div>
            <Button 
              asChild
              className="w-full md:w-auto btn-cta px-10 py-6 text-lg font-bold"
            >
              <a href="https://tsgonline.chipply.com/" target="_blank" rel="noopener noreferrer">
                <Search className="w-5 h-5 mr-2" />
                Find My Store
              </a>
            </Button>
            <p className="mt-4 text-sm text-primary-foreground/60">
              <Link to="/request-a-store" className="hover:text-accent transition-colors underline underline-offset-2">
                Don't have a store yet? Request one for free →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
