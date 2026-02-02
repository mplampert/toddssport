import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PromoHeroNew } from "@/components/promo/PromoHeroNew";
import { BrandedMerchandise } from "@/components/promo/BrandedMerchandise";
import { EmployeeGifting } from "@/components/promo/EmployeeGifting";
import { EventCampaignKits } from "@/components/promo/EventCampaignKits";
import { PromoFinalCTA } from "@/components/promo/PromoFinalCTA";

const PromotionalProducts = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <PromoHeroNew />
        <BrandedMerchandise />
        <EmployeeGifting />
        <EventCampaignKits />
        <PromoFinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default PromotionalProducts;
