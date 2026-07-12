import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Playbook } from "@/components/landing/playbook";
import { Pricing } from "@/components/landing/pricing";
import { ProductScreenshot } from "@/components/landing/product-screenshot";
import { QuoteBand } from "@/components/landing/quote-band";

export default function Home() {
  return (
    <main>
      <Hero />
      <QuoteBand />
      <ProductScreenshot />
      <HowItWorks />
      <Playbook />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
}
