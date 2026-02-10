import { Paintbrush } from "lucide-react";

export function DesignLibraryHero() {
  return (
    <section className="relative bg-primary text-primary-foreground overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-accent blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
            <Paintbrush className="w-6 h-6 text-accent-foreground" />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 uppercase">
          <span className="block text-primary-foreground/70 text-xl md:text-2xl font-semibold tracking-[0.25em] mb-2 normal-case">
            Your Team Name
          </span>
          Design Library
        </h1>

        <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto">
          Tons of <span className="text-accent font-bold">designs</span> for teams, events, slogans, and more
        </p>
      </div>
    </section>
  );
}
