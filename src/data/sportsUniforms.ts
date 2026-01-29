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
    image: "https://images.unsplash.com/photo-1580477371194-5c7e5c5a5b5f?w=600&h=400&fit=crop",
    icon: "🏒",
    featured: false,
    order: 1,
  },
  {
    id: "baseball",
    name: "Baseball",
    slug: "baseball",
    description: "Full-button jerseys, pants, caps, and warm-ups for youth through adult leagues.",
    image: "https://images.unsplash.com/photo-1529926706528-db9e5010cd3e?w=600&h=400&fit=crop",
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
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
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
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop",
    icon: "🏀",
    featured: false,
    order: 4,
  },
  {
    id: "football",
    name: "Football",
    slug: "football",
    description: "Jerseys, practice gear, sideline apparel, and fan wear for your program.",
    image: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&h=400&fit=crop",
    icon: "🏈",
    featured: false,
    order: 5,
  },
  {
    id: "soccer",
    name: "Soccer",
    slug: "soccer",
    description: "Lightweight jerseys, shorts, training gear, and keeper kits.",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop",
    icon: "⚽",
    featured: false,
    order: 6,
  },
  {
    id: "track-field",
    name: "Track & Field",
    slug: "track-field",
    description: "Singlets, shorts, warm-ups, and team bags for sprinters to throwers.",
    image: "https://images.unsplash.com/photo-1461896836934- voices?w=600&h=400&fit=crop",
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
    image: "https://images.unsplash.com/photo-1578432014316-48b448d79d57?w=600&h=400&fit=crop",
    icon: "🥎",
    featured: false,
    order: 8,
  },
  {
    id: "volleyball",
    name: "Volleyball",
    slug: "volleyball",
    description: "Jerseys, spandex, and warm-ups for indoor and sand volleyball teams.",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&h=400&fit=crop",
    icon: "🏐",
    featured: false,
    order: 9,
  },
  {
    id: "wrestling",
    name: "Wrestling",
    slug: "wrestling",
    description: "Custom singlets, warm-ups, and team gear for grapplers at every level.",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
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
