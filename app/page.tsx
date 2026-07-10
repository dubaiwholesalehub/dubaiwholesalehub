import Header from "@/components/layout/header";
import Hero from "@/components/home/hero";
import SearchSection from "@/components/home/SearchSection";
import Footer from "@/components/layout/footer";
import CategoryGrid from "@/components/home/CategoryGrid";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Stats from "@/components/home/Stats";
import ExportMarkets from "@/components/home/ExportCountries";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import RequestQuoteCTA from "@/components/home/RequestQuoteCTA";

export default function Home() {
  return (
    <>
      <Header />

      <Hero />

      <SearchSection />

      <CategoryGrid />

      <WhyChooseUs />

      <Stats />

      <ExportMarkets />

      <FeaturedProducts />

      <RequestQuoteCTA />

      <Footer />
    </>
  );
}