import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import sampleFootball from "@/assets/sample-store-football.jpg";
import sampleBaseball from "@/assets/sample-store-baseball.jpg";
import sampleSpirit from "@/assets/sample-store-spirit.jpg";

const sampleStores = [
  {
    id: 1,
    title: "Sample Football Store",
    subtitle: "Includes player packs, fanwear, and coach gear.",
    ctaText: "View Football Sample Store",
    image: sampleFootball,
    bulletPoints: [
      "Complete player package options",
      "Sideline gear for coaches and staff",
      "Parent and fan apparel",
      "Fundraising margin built in",
      "Ship-to-home or bulk delivery",
    ],
  },
  {
    id: 2,
    title: "Sample Baseball/Softball Store",
    subtitle: "Uniform packages, practice gear, and dugout apparel.",
    ctaText: "View Baseball/Softball Sample Store",
    image: sampleBaseball,
    bulletPoints: [
      "Customizable uniform packages",
      "Practice jerseys and warm-ups",
      "Dugout and travel gear",
      "Team and family fanwear",
      "Flexible ordering windows",
    ],
  },
  {
    id: 3,
    title: "Sample School Spirit Store",
    subtitle: "Hoodies, tees, and accessories for the whole community.",
    ctaText: "View School Spirit Sample Store",
    image: sampleSpirit,
    bulletPoints: [
      "School-branded hoodies and tees",
      "Accessories and spirit items",
      "Options for students, staff, and families",
      "Year-round or seasonal availability",
      "Easy online ordering for everyone",
    ],
  },
];

interface SampleStore {
  id: number;
  title: string;
  subtitle: string;
  ctaText: string;
  image: string;
  bulletPoints: string[];
}

export function SampleStores() {
  const [selectedStore, setSelectedStore] = useState<SampleStore | null>(null);

  const openModal = (store: SampleStore) => {
    setSelectedStore(store);
  };

  const closeModal = () => {
    setSelectedStore(null);
  };

  const scrollToForm = () => {
    closeModal();
    const formElement = document.getElementById("team-store-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Sample Stores
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Click to see examples of what your team's online store could look like, then tell us which style you want.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {sampleStores.map((store) => (
            <button
              key={store.id}
              onClick={() => openModal(store)}
              className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer aspect-[4/3] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              {/* Background Image with Zoom */}
              <div className="absolute inset-0 overflow-hidden">
                <img 
                  src={store.image} 
                  alt={store.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              
              {/* Default Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent transition-opacity duration-300" />
              
              {/* Hover Gradient Overlay - Darker */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/60 to-charcoal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                {/* Title and Subtitle - Always Visible */}
                <div className="transition-transform duration-300 group-hover:-translate-y-14">
                  <h3 className="font-bold text-xl text-white mb-1">{store.title}</h3>
                  <p className="text-white/80 text-sm">{store.subtitle}</p>
                </div>
                
                {/* CTA Button - Shows on Hover */}
                <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                  <span className="inline-flex items-center justify-center w-full px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg shadow-md hover:bg-accent/90 transition-colors">
                    {store.ctaText}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal for Store Preview */}
      <Dialog open={!!selectedStore} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedStore && (
            <>
              {/* Image */}
              <div className="relative aspect-video">
                <img 
                  src={selectedStore.image} 
                  alt={selectedStore.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>
              
              {/* Content */}
              <div className="p-6 pt-0 -mt-8 relative">
                <DialogTitle className="text-2xl font-bold text-foreground mb-2">
                  {selectedStore.title}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mb-4">
                  {selectedStore.subtitle}
                </DialogDescription>
                
                {/* Bullet Points */}
                <ul className="space-y-2 mb-6">
                  {selectedStore.bulletPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3 text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                
                {/* CTA Button */}
                <Button 
                  onClick={scrollToForm}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  size="lg"
                >
                  Request a Store Like This
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
