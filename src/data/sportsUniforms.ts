import hockeyUniforms from "@/assets/uniforms/hockey-uniforms.jpg";
import baseballUniforms from "@/assets/uniforms/baseball-uniforms.jpg";
import lacrosseUniforms from "@/assets/uniforms/lacrosse-uniforms.jpg";
import basketballUniforms from "@/assets/uniforms/basketball-uniforms.jpg";
import footballUniforms from "@/assets/uniforms/football-uniforms.jpg";
import soccerUniforms from "@/assets/uniforms/soccer-uniforms.jpg";
import trackUniforms from "@/assets/uniforms/track-uniforms.jpg";
import softballUniforms from "@/assets/uniforms/softball-uniforms.jpg";
import volleyballUniforms from "@/assets/uniforms/volleyball-uniforms.jpg";
import wrestlingUniforms from "@/assets/uniforms/wrestling-uniforms.jpg";

export interface SportUniform {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  featured: boolean;
  featuredLabel?: string; // e.g., "Spring Baseball", "Fall Football"
  order: number;
}

// Add or remove sports here - the page will automatically update
export const sportsUniforms: SportUniform[] = [
  {
    id: "hockey",
    name: "Hockey",
    slug: "hockey",
    description: "Custom jerseys, socks, and practice gear for ice and roller hockey teams.",
    image: hockeyUniforms,
    icon: "🏒",
    featured: false,
    order: 1,
  },
  {
    id: "baseball",
    name: "Baseball",
    slug: "baseball",
    description: "Full-button jerseys, pants, caps, and warm-ups for youth through adult leagues.",
    image: baseballUniforms,
    icon: "⚾",
    featured: true,
    featuredLabel: "Spring Baseball",
    order: 2,
  },
  {
    id: "lacrosse",
    name: "Lacrosse",
    slug: "lacrosse",
    description: "Game-day reversibles, shooting shirts, shorts, and pinnies built for speed.",
    image: lacrosseUniforms,
    icon: "🥍",
    featured: true,
    featuredLabel: "Spring Lacrosse",
    order: 3,
  },
  {
    id: "basketball",
    name: "Basketball",
    slug: "basketball",
    description: "Sublimated or sewn jerseys, shorts, and warm-up gear for all levels.",
    image: basketballUniforms,
    icon: "🏀",
    featured: false,
    order: 4,
  },
  {
    id: "football",
    name: "Football",
    slug: "football",
    description: "Jerseys, practice gear, sideline apparel, and fan wear for your program.",
    image: footballUniforms,
    icon: "🏈",
    featured: false,
    order: 5,
  },
  {
    id: "soccer",
    name: "Soccer",
    slug: "soccer",
    description: "Lightweight jerseys, shorts, training gear, and keeper kits.",
    image: soccerUniforms,
    icon: "⚽",
    featured: false,
    order: 6,
  },
  {
    id: "track-field",
    name: "Track & Field",
    slug: "track-field",
    description: "Singlets, shorts, warm-ups, and team bags for sprinters to throwers.",
    image: trackUniforms,
    icon: "🏃",
    featured: true,
    featuredLabel: "Spring Track",
    order: 7,
  },
  {
    id: "softball",
    name: "Softball",
    slug: "softball",
    description: "Jerseys, pants, and accessories designed for fast-pitch and slow-pitch teams.",
    image: softballUniforms,
    icon: "🥎",
    featured: false,
    order: 8,
  },
  {
    id: "volleyball",
    name: "Volleyball",
    slug: "volleyball",
    description: "Jerseys, spandex, and warm-ups for indoor and sand volleyball teams.",
    image: volleyballUniforms,
    icon: "🏐",
    featured: false,
    order: 9,
  },
  {
    id: "wrestling",
    name: "Wrestling",
    slug: "wrestling",
    description: "Custom singlets, warm-ups, and team gear for grapplers at every level.",
    image: wrestlingUniforms,
    icon: "🤼",
    featured: false,
    order: 10,
  },
];

// Helper functions
export const getFeaturedSports = () => 
  sportsUniforms.filter(sport => sport.featured).sort((a, b) => a.order - b.order);

export const getAllSports = () => 
  sportsUniforms.sort((a, b) => a.order - b.order);

export const getSportBySlug = (slug: string) => 
  sportsUniforms.find(sport => sport.slug === slug);
