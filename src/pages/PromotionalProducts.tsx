import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PromoHero } from "@/components/promo/PromoHero";
import { WhatWeDo } from "@/components/promo/WhatWeDo";
import { PromoCategories } from "@/components/promo/PromoCategories";
import { CompanyStoresKits } from "@/components/promo/CompanyStoresKits";
import { WhyPromoWithTodds } from "@/components/promo/WhyPromoWithTodds";
import { PromoIdeas } from "@/components/promo/PromoIdeas";
import { PromoGallery } from "@/components/promo/PromoGallery";
import { PromoTestimonials } from "@/components/promo/PromoTestimonials";
import { PromoLeadForm } from "@/components/promo/PromoLeadForm";

const PromotionalProducts = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <PromoHero />
        <WhatWeDo />
        <PromoCategories />
        <CompanyStoresKits />
        <WhyPromoWithTodds />
        <PromoIdeas />
        <PromoGallery />
        <PromoTestimonials />
        <PromoLeadForm />
      </main>
      <Footer />
    </div>
  );
};

export default PromotionalProducts;
