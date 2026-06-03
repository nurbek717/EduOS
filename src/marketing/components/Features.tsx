import { motion } from "framer-motion";
import { LayoutDashboard, Wallet, GraduationCap, MessageSquare, ClipboardCheck, Shield, BookOpen, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

const items = [
  { key: "dashboard", icon: LayoutDashboard, gradFrom: "var(--feat-blue-1)",    gradTo: "var(--feat-blue-2)",    glow: "var(--feat-blue-1)" },
  { key: "debt",      icon: Wallet,          gradFrom: "var(--feat-emerald-1)", gradTo: "var(--feat-emerald-2)", glow: "var(--feat-emerald-1)" },
  { key: "academic",  icon: ClipboardCheck,  gradFrom: "var(--feat-violet-1)",  gradTo: "var(--feat-violet-2)",  glow: "var(--feat-violet-1)" },
  { key: "parents",   icon: MessageSquare,   gradFrom: "var(--feat-rose-1)",    gradTo: "var(--feat-rose-2)",    glow: "var(--feat-rose-1)" },
  { key: "finance",   icon: BarChart3,       gradFrom: "var(--feat-amber-1)",   gradTo: "var(--feat-amber-2)",   glow: "var(--feat-amber-1)" },
  { key: "students",  icon: GraduationCap,   gradFrom: "var(--feat-cyan-1)",    gradTo: "var(--feat-cyan-2)",    glow: "var(--feat-cyan-1)" },
  { key: "ejournal",  icon: BookOpen,        gradFrom: "var(--feat-indigo-1)",  gradTo: "var(--feat-indigo-2)",  glow: "var(--feat-indigo-1)" },
  { key: "security",  icon: Shield,          gradFrom: "var(--feat-teal-1)",    gradTo: "var(--feat-teal-2)",    glow: "var(--feat-teal-1)" },
];

export const Features = () => {
  const { t } = useTranslation("marketing");

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            {t("features.badge")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            {t("features.titleA")} <span className="gradient-text">myschool</span>{t("features.titleB")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("features.desc")}
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group relative cursor-not-allowed rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30"
            >
              <div
                className="feature-icon mb-5 relative inline-flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden"
                style={{
                  '--glow': `hsl(${f.glow})`,
                  '--glow-soft': `hsl(${f.glow} / 0.55)`,
                  '--glow-strong': `hsl(${f.glow} / 0.85)`,
                } as React.CSSProperties}
              >
                <span
                  aria-hidden
                  className="feature-icon__gradient absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, hsl(${f.gradFrom}), hsl(${f.gradTo}))`,
                  }}
                />
                <f.icon className="relative h-7 w-7 text-white drop-shadow-sm" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t(`features.items.${f.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`features.items.${f.key}.desc`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
