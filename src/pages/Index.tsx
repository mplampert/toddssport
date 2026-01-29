import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { ProgramCards } from "@/components/home/ProgramCards";
import { FindYourRep } from "@/components/home/FindYourRep";
import { WeAreStatement } from "@/components/home/WeAreStatement";
import { BrandsStrip } from "@/components/home/BrandsStrip";
import { AboutMission } from "@/components/home/AboutMission";
import { ConnectCTA } from "@/components/home/ConnectCTA";
import { QuoteForm } from "@/components/home/QuoteForm";

const Index = () => {
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch brands
      const { data: brandsData } = await supabase
        .from("brands")
        .select("*")
        .order("order_index");
      if (brandsData) setBrands(brandsData);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <ProgramCards />
        <FindYourRep />
        <WeAreStatement />
        <BrandsStrip brands={brands.length > 0 ? brands : undefined} />
        <AboutMission />
        <ConnectCTA />
        <QuoteForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
