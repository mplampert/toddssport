import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CorporateHero } from "@/components/corporate/CorporateHero";
import { WhyBrandedGear } from "@/components/corporate/WhyBrandedGear";
import { CorporateApparelTypes } from "@/components/corporate/CorporateApparelTypes";
import { PromoProducts } from "@/components/corporate/PromoProducts";
import { BrandPartners } from "@/components/corporate/BrandPartners";
import { CorporateUseCases } from "@/components/corporate/CorporateUseCases";
import { ServicesTiles } from "@/components/corporate/ServicesTiles";
import { CorporateTestimonials } from "@/components/corporate/CorporateTestimonials";
import { CorporateLeadForm } from "@/components/corporate/CorporateLeadForm";

const Corporate = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <CorporateHero />
        <WhyBrandedGear />
        <CorporateApparelTypes />
        <PromoProducts />
        <BrandPartners />
        <CorporateUseCases />
        <ServicesTiles />
        <CorporateTestimonials />
        <CorporateLeadForm />
      </main>
      <Footer />
    </div>
  );
};

export default Corporate;
