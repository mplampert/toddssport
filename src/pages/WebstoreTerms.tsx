import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useEffect } from "react";

export default function WebstoreTerms() {
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-12 md:py-20">
        <div className="container mx-auto px-4">
          <iframe
            src="https://api.leadconnectorhq.com/widget/form/sqehqnDzOmmiMylpd2JO"
            style={{
              width: "100%",
              height: "1963px",
              border: "none",
              borderRadius: "0px",
            }}
            id="inline-sqehqnDzOmmiMylpd2JO"
            data-layout="{'id':'INLINE'}"
            data-trigger-type="alwaysShow"
            data-trigger-value=""
            data-activation-type="alwaysActivated"
            data-activation-value=""
            data-deactivation-type="neverDeactivate"
            data-deactivation-value=""
            data-form-name="WEBSTORE TERMS & CONDITIONS"
            data-height="1963"
            data-layout-iframe-id="inline-sqehqnDzOmmiMylpd2JO"
            data-form-id="sqehqnDzOmmiMylpd2JO"
            title="WEBSTORE TERMS & CONDITIONS"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
