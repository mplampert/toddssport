import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { AboutStrip } from "@/components/home/AboutStrip";
import { WhoWeServe } from "@/components/home/WhoWeServe";
import { ServicesOverview } from "@/components/home/ServicesOverview";
import { BrandsBar } from "@/components/home/BrandsBar";
import { Testimonials } from "@/components/home/Testimonials";
import { HowItWorks } from "@/components/home/HowItWorks";
import { QuoteForm } from "@/components/home/QuoteForm";

interface SiteSetting {
  key: string;
  value: string;
}

const Index = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [services, setServices] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch site settings
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("key, value");
      
      if (settingsData) {
        const settingsMap = settingsData.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, string>);
        setSettings(settingsMap);
      }

      // Fetch services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .order("order_index");
      if (servicesData) setServices(servicesData);

      // Fetch who we serve
      const { data: audiencesData } = await supabase
        .from("who_we_serve")
        .select("*")
        .order("order_index");
      if (audiencesData) setAudiences(audiencesData);

      // Fetch brands
      const { data: brandsData } = await supabase
        .from("brands")
        .select("*")
        .order("order_index");
      if (brandsData) setBrands(brandsData);

      // Fetch testimonials
      const { data: testimonialsData } = await supabase
        .from("testimonials")
        .select("*")
        .order("order_index");
      if (testimonialsData) setTestimonials(testimonialsData);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero 
          headline={settings.hero_headline}
          subheadline={settings.hero_subheadline}
        />
        <AboutStrip />
        <WhoWeServe audiences={audiences.length > 0 ? audiences : undefined} />
        <ServicesOverview services={services.length > 0 ? services : undefined} />
        <BrandsBar brands={brands.length > 0 ? brands : undefined} />
        <Testimonials testimonials={testimonials.length > 0 ? testimonials : undefined} />
        <HowItWorks />
        <QuoteForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
