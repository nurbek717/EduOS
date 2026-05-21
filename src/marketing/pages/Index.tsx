import { Navbar } from "@/marketing/components/Navbar";
import { Hero } from "@/marketing/components/Hero";
import { Features } from "@/marketing/components/Features";
import { Demo } from "@/marketing/components/Demo";
import { Solutions } from "@/marketing/components/Solutions";
import { Pricing } from "@/marketing/components/Pricing";
import { FAQ } from "@/marketing/components/FAQ";
import { DemoRegister } from "@/marketing/components/DemoRegister";
import { CTA } from "@/marketing/components/CTA";
import { Footer } from "@/marketing/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Demo />
        <Solutions />
        <Pricing />
        <FAQ />
        <DemoRegister />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
