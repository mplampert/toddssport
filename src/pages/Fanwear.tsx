import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FanwearHero } from "@/components/fanwear/FanwearHero";
import { WhyFanwearMatters } from "@/components/fanwear/WhyFanwearMatters";
import { ProductCategories } from "@/components/fanwear/ProductCategories";
import { FanwearHowItWorks } from "@/components/fanwear/FanwearHowItWorks";
import { FundraisingHighlight } from "@/components/fanwear/FundraisingHighlight";
import { WhoItsFor } from "@/components/fanwear/WhoItsFor";
import { FanwearGallery } from "@/components/fanwear/FanwearGallery";
import { FanwearTestimonials } from "@/components/fanwear/FanwearTestimonials";
import { FanwearLeadForm } from "@/components/fanwear/FanwearLeadForm";

export default function Fanwear() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <FanwearHero />
        <WhyFanwearMatters />
        <ProductCategories />
        <FanwearHowItWorks />
        <FundraisingHighlight />
        <WhoItsFor />
        <FanwearGallery />
        <FanwearTestimonials />
        <FanwearLeadForm />
      </main>
      <Footer />
    </div>
  );
}
