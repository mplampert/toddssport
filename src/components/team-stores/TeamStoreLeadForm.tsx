import { GHLQuoteForm } from "@/components/shared/GHLQuoteForm";

export function TeamStoreLeadForm() {
  return (
    <div id="team-store-form">
      <GHLQuoteForm 
        heading="Ready for Your Own Team Store?"
        subheading="Tell us about your team or league and we'll send you a sample layout and pricing."
      />
    </div>
  );
}
