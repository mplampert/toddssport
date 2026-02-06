import { Helmet } from "react-helmet-async";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TeamStoreHero } from "@/components/team-stores/TeamStoreHero";
import { HowItWorks } from "@/components/team-stores/HowItWorks";
import { StorePreview } from "@/components/team-stores/StorePreview";
import { FeaturesAndBenefits } from "@/components/team-stores/FeaturesAndBenefits";
import { FundraisingCallout } from "@/components/team-stores/FundraisingCallout";
import { SampleStores } from "@/components/team-stores/SampleStores";
import { TeamStoreFAQ } from "@/components/team-stores/TeamStoreFAQ";
import { TeamStoreLeadForm } from "@/components/team-stores/TeamStoreLeadForm";

export default function TeamStores() {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Custom Team Stores | Todd's Sporting Goods</title>
        <meta name="description" content="Launch your own branded online team store for uniforms, spirit wear, and fundraising gear. Fully managed by Todd's Sporting Goods in Beverly, MA." />
        <meta property="og:title" content="Custom Team Stores | Todd's Sporting Goods" />
        <meta property="og:description" content="Launch your own branded online team store for uniforms, spirit wear, and fundraising gear." />
        <meta property="og:url" content="https://toddssportinggoods.com/team-stores" />
        <meta property="og:image" content="https://toddssportinggoods.com/og-image.jpg" />
        <link rel="canonical" href="https://toddssportinggoods.com/team-stores" />
      </Helmet>
      <Header />
      <main className="flex-1">
        <TeamStoreHero />
        <HowItWorks />
        <StorePreview />
        <FeaturesAndBenefits />
        <FundraisingCallout />
        <SampleStores />
        <TeamStoreFAQ />
        <TeamStoreLeadForm />
      </main>
      <Footer />
    </div>
  );
}
