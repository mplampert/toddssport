import { Helmet } from "react-helmet-async";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UniformsHero } from "@/components/uniforms/UniformsHero";
import { FeaturedSportsStrip } from "@/components/uniforms/FeaturedSportsStrip";
import { UniformsGrid } from "@/components/uniforms/UniformsGrid";
import { UniformsCTA } from "@/components/uniforms/UniformsCTA";

export default function Uniforms() {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Custom Team Uniforms | Todd's Sporting Goods</title>
        <meta name="description" content="Design custom team uniforms for baseball, football, basketball, soccer, and more. Premium brands, full customization, serving Beverly, MA and beyond." />
        <meta property="og:title" content="Custom Team Uniforms | Todd's Sporting Goods" />
        <meta property="og:description" content="Design custom team uniforms for every sport. Premium brands, full customization." />
        <meta property="og:url" content="https://toddssportinggoods.com/uniforms" />
        <meta property="og:image" content="https://toddssportinggoods.com/favicon.png" />
        <link rel="canonical" href="https://toddssportinggoods.com/uniforms" />
      </Helmet>
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
