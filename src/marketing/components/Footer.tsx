import { Mail, Phone, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation("marketing");
  return (
    <footer className="border-t border-border bg-secondary/30 py-12">
      <div className="container grid gap-8 md:grid-cols-4">
        <div>
          <a href="#" className="flex items-center gap-2 mb-4">
            <span className="text-xl font-extrabold"><span className="text-primary">Edu</span><span className="text-feat-amber-2">Os</span></span>
          </a>
          <p className="text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-4">{t("footer.product")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-primary">{t("footer.productLinks.features")}</a></li>
            <li><a href="#pricing" className="hover:text-primary">{t("footer.productLinks.pricing")}</a></li>
            <li><a href="#demo" className="hover:text-primary">{t("footer.productLinks.demo")}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4">{t("footer.company")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary">{t("footer.companyLinks.about")}</a></li>
            <li><a href="#" className="hover:text-primary">{t("footer.companyLinks.blog")}</a></li>
            <li><a href="#" className="hover:text-primary">{t("footer.companyLinks.contact")}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4">{t("footer.contact")}</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +998 90 123 45 67</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> info@eduos.uz</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {t("footer.address")}</li>
          </ul>
        </div>
      </div>

      <div className="container mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} eduos.uz — {t("footer.rights")}
      </div>
    </footer>
  );
};
