import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/marketing/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";

const DEMO_HREF = "#demo-register";

const handleSmoothScroll = (
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onNavigate?: () => void,
) => {
  if (!href.startsWith("#")) return;
  const id = href.slice(1);
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    onNavigate?.();
  }
};

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("marketing");

  const links = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.solutions"), href: "#solutions" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.faq"), href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-18 items-center justify-between py-4">
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-icon">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            my<span className="text-primary">school</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleSmoothScroll(e, l.href)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <Button asChild>
            <a href="/login">{t("nav.login")}</a>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <Button asChild>
            <a href="/login">{t("nav.login")}</a>
          </Button>
          <button
            className="p-2"
            onClick={() => setOpen(!open)}
            aria-label={t("nav.menu")}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/40 bg-background">
          <div className="container py-4 flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-base font-medium text-muted-foreground"
                onClick={(e) => handleSmoothScroll(e, l.href, () => setOpen(false))}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
