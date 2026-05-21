import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import directorsImg from "@/marketing/assets/solution-directors.jpg";
import accountantsImg from "@/marketing/assets/solution-accountants.jpg";
import teachersImg from "@/marketing/assets/solution-teachers.jpg";

const blocks = [
  { key: "directors", reverse: false, img: directorsImg },
  { key: "accountants", reverse: true, img: accountantsImg },
  { key: "teachers", reverse: false, img: teachersImg },
] as const;

export const Solutions = () => {
  const { t } = useTranslation("marketing");

  return (
    <section id="solutions" className="py-24 bg-secondary/40">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-4 py-1.5 text-sm font-medium text-primary mb-4">
            {t("solutions.badge")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            {t("solutions.titleA")} <span className="gradient-text">{t("solutions.titleHighlight")}</span>
          </h2>
        </div>

        <div className="space-y-20">
          {blocks.map((b) => {
            const bullets = [
              t(`solutions.blocks.${b.key}.b1`),
              t(`solutions.blocks.${b.key}.b2`),
              t(`solutions.blocks.${b.key}.b3`),
            ];
            return (
              <motion.div
                key={b.key}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className={`grid items-center gap-10 lg:grid-cols-2 ${b.reverse ? "lg:[&>div:first-child]:order-2" : ""}`}
              >
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary mb-4">
                    {t(`solutions.blocks.${b.key}.tag`)}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-extrabold mb-4">{t(`solutions.blocks.${b.key}.title`)}</h3>
                  <p className="text-lg text-muted-foreground mb-6">{t(`solutions.blocks.${b.key}.desc`)}</p>
                  <ul className="space-y-3">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full gradient-primary">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </span>
                        <span className="font-medium">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary-glow/10 border border-primary/10 p-3 shadow-card overflow-hidden">
                    <img
                      src={b.img}
                      alt={t(`solutions.blocks.${b.key}.title`)}
                      width={1024}
                      height={768}
                      loading="lazy"
                      className="h-full w-full rounded-2xl object-cover shadow-card"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
