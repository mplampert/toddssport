import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import teamStoresImg from "@/assets/program-team-stores.jpg";
import fanwearImg from "@/assets/program-fanwear.jpg";
import corporateImg from "@/assets/program-corporate.jpg";
import promoImg from "@/assets/service-promo-products.jpg";

const programs = [
  {
    id: 1,
    title: "Team Stores",
    description: "Custom online stores for your team, school, or organization. Easy ordering for players and parents.",
    image: teamStoresImg,
    link: "/team-stores",
  },
  {
    id: 2,
    title: "Fanwear & Spirit Wear",
    description: "Show your pride with custom fan apparel, hoodies, and merchandise for the whole community.",
    image: fanwearImg,
    link: "/fanwear",
  },
  {
    id: 3,
    title: "Corporate & Staff Apparel",
    description: "Professional embroidered polos, jackets, and uniforms that elevate your brand.",
    image: corporateImg,
    link: "/corporate",
  },
  {
    id: 4,
    title: "Promotional Products",
    description: "Branded giveaways, event merchandise, and promotional items that make an impact.",
    image: promoImg,
    link: "/promotional-products",
  },
];

export function ProgramCards() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {programs.map((program) => (
            <Link 
              key={program.id}
              to={program.link}
              className="group relative rounded-xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image */}
              <div className="h-44 overflow-hidden">
                <img 
                  src={program.image}
                  alt={program.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-primary mb-2 group-hover:text-accent transition-colors">
                  {program.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {program.description}
                </p>
                <span className="inline-flex items-center text-sm font-semibold text-accent group-hover:gap-2 transition-all">
                  Explore
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
