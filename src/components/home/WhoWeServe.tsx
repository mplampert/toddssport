import { Trophy, GraduationCap, Briefcase, Calendar } from "lucide-react";

interface Audience {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const defaultAudiences: Audience[] = [
  {
    id: "1",
    title: "Youth & Town Sports Leagues",
    description: "Complete uniform and spirit wear solutions for recreational and competitive youth sports programs.",
    icon: "Trophy",
  },
  {
    id: "2",
    title: "High Schools & Colleges",
    description: "Athletic uniforms, fan gear, and branded apparel for educational institutions of all sizes.",
    icon: "GraduationCap",
  },
  {
    id: "3",
    title: "Businesses & Corporate Teams",
    description: "Professional branded apparel for company teams, events, and employee uniforms.",
    icon: "Briefcase",
  },
  {
    id: "4",
    title: "Events, Camps & Fundraisers",
    description: "Custom merchandise for camps, tournaments, charity events, and fundraising initiatives.",
    icon: "Calendar",
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  GraduationCap,
  Briefcase,
  Calendar,
};

interface WhoWeServeProps {
  audiences?: Audience[];
}

export function WhoWeServe({ audiences = defaultAudiences }: WhoWeServeProps) {
  return (
    <section className="section-padding bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="section-heading text-primary">Who We Serve</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((audience, index) => {
            const IconComponent = iconMap[audience.icon] || Trophy;
            return (
              <div 
                key={audience.id}
                className="service-card text-center"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="service-card-icon mx-auto">
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">{audience.title}</h3>
                <p className="text-muted-foreground text-sm">{audience.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
