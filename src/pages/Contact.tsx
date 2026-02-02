import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QuoteForm } from "@/components/home/QuoteForm";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

const Contact = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value");
      
      if (data) {
        const settingsMap = data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, string>);
        setSettings(settingsMap);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-navy py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground text-center mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-primary-foreground/80 text-center max-w-2xl mx-auto">
              Have a question or ready to start your project? We're here to help.
            </p>
          </div>
        </section>

        {/* Contact Info */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <div className="service-card text-center">
                <div className="service-card-icon mx-auto">
                  <Phone className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">Phone</h3>
                <a 
                  href={`tel:${settings.phone?.replace(/[^0-9]/g, "") || "9789271600"}`}
                  className="text-muted-foreground hover:text-accent transition-colors"
                >
                  {settings.phone || "(978) 927-1600"}
                </a>
              </div>

              <div className="service-card text-center">
                <div className="service-card-icon mx-auto">
                  <Mail className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">Email</h3>
                <a 
                  href={`mailto:${settings.email || "sales@toddssportinggoods.com"}`}
                  className="text-muted-foreground hover:text-accent transition-colors"
                >
                  {settings.email || "sales@toddssportinggoods.com"}
                </a>
              </div>

              <div className="service-card text-center">
                <div className="service-card-icon mx-auto">
                  <MapPin className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">Address</h3>
                <p className="text-muted-foreground">
                  {settings.address || "393 Cabot St., Beverly, MA 01915"}
                </p>
              </div>

              <div className="service-card text-center">
                <div className="service-card-icon mx-auto">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">Hours</h3>
                <p className="text-muted-foreground">
                  Mon-Fri: 9am - 5pm<br />
                  Sat: 10am - 2pm
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quote Form */}
        <QuoteForm />
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
