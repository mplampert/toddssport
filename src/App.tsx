import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Services from "./pages/Services";
import TeamsAndLeagues from "./pages/TeamsAndLeagues";
import Uniforms from "./pages/Uniforms";
import UniformDetail from "./pages/UniformDetail";
import TeamStores from "./pages/TeamStores";
import Fanwear from "./pages/Fanwear";
import Corporate from "./pages/Corporate";
import PromotionalProducts from "./pages/PromotionalProducts";
import Contact from "./pages/Contact";
import Catalogs from "./pages/Catalogs";
import Auth from "./pages/Auth";
import AdminCatalogs from "./pages/admin/AdminCatalogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/teams-leagues" element={<TeamsAndLeagues />} />
          <Route path="/uniforms" element={<Uniforms />} />
          <Route path="/uniforms/:sport" element={<UniformDetail />} />
          <Route path="/team-stores" element={<TeamStores />} />
          <Route path="/fanwear" element={<Fanwear />} />
          <Route path="/corporate" element={<Corporate />} />
          <Route path="/promotional-products" element={<PromotionalProducts />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/catalogs" element={<Catalogs />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/catalogs" element={<AdminCatalogs />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
