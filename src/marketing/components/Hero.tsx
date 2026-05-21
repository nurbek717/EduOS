import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BarChart3, Wallet, CalendarCheck, Users, GraduationCap, MessageSquare, BookOpen, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import heroImg from "@/marketing/assets/hero-laptop.png";

export const Hero = () => {
  const { t } = useTranslation("marketing");

  return (
    <section className="relative overflow-hidden gradient-soft pt-16 pb-24 md:pt-17 md:pb-32">
      <div className="absolute inset-0 -z-10 opacity-60">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <motion.div
        className="container grid items-center gap-12 lg:grid-cols-2"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
        }}
      >
        <motion.div className="relative z-10">
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6"
          >
            <Sparkles className="h-4 w-4" /> {t("hero.badge")}
          </motion.div>
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight"
          >
            {t("hero.titleA")} <span className="gradient-text">{t("hero.titleHighlight")}</span> {t("hero.titleB")}
          </motion.h1>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed"
          >
            {t("hero.desc")}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Button variant="hero" size="xl" className="group" asChild>
              <a href="#demo-register">
                {t("hero.start")}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button variant="outline" size="xl" asChild><a href="#demo">{t("hero.watchDemo")}</a></Button>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-10 flex items-center gap-8"
          >
            <div>
              <div className="text-3xl font-extrabold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">{t("hero.schools")}</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <div className="text-3xl font-extrabold text-primary">120k+</div>
              <div className="text-sm text-muted-foreground">{t("hero.students")}</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <div className="text-3xl font-extrabold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">{t("hero.uptime")}</div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[940px] aspect-[1280/896] lg:aspect-auto lg:h-full"
        >
          <img
            src={heroImg}
            alt="School CRM dashboard"
            width={1280}
            height={896}
            className="absolute inset-0 w-full h-full object-contain z-10"
          />

          {/*
            Icon positions are expressed as % of the laptop wrapper so they
            scale together with the image at every breakpoint.
          */}
          {[
            { Icon: BarChart3,    cls: "top-[12%] left-[8%]",     gradFrom: "var(--feat-blue-1)",    gradTo: "var(--feat-blue-2)",    dur: 7.5 },
            { Icon: TrendingUp,   cls: "top-[8%]  right-[10%]",   gradFrom: "var(--feat-emerald-1)", gradTo: "var(--feat-emerald-2)", dur: 8.5 },
            { Icon: Wallet,       cls: "bottom-[14%] right-[6%]", gradFrom: "var(--feat-violet-1)",  gradTo: "var(--feat-violet-2)",  dur: 9 },
            { Icon: Users,        cls: "bottom-[26%] left-[6%]",  gradFrom: "var(--feat-rose-1)",    gradTo: "var(--feat-rose-2)",    dur: 8 },
          ].map(({ Icon, cls, gradFrom, gradTo, dur }, i) => {
            // Stagger entrance + ambient float so each icon takes its turn
            const enterDelay = 0.5 + i * 0.18;
            const floatDelay = i * 0.6;
            return (
              <motion.div
                key={i}
                className={`absolute ${cls} z-20 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl shadow-icon will-change-transform`}
                style={{
                  background: `linear-gradient(135deg, hsl(${gradFrom}), hsl(${gradTo}))`,
                }}
                initial={{ opacity: 0, scale: 0.4, y: 20 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -14, 0, 6, 0],
                  x: [0, 4, 0, -4, 0],
                  rotate: [0, 4, 0, -4, 0],
                }}
                transition={{
                  opacity: { duration: 0.6, delay: enterDelay, ease: "easeOut" },
                  scale:   { duration: 0.7, delay: enterDelay, ease: [0.34, 1.56, 0.64, 1] },
                  y:       { duration: dur,       repeat: Infinity, ease: "easeInOut", delay: floatDelay },
                  x:       { duration: dur + 1.5, repeat: Infinity, ease: "easeInOut", delay: floatDelay },
                  rotate:  { duration: dur + 2,   repeat: Infinity, ease: "easeInOut", delay: floatDelay },
                }}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow" />
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
};
