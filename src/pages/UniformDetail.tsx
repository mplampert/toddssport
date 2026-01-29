import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSportBySlug, getAllSports } from "@/data/sportsUniforms";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function UniformDetail() {
  const { sport: sportSlug } = useParams<{ sport: string }>();
  const sport = sportSlug ? getSportBySlug(sportSlug) : null;
  const allSports = getAllSports();

  if (!sport) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Sport Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find uniforms for that sport.
            </p>
            <Button asChild>
              <Link to="/uniforms">Browse All Sports</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Placeholder content - you can expand this per sport
  const uniformTypes = [
    "Game jerseys",
    "Practice gear",
    "Warm-ups & sideline apparel",
    "Team bags & accessories",
  ];

  const decorationOptions = [
    "Screen printing",
    "Embroidery",
    "Heat transfer",
    "Sublimation",
  ];

  const scrollToQuote = () => {
    window.location.href = "/#quote-form";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${sport.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-dark/95 via-charcoal/85 to-charcoal/60" />
          
          <div className="container mx-auto px-4 relative z-10">
            <Link 
              to="/uniforms" 
              className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-accent mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Sports
            </Link>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl md:text-6xl">{sport.icon}</span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-primary-foreground">
                {sport.name} Uniforms
              </h1>
            </div>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl">
              {sport.description}
            </p>
          </div>
        </section>

        {/* Content Section - Placeholder */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Uniform Types */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {sport.name} Uniform Options
                </h2>
                <p className="text-muted-foreground mb-6">
                  We offer a complete range of {sport.name.toLowerCase()} apparel and accessories 
                  for youth, high school, club, and adult programs.
                </p>
                <ul className="space-y-3">
                  {uniformTypes.map((type, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-foreground">{type}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decoration Options */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Customization Options
                </h2>
                <p className="text-muted-foreground mb-6">
                  Add your team logo, player names, and numbers with our professional 
                  decoration services.
                </p>
                <ul className="space-y-3">
                  {decorationOptions.map((option, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-foreground">{option}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Coming Soon Notice */}
            <div className="mt-16 text-center p-8 bg-accent/10 rounded-xl border border-accent/20 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-foreground mb-2">
                More Details Coming Soon
              </h3>
              <p className="text-muted-foreground mb-6">
                We're building out detailed {sport.name.toLowerCase()} uniform galleries and style guides. 
                In the meantime, contact us for a personalized consultation.
              </p>
              <Button onClick={scrollToQuote} className="btn-cta">
                Request a {sport.name} Uniform Quote
              </Button>
            </div>
          </div>
        </section>

        {/* Other Sports */}
        <section className="py-16 bg-background border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Explore Other Sports
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {allSports
                .filter((s) => s.id !== sport.id)
                .slice(0, 6)
                .map((s) => (
                  <Link
                    key={s.id}
                    to={`/uniforms/${s.slug}`}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border hover:border-accent hover:shadow-md transition-all"
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-medium text-foreground hover:text-accent">
                      {s.name}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
