import { Store, Package, CheckCircle } from "lucide-react";
import giftBoxImage from "@/assets/promo-gift-box.jpg";

export function CompanyStoresKits() {
  const storeFeatures = [
    "On-demand ordering for approved items",
    "Support for pop-up event stores and limited-time shops",
    "Reporting on what's being ordered and where it's going",
  ];

  const kittingFeatures = [
    "Curated kit design and sourcing",
    "In-house decoration and quality control",
    "Ship to one location or hundreds of addresses",
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Company Stores & Turnkey Kits
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Company Stores */}
          <div className="bg-muted/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Keep Your Brand On-Demand</h3>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Need a single place where employees, customers, or partners can order approved branded merch? Todd's can stand up a simple company store or pop-up shop that keeps your promo products consistent, on-brand, and easy to order.
            </p>
            <ul className="space-y-3">
              {storeFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Kitting & Fulfillment */}
          <div className="bg-navy/5 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-navy/10 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-navy" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Kitting & Fulfillment</h3>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              From onboarding kits to event swag boxes, we assemble, pack, and ship directly to your recipients.
            </p>
            <ul className="space-y-3">
              {kittingFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-navy flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Visual */}
        <div className="mt-12">
          <img 
            src={giftBoxImage}
            alt="Curated gift kit with branded merchandise"
            className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
