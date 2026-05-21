import { motion } from "framer-motion";
import { Play, X, BarChart3, Wallet, CalendarCheck, Users, MessageSquare, Shield } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import heroImg from "@/marketing/assets/hero-dashboard.jpg";

const capabilities = [
  { key: "finance", icon: BarChart3 },
  { key: "debt", icon: Wallet },
  { key: "attendance", icon: CalendarCheck },
  { key: "students", icon: Users },
  { key: "sms", icon: MessageSquare },
  { key: "security", icon: Shield },
] as const;

export const Demo = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("marketing");

  return (
    <section id="demo" className="py-24 bg-secondary/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <Play className="h-4 w-4" /> {t("demo.badge")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            {t("demo.titleA")} <span className="gradient-text">{t("demo.titleHighlight")}</span> {t("demo.titleB")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("demo.desc")}
          </p>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-5 items-center">
          <motion.button
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3 group relative block w-full overflow-hidden rounded-3xl ring-1 ring-primary/10 shadow-glow"
            aria-label={t("demo.watchBtn")}
          >
            <img src={heroImg} alt="mySchool demo preview" className="w-full h-auto" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/60 via-primary/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-icon animate-pulse-glow group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 text-primary-foreground fill-primary-foreground ml-1" />
              </span>
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-primary-foreground">
              <div className="text-left">
                <div className="font-bold text-lg">{t("demo.cardTitle")}</div>
                <div className="text-sm opacity-90">{t("demo.cardSub")}</div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-background/95 text-foreground px-4 py-2 text-sm font-semibold">
                {t("demo.watchBtn")}
              </span>
            </div>
          </motion.button>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-2xl font-bold">{t("demo.listTitle")}</h3>
            <ul className="grid gap-3">
              {capabilities.map((c) => (
                <li key={c.key} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-card">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-primary shadow-icon">
                    <c.icon className="h-5 w-5 text-primary-foreground" />
                  </span>
                  <div>
                    <div className="font-semibold">{t(`demo.capabilities.${c.key}.title`)}</div>
                    <div className="text-sm text-muted-foreground">{t(`demo.capabilities.${c.key}.desc`)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="hero" size="xl" className="w-full group" onClick={() => setOpen(true)}>
              <Play className="h-5 w-5 fill-primary-foreground" />
              {t("demo.cta")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-background">
          <DialogTitle className="sr-only">mySchool demo</DialogTitle>
          <div className="relative aspect-video bg-black">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={open ? "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0" : ""}
              title="mySchool demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg hover:bg-background"
            aria-label={t("demo.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
};
