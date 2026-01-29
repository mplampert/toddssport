import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toddsLogo from "@/assets/todds-logo.png";

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
  { name: "Catalogs", path: "/catalogs" },
  { name: "Contact", path: "/contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const location = useLocation();

  const isServiceActive = serviceLinks.some(link => location.pathname === link.path);

  const scrollToQuote = () => {
    const quoteSection = document.getElementById("quote-form");
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: "smooth" });
    } else if (location.pathname !== "/") {
      window.location.href = "/#quote-form";
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

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button onClick={scrollToQuote} className="btn-cta px-6">
              Get a Quote
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
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
