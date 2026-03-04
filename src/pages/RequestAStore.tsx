import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const RequestAStore = () => {
  useEffect(() => {
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
      <Helmet>
        <title>Request a Store | Todd's Sporting Goods</title>
        <meta
          name="description"
          content="Request a custom team store from Todd's Sporting Goods."
        />
        <link
          rel="canonical"
          href="https://toddssportinggoods.com/request-a-store"
        />
      </Helmet>
      <Header />
      <main className="flex-grow bg-background">
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-primary text-center mb-10">
              Request a Store
            </h1>

            <div
              className="max-w-4xl mx-auto rounded-md overflow-hidden border border-border bg-card"
              style={{ minHeight: "1004px" }}
            >
              <iframe
                src="https://api.leadconnectorhq.com/widget/form/nIx0eHxbI8w5tOxWialu"
                style={{ width: "100%", height: "100%", border: "none", borderRadius: "3px" }}
                id="inline-nIx0eHxbI8w5tOxWialu"
                data-layout="{'id':'INLINE'}"
                data-trigger-type="alwaysShow"
                data-trigger-value=""
                data-activation-type="alwaysActivated"
                data-activation-value=""
                data-deactivation-type="neverDeactivate"
                data-deactivation-value=""
                data-form-name="Get a Custom Quote"
                data-height="1004"
                data-layout-iframe-id="inline-nIx0eHxbI8w5tOxWialu"
                data-form-id="nIx0eHxbI8w5tOxWialu"
                title="Get a Custom Quote"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RequestAStore;
