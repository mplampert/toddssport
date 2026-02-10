import { Helmet } from "react-helmet-async";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DesignLibraryHero } from "@/components/designs/DesignLibraryHero";
import { DesignGrid } from "@/components/designs/DesignGrid";

export default function DesignLibrary() {
  return (
    <>
      <Helmet>
        <title>Design Library | Todd's Sporting Goods</title>
        <meta
          name="description"
          content="Browse hundreds of custom fanwear designs for teams, events, slogans, and more. Classic, bold, retro, and popular styles available."
        />
      </Helmet>
      <Header />
      <main>
        <DesignLibraryHero />
        <DesignGrid />
      </main>
      <Footer />
    </>
  );
}
