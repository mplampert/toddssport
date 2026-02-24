import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "./components/ScrollToTop";
import { ChatWidgetController } from "./components/ChatWidgetController";
import { AdminGuard } from "./components/auth/AdminGuard";
import { CustomerGuard } from "./components/auth/CustomerGuard";
import { TeamStoresLayout } from "./components/admin/team-stores/TeamStoresLayout";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Contact = lazy(() => import("./pages/Contact"));
const Services = lazy(() => import("./pages/Services"));
const Uniforms = lazy(() => import("./pages/Uniforms"));
const UniformDetail = lazy(() => import("./pages/UniformDetail"));
const TeamStores = lazy(() => import("./pages/TeamStores"));
const TeamStoresListing = lazy(() => import("./pages/TeamStoresListing"));
const TeamStoreDetail = lazy(() => import("./pages/TeamStoreDetail"));
const TeamStoreProductDetail = lazy(() => import("./pages/TeamStoreProductDetail"));
const TeamStoreCart = lazy(() => import("./pages/TeamStoreCart"));
const TeamStoreCheckout = lazy(() => import("./pages/TeamStoreCheckout"));
const TeamStorePreview = lazy(() => import("./pages/TeamStorePreview"));
const Fanwear = lazy(() => import("./pages/Fanwear"));
const Corporate = lazy(() => import("./pages/Corporate"));
const TeamsAndLeagues = lazy(() => import("./pages/TeamsAndLeagues"));
const Cart = lazy(() => import("./pages/Cart"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Catalogs = lazy(() => import("./pages/Catalogs"));
const PublicCatalog = lazy(() => import("./pages/PublicCatalog"));
const PublicCatalogDetail = lazy(() => import("./pages/PublicCatalogDetail"));
const FindYourRep = lazy(() => import("./pages/FindYourRep"));
const DesignLibrary = lazy(() => import("./pages/DesignLibrary"));
const DesignCustomizer = lazy(() => import("./pages/DesignCustomizer"));
const PromotionalProducts = lazy(() => import("./pages/PromotionalProducts"));
const PromoProductDetail = lazy(() => import("./pages/PromoProductDetail"));
const SSProducts = lazy(() => import("./pages/SSProducts"));
const SSBrandProducts = lazy(() => import("./pages/SSBrandProducts"));
const SSBrandCategoryProducts = lazy(() => import("./pages/SSBrandCategoryProducts"));
const SSProductDetail = lazy(() => import("./pages/SSProductDetail"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const WebstoreTerms = lazy(() => import("./pages/WebstoreTerms"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Auth = lazy(() => import("./pages/Auth"));

// Account pages
const AccountLogin = lazy(() => import("./pages/account/AccountLogin"));
const AccountRegister = lazy(() => import("./pages/account/AccountRegister"));
const AccountDashboard = lazy(() => import("./pages/account/AccountDashboard"));
const AccountOrders = lazy(() => import("./pages/account/AccountOrders"));
const AccountOrderDetail = lazy(() => import("./pages/account/AccountOrderDetail"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminTeamStores = lazy(() => import("./pages/admin/AdminTeamStores"));
const AdminTeamStoreDetail = lazy(() => import("./pages/admin/AdminTeamStoreDetail"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/AdminCustomerDetail"));
const AdminCatalogs = lazy(() => import("./pages/admin/AdminCatalogs"));
const AdminCatalogProducts = lazy(() => import("./pages/admin/AdminCatalogProducts"));
const AdminFlyers = lazy(() => import("./pages/admin/AdminFlyers"));
const AdminFlyerNew = lazy(() => import("./pages/admin/AdminFlyerNew"));
const AdminReps = lazy(() => import("./pages/admin/AdminReps"));
const AdminUniforms = lazy(() => import("./pages/admin/AdminUniforms"));
const AdminMasterCatalog = lazy(() => import("./pages/admin/AdminMasterCatalog"));
const AdminMasterCatalogBrand = lazy(() => import("./pages/admin/AdminMasterCatalogBrand"));
const AdminMasterCatalogSSBrand = lazy(() => import("./pages/admin/AdminMasterCatalogSSBrand"));
const AdminMasterProductDetail = lazy(() => import("./pages/admin/AdminMasterProductDetail"));
const AdminPromoProducts = lazy(() => import("./pages/admin/AdminPromoProducts"));
const AdminChamproOrders = lazy(() => import("./pages/admin/AdminChamproOrders"));
const AdminChamproPricing = lazy(() => import("./pages/admin/AdminChamproPricing"));
const AdminArtLibrary = lazy(() => import("./pages/admin/AdminArtLibrary"));
const AdminLookbookGenerator = lazy(() => import("./pages/admin/AdminLookbookGenerator"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminMessageGenerator = lazy(() => import("./pages/admin/AdminMessageGenerator"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminGlobalOrders = lazy(() => import("./pages/admin/AdminGlobalOrders"));
const AdminFulfillmentBatches = lazy(() => import("./pages/admin/AdminFulfillmentBatches"));
const AdminStaffUsers = lazy(() => import("./pages/admin/AdminStaffUsers"));
const AdminSampleData = lazy(() => import("./pages/admin/AdminSampleData"));
const NewTeamStoreWizard = lazy(() => import("./pages/admin/NewTeamStoreWizard"));

// Admin team-stores sub-pages
const TeamStoresDashboard = lazy(() => import("./pages/admin/team-stores/TeamStoresDashboard"));
const TeamStoresStores = lazy(() => import("./pages/admin/team-stores/TeamStoresStores"));
const TeamStoresOrders = lazy(() => import("./pages/admin/team-stores/TeamStoresOrders"));
const TeamStoresLogos = lazy(() => import("./pages/admin/team-stores/TeamStoresLogos"));
const TeamStoresProcessing = lazy(() => import("./pages/admin/team-stores/TeamStoresProcessing"));
const TeamStoresFundraising = lazy(() => import("./pages/admin/team-stores/TeamStoresFundraising"));
const TeamStoresFundraisingDetail = lazy(() => import("./pages/admin/team-stores/TeamStoresFundraisingDetail"));
const TeamStoresReports = lazy(() => import("./pages/admin/team-stores/TeamStoresReports"));
const TeamStoresSettings = lazy(() => import("./pages/admin/team-stores/TeamStoresSettings"));
const PersonalizationReport = lazy(() => import("./pages/admin/team-stores/PersonalizationReport"));

// Admin team-store detail sub-pages
const StoreOverview = lazy(() => import("./pages/admin/team-store/StoreOverview"));
const StoreDashboard = lazy(() => import("./pages/admin/team-store/StoreDashboard"));
const StoreDetails = lazy(() => import("./pages/admin/team-store/StoreDetails"));
const StoreProducts = lazy(() => import("./pages/admin/team-store/StoreProducts"));
const StoreProductEditor = lazy(() => import("./pages/admin/team-store/StoreProductEditor"));
const StoreOrders = lazy(() => import("./pages/admin/team-store/StoreOrders"));
const StoreOrderDetail = lazy(() => import("./pages/admin/team-store/StoreOrderDetail"));
const StoreOrderCreate = lazy(() => import("./pages/admin/team-store/StoreOrderCreate"));
const StoreLogos = lazy(() => import("./pages/admin/team-store/StoreLogos"));
const StoreBranding = lazy(() => import("./pages/admin/team-store/StoreBranding"));
const StoreMarketing = lazy(() => import("./pages/admin/team-store/StoreMarketing"));
const StoreFulfillment = lazy(() => import("./pages/admin/team-store/StoreFulfillment"));
const StoreSettings = lazy(() => import("./pages/admin/team-store/StoreSettings"));
const StorePersonalization = lazy(() => import("./pages/admin/team-store/StorePersonalization"));
const StoreNamesNumbers = lazy(() => import("./pages/admin/team-store/StoreNamesNumbers"));
const StoreRosters = lazy(() => import("./pages/admin/team-store/StoreRosters"));
const StoreDecorationPricing = lazy(() => import("./pages/admin/team-store/StoreDecorationPricing"));
const StorePromoCodes = lazy(() => import("./pages/admin/team-store/StorePromoCodes"));
const StoreMessagesPage = lazy(() => import("./pages/admin/team-store/StoreMessagesPage"));
const StoreReports = lazy(() => import("./pages/admin/team-store/StoreReports"));
const StoreReportsLanding = lazy(() => import("./pages/admin/team-store/StoreReportsLanding"));

// Admin team-store fulfillment sub-pages
const FulfillmentWorkOrders = lazy(() => import("./pages/admin/team-store/fulfillment/FulfillmentWorkOrders"));
const FulfillmentPacking = lazy(() => import("./pages/admin/team-store/fulfillment/FulfillmentPacking"));
const FulfillmentSupplierPOs = lazy(() => import("./pages/admin/team-store/fulfillment/FulfillmentSupplierPOs"));
const BatchDetail = lazy(() => import("./pages/admin/team-store/fulfillment/BatchDetail"));

// Admin team-store reports sub-pages
const ReportStoreSummary = lazy(() => import("./pages/admin/team-store/reports/ReportStoreSummary"));
const ReportStoreOrders = lazy(() => import("./pages/admin/team-store/reports/ReportStoreOrders"));
const ReportStoreFundraising = lazy(() => import("./pages/admin/team-store/reports/ReportStoreFundraising"));
const ReportStoreFundraisingBatches = lazy(() => import("./pages/admin/team-store/reports/ReportStoreFundraisingBatches"));
const ReportStoreTax = lazy(() => import("./pages/admin/team-store/reports/ReportStoreTax"));
const ReportStoreExport = lazy(() => import("./pages/admin/team-store/reports/ReportStoreExport"));

// Admin global reports sub-pages
const ReportFundraising = lazy(() => import("./pages/admin/reports/ReportFundraising"));
const ReportOrganizations = lazy(() => import("./pages/admin/reports/ReportOrganizations"));
const ReportStores = lazy(() => import("./pages/admin/reports/ReportStores"));
const ReportProducts = lazy(() => import("./pages/admin/reports/ReportProducts"));
const ReportFulfillment = lazy(() => import("./pages/admin/reports/ReportFulfillment"));
const ReportPersonalization = lazy(() => import("./pages/admin/reports/ReportPersonalization"));

const queryClient = new QueryClient();

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <ChatWidgetController />
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/services" element={<Services />} />
              <Route path="/uniforms" element={<Uniforms />} />
              <Route path="/uniforms/:sport" element={<UniformDetail />} />
              <Route path="/team-stores" element={<TeamStores />} />
              <Route path="/team-stores/browse" element={<TeamStoresListing />} />
              <Route path="/team-stores/:slug" element={<TeamStoreDetail />} />
              <Route path="/team-stores/:slug/product/:productId" element={<TeamStoreProductDetail />} />
              <Route path="/team-stores/:slug/cart" element={<TeamStoreCart />} />
              <Route path="/team-stores/:slug/checkout" element={<TeamStoreCheckout />} />
              <Route path="/team-stores/:slug/preview" element={<TeamStorePreview />} />
              <Route path="/fanwear" element={<Fanwear />} />
              <Route path="/corporate" element={<Corporate />} />
              <Route path="/teams-and-leagues" element={<TeamsAndLeagues />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/catalogs" element={<Catalogs />} />
              <Route path="/catalog" element={<PublicCatalog />} />
              <Route path="/catalog/:catalogId" element={<PublicCatalog />} />
              <Route path="/catalog/:catalogId/:styleId" element={<PublicCatalogDetail />} />
              <Route path="/find-your-rep" element={<FindYourRep />} />
              <Route path="/designs" element={<DesignLibrary />} />
              <Route path="/designs/:templateId" element={<DesignCustomizer />} />
              <Route path="/promotional-products" element={<PromotionalProducts />} />
              <Route path="/promotional-products/:productId" element={<PromoProductDetail />} />
              <Route path="/ss-products" element={<SSProducts />} />
              <Route path="/ss-products/:brand" element={<SSBrandProducts />} />
              <Route path="/ss-products/:brand/:category" element={<SSBrandCategoryProducts />} />
              <Route path="/ss-products/:brand/:category/:styleId" element={<SSProductDetail />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/webstore-terms" element={<WebstoreTerms />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/auth" element={<Auth />} />

              {/* Account routes (customer guard) */}
              <Route path="/account/login" element={<AccountLogin />} />
              <Route path="/account/register" element={<AccountRegister />} />
              <Route path="/account" element={<CustomerGuard><AccountDashboard /></CustomerGuard>} />
              <Route path="/account/orders" element={<CustomerGuard><AccountOrders /></CustomerGuard>} />
              <Route path="/account/orders/:id" element={<CustomerGuard><AccountOrderDetail /></CustomerGuard>} />

              {/* Admin routes (admin guard) */}
              <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              <Route path="/admin/customers" element={<AdminGuard><AdminCustomers /></AdminGuard>} />
              <Route path="/admin/customers/:customerId" element={<AdminGuard><AdminCustomerDetail /></AdminGuard>} />
              <Route path="/admin/catalogs" element={<AdminGuard><AdminCatalogs /></AdminGuard>} />
              <Route path="/admin/catalogs/products" element={<AdminGuard><AdminCatalogProducts /></AdminGuard>} />
              <Route path="/admin/flyers" element={<AdminGuard><AdminFlyers /></AdminGuard>} />
              <Route path="/admin/flyers/new" element={<AdminGuard><AdminFlyerNew /></AdminGuard>} />
              <Route path="/admin/reps" element={<AdminGuard><AdminReps /></AdminGuard>} />
              <Route path="/admin/uniforms" element={<AdminGuard><AdminUniforms /></AdminGuard>} />
              <Route path="/admin/catalog/master" element={<AdminGuard><AdminMasterCatalog /></AdminGuard>} />
              <Route path="/admin/catalog/master/brands/:brand" element={<AdminGuard><AdminMasterCatalogBrand /></AdminGuard>} />
              <Route path="/admin/catalog/master/ss/:brand" element={<AdminGuard><AdminMasterCatalogSSBrand /></AdminGuard>} />
              <Route path="/admin/catalog/master/products/:productId" element={<AdminGuard><AdminMasterProductDetail /></AdminGuard>} />
              <Route path="/admin/promo-products" element={<AdminGuard><AdminPromoProducts /></AdminGuard>} />
              <Route path="/admin/champro-orders" element={<AdminGuard><AdminChamproOrders /></AdminGuard>} />
              <Route path="/admin/champro-pricing" element={<AdminGuard><AdminChamproPricing /></AdminGuard>} />
              <Route path="/admin/art-library" element={<AdminGuard><AdminArtLibrary /></AdminGuard>} />
              <Route path="/admin/lookbook" element={<AdminGuard><AdminLookbookGenerator /></AdminGuard>} />
              <Route path="/admin/notifications" element={<AdminGuard><AdminNotifications /></AdminGuard>} />
              <Route path="/admin/messages" element={<AdminGuard><AdminMessageGenerator /></AdminGuard>} />
              <Route path="/admin/orders" element={<AdminGuard><AdminGlobalOrders /></AdminGuard>} />
              <Route path="/admin/fulfillment-batches" element={<AdminGuard><AdminFulfillmentBatches /></AdminGuard>} />
              <Route path="/admin/staff" element={<AdminGuard><AdminStaffUsers /></AdminGuard>} />
              <Route path="/admin/sample-data" element={<AdminGuard><AdminSampleData /></AdminGuard>} />
              <Route path="/admin/team-stores/new" element={<AdminGuard><NewTeamStoreWizard /></AdminGuard>} />

              {/* Admin reports */}
              <Route path="/admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>}>
                <Route index element={null} />
                <Route path="fundraising" element={<ReportFundraising />} />
                <Route path="organizations" element={<ReportOrganizations />} />
                <Route path="stores" element={<ReportStores />} />
                <Route path="products" element={<ReportProducts />} />
                <Route path="fulfillment" element={<ReportFulfillment />} />
                <Route path="personalization" element={<ReportPersonalization />} />
              </Route>

              {/* Admin team-stores section */}
              <Route path="/admin/team-stores" element={<AdminGuard><AdminTeamStores /></AdminGuard>}>
                <Route index element={<TeamStoresDashboard />} />
                <Route path="stores" element={<TeamStoresStores />} />
                <Route path="orders" element={<TeamStoresOrders />} />
                <Route path="logos" element={<TeamStoresLogos />} />
                <Route path="processing" element={<TeamStoresProcessing />} />
                <Route path="fundraising" element={<TeamStoresFundraising />} />
                <Route path="fundraising/:storeId" element={<TeamStoresFundraisingDetail />} />
                <Route path="reports" element={<TeamStoresReports />} />
                <Route path="reports/personalization" element={<PersonalizationReport />} />
                <Route path="settings" element={<TeamStoresSettings />} />
              </Route>

              {/* Admin single team-store detail */}
              <Route path="/admin/team-stores/:storeId" element={<AdminGuard><AdminTeamStoreDetail /></AdminGuard>}>
                <Route index element={<StoreOverview />} />
                <Route path="dashboard" element={<StoreDashboard />} />
                <Route path="details" element={<StoreDetails />} />
                <Route path="products" element={<StoreProducts />} />
                <Route path="products/:productId" element={<StoreProductEditor />} />
                <Route path="orders" element={<StoreOrders />} />
                <Route path="orders/new" element={<StoreOrderCreate />} />
                <Route path="orders/:orderId" element={<StoreOrderDetail />} />
                <Route path="logos" element={<StoreLogos />} />
                <Route path="branding" element={<StoreBranding />} />
                <Route path="marketing" element={<StoreMarketing />} />
                <Route path="fulfillment" element={<StoreFulfillment />} />
                <Route path="fulfillment/work-orders" element={<FulfillmentWorkOrders />} />
                <Route path="fulfillment/packing" element={<FulfillmentPacking />} />
                <Route path="fulfillment/supplier-pos" element={<FulfillmentSupplierPOs />} />
                <Route path="fulfillment/batches/:batchId" element={<BatchDetail />} />
                <Route path="settings" element={<StoreSettings />} />
                <Route path="personalization" element={<StorePersonalization />} />
                <Route path="names-numbers" element={<StoreNamesNumbers />} />
                <Route path="rosters" element={<StoreRosters />} />
                <Route path="decoration-pricing" element={<StoreDecorationPricing />} />
                <Route path="promo-codes" element={<StorePromoCodes />} />
                <Route path="messages" element={<StoreMessagesPage />} />
                <Route path="reports" element={<StoreReports />}>
                  <Route index element={<StoreReportsLanding />} />
                  <Route path="summary" element={<ReportStoreSummary />} />
                  <Route path="orders" element={<ReportStoreOrders />} />
                  <Route path="fundraising" element={<ReportStoreFundraising />} />
                  <Route path="fundraising-batches" element={<ReportStoreFundraisingBatches />} />
                  <Route path="tax" element={<ReportStoreTax />} />
                  <Route path="export" element={<ReportStoreExport />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </HelmetProvider>
  );
}
