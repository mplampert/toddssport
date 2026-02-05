import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-navy text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-black text-2xl">T</span>
              </div>
              <span className="font-bold text-xl">Todd's Sporting Goods</span>
            </div>
            <p className="text-primary-foreground/70 max-w-md mb-6">
              Your local provider of custom apparel, uniforms, and promotional products. 
              Serving schools, leagues, businesses, and organizations since 1985.
            </p>
            {/* Social Icons */}
            <div className="flex gap-3">
              <a 
                href="https://www.facebook.com/Toddsscreenprintingandembroidery" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://www.instagram.com/toddssportinggoods/" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

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
              <Link to="/webstore-terms" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Webstore Terms
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-bold text-lg mb-4">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a href="tel:+19789271600" className="flex items-center gap-3 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone size={18} />
                (978) 927-1600
              </a>
              <a href="mailto:sales@toddssportinggoods.com" className="flex items-center gap-3 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail size={18} />
                sales@toddssportinggoods.com
              </a>
              <div className="flex items-start gap-3 text-primary-foreground/70">
                <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                393 Cabot St.<br />Beverly, MA 01915
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-primary-foreground/60 text-sm">
          <p>© {new Date().getFullYear()} Todd's Sporting Goods. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            <Link to="/privacy-policy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-primary-foreground transition-colors">Terms of Service</Link>
            <Link to="/auth?returnTo=/admin" className="hover:text-primary-foreground transition-colors text-xs opacity-50">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
