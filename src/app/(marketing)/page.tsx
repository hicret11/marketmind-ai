import { Hero } from "@/components/landing/hero";
import { FeatureNetwork } from "@/components/landing/feature-network";
import { Workflow } from "@/components/landing/workflow";
import { OpportunityShowcase } from "@/components/landing/opportunity-showcase";
import { MemorySection } from "@/components/landing/memory-section";
import { DataPreview } from "@/components/landing/data-preview";
import { SocialPreview } from "@/components/landing/social-preview";
import { AiStudioPreview } from "@/components/landing/ai-studio-preview";
import { Vision } from "@/components/landing/vision";
import { FinalCta } from "@/components/landing/final-cta";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureNetwork />
      <Workflow />
      <OpportunityShowcase />
      <MemorySection />
      <DataPreview />
      <SocialPreview />
      <AiStudioPreview />
      <Vision />
      <FinalCta />
    </>
  );
}
