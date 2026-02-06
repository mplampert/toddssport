import { Helmet } from "react-helmet-async";
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
      <Helmet>
        <title>Corporate Apparel & Branded Gear | Todd's Sporting Goods</title>
        <meta name="description" content="Elevate your brand with custom corporate apparel, promotional products, and company stores. Trusted by businesses in Beverly, MA and nationwide." />
        <meta property="og:title" content="Corporate Apparel & Branded Gear | Todd's Sporting Goods" />
        <meta property="og:description" content="Custom corporate apparel, promotional products, and company stores for your brand." />
        <meta property="og:url" content="https://toddssportinggoods.com/corporate" />
        <meta property="og:image" content="https://toddssportinggoods.com/og-image.jpg" />
        <meta property="fb:app_id" content="290429385513054" />
        <link rel="canonical" href="https://toddssportinggoods.com/corporate" />
      </Helmet>
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
