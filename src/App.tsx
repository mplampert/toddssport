import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
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
import FindYourRep from "./pages/FindYourRep";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Auth from "./pages/Auth";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import MyOrders from "./pages/MyOrders";
import Cart from "./pages/Cart";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCatalogs from "./pages/admin/AdminCatalogs";
import AdminChamproOrders from "./pages/admin/AdminChamproOrders";
import AdminChamproPricing from "./pages/admin/AdminChamproPricing";
import AdminReps from "./pages/admin/AdminReps";
import AdminUniforms from "./pages/admin/AdminUniforms";
import AdminFlyers from "./pages/admin/AdminFlyers";
import AdminFlyerNew from "./pages/admin/AdminFlyerNew";
import AdminMessageGenerator from "./pages/admin/AdminMessageGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
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
          <Route path="/find-your-rep" element={<FindYourRep />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/catalogs" element={<AdminCatalogs />} />
          <Route path="/admin/champro-orders" element={<AdminChamproOrders />} />
          <Route path="/admin/champro-pricing" element={<AdminChamproPricing />} />
          <Route path="/admin/reps" element={<AdminReps />} />
          <Route path="/admin/uniforms" element={<AdminUniforms />} />
          <Route path="/admin/flyers" element={<AdminFlyers />} />
          <Route path="/admin/flyers/new" element={<AdminFlyerNew />} />
          <Route path="/admin/flyers/:id/edit" element={<AdminFlyerNew />} />
          <Route path="/admin/message-generator" element={<AdminMessageGenerator />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
