import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackCTAClick, trackOutboundClick } from "@/lib/ga4";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toddsLogo from "@/assets/todds-logo.png";
import { useTeamStoreCart } from "@/hooks/useTeamStoreCart";
import { openCartDrawer } from "@/components/team-stores/TeamStoreCartDrawer";

const serviceLinks = [
  { name: "Team Uniforms", path: "/uniforms" },
  { name: "Team Stores", path: "/team-stores" },
  { name: "Fanwear", path: "/fanwear" },
  { name: "Corporate", path: "/corporate" },
  { name: "Promo Products", path: "/promotional-products" },
  { name: "Teams & Leagues", path: "/teams-leagues" },
];

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Find Your Rep", path: "/find-your-rep" },
  { name: "Catalogs", path: "/catalogs" },
  { name: "Contact", path: "/contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const location = useLocation();
  const { items, itemsForStore } = useTeamStoreCart();

  // Detect if we're on a team store storefront page
  const storeSlugMatch = location.pathname.match(/^\/team-stores\/([^/]+)/);
  const isStorefront = !!storeSlugMatch && location.pathname !== "/team-stores" && !location.pathname.startsWith("/team-stores/browse");

  // Get cart count for the current store
  const displayCount = isStorefront
    ? items.filter(i => i.storeSlug === storeSlugMatch![1]).reduce((s, i) => s + i.quantity, 0)
    : 0;

  const isServiceActive = serviceLinks.some(link => location.pathname === link.path);

  const scrollToQuote = () => {
    // Try to find any form section on the current page
    const formIds = [
      "quote-form",
      "team-store-form", 
      "fanwear-form",
      "corporate-form",
      "promo-form",
      "contact-form"
    ];
    
    const formSection = formIds
      .map(id => document.getElementById(id))
      .find(el => el !== null);
    
    trackCTAClick("Get a Quote", "header");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/contact";
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={toddsLogo} 
              alt="Todd's Sporting Goods" 
              className="h-10 md:h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`nav-link ${location.pathname === "/" ? "nav-link-active" : ""}`}
            >
              Home
            </Link>

            {/* Services Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className={`nav-link flex items-center gap-1 ${isServiceActive ? "nav-link-active" : ""}`}>
                Services
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background border border-border shadow-lg z-50">
                {serviceLinks.map((link) => (
                  <DropdownMenuItem key={link.path} asChild>
                    <Link
                      to={link.path}
                      className={`w-full cursor-pointer ${location.pathname === link.path ? "text-accent font-semibold" : ""}`}
                    >
                      {link.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <a
              href="https://tsgonline.chipply.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
              onClick={() => trackOutboundClick("https://tsgonline.chipply.com/", "Find My Store")}
            >
              Find My Store
            </a>

            <Link
              to="/catalogs"
              className={`nav-link ${location.pathname === "/catalogs" ? "nav-link-active" : ""}`}
            >
              Catalogs
            </Link>

            <Link
              to="/contact"
              className={`nav-link ${location.pathname === "/contact" ? "nav-link-active" : ""}`}
            >
              Contact
            </Link>
          </nav>

          {/* CTA Button + Cart */}
          <div className="hidden md:flex items-center gap-3">
            {isStorefront && (
              <button
                onClick={() => openCartDrawer()}
                className="relative p-2 rounded-md hover:bg-muted transition-colors"
                aria-label={`Cart (${displayCount} items)`}
              >
                <ShoppingCart className="w-5 h-5" />
                {displayCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-[10px] px-1 bg-destructive text-destructive-foreground">
                    {displayCount}
                  </Badge>
                )}
              </button>
            )}
            <Button onClick={scrollToQuote} className="btn-cta px-6">
              Get a Quote
            </Button>
          </div>

          {/* Mobile: Cart + Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {isStorefront && (
              <button
                onClick={() => openCartDrawer()}
                className="relative p-2 rounded-md hover:bg-muted transition-colors"
                aria-label={`Cart (${displayCount} items)`}
              >
                <ShoppingCart className="w-5 h-5" />
                {displayCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-[10px] px-1 bg-destructive text-destructive-foreground">
                    {displayCount}
                  </Badge>
                )}
              </button>
            )}
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                className={`nav-link py-2 ${location.pathname === "/" ? "nav-link-active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>

              {/* Mobile Services Accordion */}
              <div>
                <button
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                  className={`nav-link py-2 w-full flex items-center justify-between ${isServiceActive ? "nav-link-active" : ""}`}
                >
                  Services
                  <ChevronDown className={`w-4 h-4 transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} />
                </button>
                {mobileServicesOpen && (
                  <div className="pl-4 flex flex-col gap-2 mt-2">
                    {serviceLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`nav-link py-2 text-sm ${location.pathname === link.path ? "nav-link-active" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <a
                href="https://tsgonline.chipply.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Find My Store
              </a>

              <Link
                to="/catalogs"
                className={`nav-link py-2 ${location.pathname === "/catalogs" ? "nav-link-active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Catalogs
              </Link>

              <Link
                to="/contact"
                className={`nav-link py-2 ${location.pathname === "/contact" ? "nav-link-active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>

              <Button onClick={scrollToQuote} className="btn-cta mt-2">
                Get a Quote
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
