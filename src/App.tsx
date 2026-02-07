import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "./components/ScrollToTop";
import Index from "./pages/Index";
import Services from "./pages/Services";
import TeamsAndLeagues from "./pages/TeamsAndLeagues";
import Uniforms from "./pages/Uniforms";
import UniformDetail from "./pages/UniformDetail";
import TeamStores from "./pages/TeamStores";
import TeamStoresListing from "./pages/TeamStoresListing";
import TeamStoreDetail from "./pages/TeamStoreDetail";
import Fanwear from "./pages/Fanwear";
import Corporate from "./pages/Corporate";
import PromotionalProducts from "./pages/PromotionalProducts";
import Contact from "./pages/Contact";
import Catalogs from "./pages/Catalogs";
import FindYourRep from "./pages/FindYourRep";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import WebstoreTerms from "./pages/WebstoreTerms";
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
import AdminLookbookGenerator from "./pages/admin/AdminLookbookGenerator";
import AdminCatalogProducts from "./pages/admin/AdminCatalogProducts";
import AdminPromoProducts from "./pages/admin/AdminPromoProducts";
import AdminTeamStores from "./pages/admin/AdminTeamStores";
import NewTeamStoreWizard from "./pages/admin/NewTeamStoreWizard";
import AdminTeamStoreDetail from "./pages/admin/AdminTeamStoreDetail";
import StoreDashboard from "./pages/admin/team-store/StoreDashboard";
import StoreOverview from "./pages/admin/team-store/StoreOverview";
import StoreProducts from "./pages/admin/team-store/StoreProducts";
import StoreLogos from "./pages/admin/team-store/StoreLogos";
import StoreBranding from "./pages/admin/team-store/StoreBranding";
import StoreReports from "./pages/admin/team-store/StoreReports";
import StoreOrders from "./pages/admin/team-store/StoreOrders";
import StoreFulfillment from "./pages/admin/team-store/StoreFulfillment";
import StoreMarketing from "./pages/admin/team-store/StoreMarketing";
import StoreSettings from "./pages/admin/team-store/StoreSettings";
import TeamStoresDashboard from "./pages/admin/team-stores/TeamStoresDashboard";
import TeamStoresStores from "./pages/admin/team-stores/TeamStoresStores";
import TeamStoresOrders from "./pages/admin/team-stores/TeamStoresOrders";
import TeamStoresFundraising from "./pages/admin/team-stores/TeamStoresFundraising";
import TeamStoresLogos from "./pages/admin/team-stores/TeamStoresLogos";
import TeamStoresSettings from "./pages/admin/team-stores/TeamStoresSettings";
import PromoProductDetail from "./pages/PromoProductDetail";
import SSProducts from "./pages/SSProducts";
import SSBrandProducts from "./pages/SSBrandProducts";
import SSBrandCategoryProducts from "./pages/SSBrandCategoryProducts";
import SSProductDetail from "./pages/SSProductDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
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
          <Route path="/team-stores/browse" element={<TeamStoresListing />} />
          <Route path="/team-stores/:slug" element={<TeamStoreDetail />} />
          <Route path="/fanwear" element={<Fanwear />} />
          <Route path="/corporate" element={<Corporate />} />
          <Route path="/promotional-products" element={<PromotionalProducts />} />
          <Route path="/promo-products/:id" element={<PromoProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/catalogs" element={<Catalogs />} />
          <Route path="/find-your-rep" element={<FindYourRep />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/webstore-terms" element={<WebstoreTerms />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/ss-products" element={<SSProducts />} />
          <Route path="/ss-products/brand/:brandName" element={<SSBrandProducts />} />
          <Route path="/ss-products/brand/:brandName/:category" element={<SSBrandCategoryProducts />} />
          <Route path="/ss-products/:styleId" element={<SSProductDetail />} />
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
          <Route path="/admin/lookbook-generator" element={<AdminLookbookGenerator />} />
          <Route path="/admin/catalog-products" element={<AdminCatalogProducts />} />
          <Route path="/admin/promo-products" element={<AdminPromoProducts />} />
          <Route path="/admin/team-stores" element={<AdminTeamStores />}>
            <Route index element={<TeamStoresDashboard />} />
            <Route path="stores" element={<TeamStoresStores />} />
            <Route path="orders" element={<TeamStoresOrders />} />
            <Route path="fundraising" element={<TeamStoresFundraising />} />
            <Route path="logos" element={<TeamStoresLogos />} />
            <Route path="settings" element={<TeamStoresSettings />} />
            <Route path="new" element={<NewTeamStoreWizard />} />
            <Route path=":id/*" element={<AdminTeamStoreDetail />}>
              <Route index element={<StoreOverview />} />
              <Route path="overview" element={<StoreOverview />} />
              <Route path="dashboard" element={<StoreDashboard />} />
              <Route path="products" element={<StoreProducts />} />
              <Route path="logos" element={<StoreLogos />} />
              <Route path="branding" element={<StoreBranding />} />
              <Route path="orders" element={<StoreOrders />} />
              <Route path="reports" element={<StoreReports />} />
              <Route path="fulfillment" element={<StoreFulfillment />} />
              <Route path="marketing" element={<StoreMarketing />} />
              <Route path="settings" element={<StoreSettings />} />
            </Route>
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
