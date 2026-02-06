import { Helmet } from "react-helmet-async";
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
      <Helmet>
        <title>Promotional Products & Branded Merch | Todd's Sporting Goods</title>
        <meta name="description" content="Custom branded merchandise, employee gifts, event kits, and promotional products. From concept to delivery, Todd's handles it all." />
        <meta property="og:title" content="Promotional Products & Branded Merch | Todd's Sporting Goods" />
        <meta property="og:description" content="Custom branded merchandise, employee gifts, and event kits from Todd's Sporting Goods." />
        <meta property="og:url" content="https://toddssportinggoods.com/promotional-products" />
        <meta property="og:image" content="https://toddssportinggoods.com/og-image.jpg" />
        <link rel="canonical" href="https://toddssportinggoods.com/promotional-products" />
      </Helmet>
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
