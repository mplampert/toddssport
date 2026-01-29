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
