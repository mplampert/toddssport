import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-navy text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xl">T</span>
              </div>
              <span className="font-bold text-xl">Todd's Sporting Goods</span>
            </div>
            <p className="text-primary-foreground/70 max-w-md">
              Your local provider of custom apparel, uniforms, and promotional products. 
              Serving schools, leagues, businesses, and organizations since 1985.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Home
              </Link>
              <Link to="/services" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Services
              </Link>
              <Link to="/teams-leagues" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Teams & Leagues
              </Link>
              <Link to="/contact" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Contact
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-bold text-lg mb-4">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a href="tel:+15551234567" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone size={18} />
                (555) 123-4567
              </a>
              <a href="mailto:info@toddssportinggoods.com" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail size={18} />
                info@toddssportinggoods.com
              </a>
              <div className="flex items-start gap-2 text-primary-foreground/70">
                <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                123 Main Street, Hometown, USA 12345
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-primary-foreground/60">
          <p>© {new Date().getFullYear()} Todd's Sporting Goods. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
