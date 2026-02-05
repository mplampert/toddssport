import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { promoAPI } from "@/lib/promo-api";
import { ProductDetailCard } from "@/components/promo/ProductDetailCard";
import { GHLQuoteForm } from "@/components/shared/GHLQuoteForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function PromoProductDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["promo-product", id],
    queryFn: () => promoAPI.getProduct(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-secondary border-b">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <Link to="/promotional-products" className="hover:text-foreground transition-colors">Promotional Products</Link>
              <span>/</span>
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {product?.name || id}
              </span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link to="/promotional-products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>

          {isLoading && <ProductDetailSkeleton />}

          {error && (
            <div className="text-center py-16 space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Product Not Found</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't load this product. It may no longer be available or the link may be incorrect.
              </p>
              <Button asChild>
                <Link to="/promotional-products">Browse All Products</Link>
              </Button>
            </div>
          )}

          {product && <ProductDetailCard product={product} />}
        </div>

        {/* Quote Form CTA */}
        {product && (
          <GHLQuoteForm
            heading="Request a Quote for This Product"
            subheading={`Interested in ${product.name}? Fill out the form below and our team will get back to you with custom pricing and options.`}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <Skeleton className="lg:w-1/2 aspect-square rounded-lg" />
        <div className="lg:w-1/2 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
