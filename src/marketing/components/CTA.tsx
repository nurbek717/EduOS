import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const CTA = () => {
  const { t } = useTranslation("marketing");
  return (
    <section id="contact" className="py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl gradient-primary p-12 md:p-20 text-center shadow-glow">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-primary-foreground blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-accent blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-extrabold text-primary-foreground mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto mb-8">
              {t("cta.desc")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="secondary" size="xl" className="group" asChild>
                <a href="#demo-register">
                  {t("cta.primary")}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button variant="outline" size="xl" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                <a href="#demo-register">{t("cta.secondary")}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
