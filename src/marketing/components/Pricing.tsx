import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const plans = [
  { key: "start", name: "Start", price: "299 000", popular: false, featureKeys: ["f1", "f2", "f3", "f4"] },
  { key: "pro", name: "Pro", price: "599 000", popular: true, featureKeys: ["f1", "f2", "f3", "f4", "f5"] },
  { key: "premium", name: "Premium", price: null, popular: false, featureKeys: ["f1", "f2", "f3", "f4", "f5"] },
] as const;

export const Pricing = () => {
  const { t } = useTranslation("marketing");

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            {t("pricing.badge")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            {t("pricing.titleA")} <span className="gradient-text">{t("pricing.titleHighlight")}</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("pricing.desc")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-3xl p-8 ${
                p.popular
                  ? "gradient-primary text-primary-foreground shadow-glow scale-105"
                  : "bg-card border border-border shadow-card"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-bold text-primary shadow-card">
                  <Sparkles className="h-3 w-3" /> {t("pricing.popular")}
                </div>
              )}
              <div className="mb-2 text-sm font-semibold opacity-80">{t(`pricing.plans.${p.key}.desc`)}</div>
              <h3 className="text-2xl font-extrabold mb-4">{p.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{p.price ?? t("pricing.negotiable")}</span>
                {p.price && <span className="opacity-70 ml-1">{t("pricing.perMonth")}</span>}
              </div>
              <Button
                variant={p.popular ? "secondary" : "hero"}
                className="w-full mb-6"
                size="lg"
                asChild
              >
                <a href="#demo-register">{t("pricing.select")}</a>
              </Button>
              <ul className="space-y-3">
                {p.featureKeys.map((fk) => (
                  <li key={fk} className="flex items-center gap-3 text-sm">
                    <Check className={`h-4 w-4 shrink-0 ${p.popular ? "" : "text-primary"}`} />
                    <span>{t(`pricing.plans.${p.key}.${fk}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
