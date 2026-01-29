import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UniformsHero } from "@/components/uniforms/UniformsHero";
import { FeaturedSportsStrip } from "@/components/uniforms/FeaturedSportsStrip";
import { UniformsGrid } from "@/components/uniforms/UniformsGrid";
import { UniformsCTA } from "@/components/uniforms/UniformsCTA";

export default function Uniforms() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <UniformsHero />
        <FeaturedSportsStrip />
        <UniformsGrid />
        <UniformsCTA />
      </main>
      <Footer />
    </div>
  );
}
