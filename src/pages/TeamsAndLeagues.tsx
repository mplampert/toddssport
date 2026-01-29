import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QuoteForm } from "@/components/home/QuoteForm";
import { Button } from "@/components/ui/button";
import { Check, Users, Shirt, Heart, Trophy } from "lucide-react";

const features = [
  {
    icon: Shirt,
    title: "Complete Team Uniforms",
    description: "Jerseys, shorts, warm-ups, and practice gear from top athletic brands.",
  },
  {
    icon: Users,
    title: "Coaching & Staff Apparel",
    description: "Coordinated gear for coaches, managers, and support staff.",
  },
  {
    icon: Heart,
    title: "Spirit Wear Programs",
    description: "Fan apparel, parent gear, and school spirit merchandise.",
  },
  {
    icon: Trophy,
    title: "Fundraising Packages",
    description: "Custom merchandise programs to raise funds for your organization.",
  },
];

const benefits = [
  "Bulk pricing for leagues and schools",
  "Size sampling before you order",
  "Custom design assistance included",
  "Coordinated team looks across all levels",
  "Fast turnaround for urgent orders",
  "Dedicated account manager",
  "Easy online ordering for parents",
  "Quality guarantee on all products",
];

const TeamsAndLeagues = () => {
  const scrollToQuote = () => {
    const quoteSection = document.getElementById("quote-form");
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero */}
        <section className="relative min-h-[500px] flex items-center">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1920&q=80')`
            }}
          />
          <div className="absolute inset-0 hero-overlay" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6">
                Team & League Solutions
              </h1>
              <p className="text-xl text-primary-foreground/90 mb-8">
                Your one-stop shop for outfitting youth leagues, high school teams, club sports, and recreational programs. From the first practice to the championship game.
              </p>
              <Button onClick={scrollToQuote} size="lg" className="btn-cta text-lg">
                Get a League Quote
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section-padding">
          <div className="container mx-auto px-4">
            <h2 className="section-heading text-primary">Everything Your Team Needs</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="service-card text-center">
                  <div className="service-card-icon mx-auto">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-primary">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="section-padding bg-secondary">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                  Why Teams Choose Todd's
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  For over 35 years, local leagues and schools have trusted us to outfit their teams. We understand the unique needs of youth sports organizations and provide personalized service that big online retailers can't match.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span className="text-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="rounded-xl overflow-hidden shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80"
                  alt="Youth sports team"
                  className="w-full h-80 lg:h-96 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quote Form */}
        <QuoteForm />
      </main>
      <Footer />
    </div>
  );
};

export default TeamsAndLeagues;
