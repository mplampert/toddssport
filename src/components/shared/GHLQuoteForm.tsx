import { useEffect } from "react";

interface GHLQuoteFormProps {
  heading?: string;
  subheading?: string;
  className?: string;
}

export const GHLQuoteForm = ({
  heading = "Get a Custom Quote",
  subheading = "Share your project details and we'll get back to you with options tailored to your needs.",
  className = "",
}: GHLQuoteFormProps) => {
  useEffect(() => {
    // Load the GHL form embed script
    const existingScript = document.querySelector(
      'script[src="https://link.msgsndr.com/js/form_embed.js"]'
    );
    
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://link.msgsndr.com/js/form_embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <section id="quote-form" className={`section-padding bg-secondary ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="section-heading text-primary">{heading}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subheading}
          </p>
        </div>

        <div className="quote-form-wrapper" style={{ maxWidth: "650px", margin: "0 auto" }}>
          <iframe
            src="https://api.leadconnectorhq.com/widget/form/nIx0eHxbI8w5tOxWialu"
            style={{
              width: "100%",
              height: "1083px",
              border: "none",
              borderRadius: "3px",
            }}
            id="inline-nIx0eHxbI8w5tOxWialu"
            data-layout="{'id':'INLINE'}"
            data-trigger-type="alwaysShow"
            data-trigger-value=""
            data-activation-type="alwaysActivated"
            data-activation-value=""
            data-deactivation-type="neverDeactivate"
            data-deactivation-value=""
            data-form-name="Get a Custom Quote"
            data-height="1083"
            data-layout-iframe-id="inline-nIx0eHxbI8w5tOxWialu"
            data-form-id="nIx0eHxbI8w5tOxWialu"
            title="Get a Custom Quote"
          />
        </div>
      </div>
    </section>
  );
};
