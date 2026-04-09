import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import schoolLogo from "@/assets/school-logo-optimized.png";

const Footer = () => {
  return (
    <footer className="gradient-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={schoolLogo}
                alt="Logo"
                width="40"
                height="40"
                loading="lazy"
                decoding="async"
                className="h-10 w-10 object-contain brightness-0 invert"
              />
              <h3 className="text-lg font-display font-bold">Bilim Maskani</h3>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              Zamonaviy ta'lim, mustahkam bilim va yorqin kelajak uchun ishlaymiz. 
              O'quvchilarimizning har tomonlama rivojlanishini ta'minlaymiz.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold mb-4">Tezkor havolalar</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/about" className="hover:opacity-100 transition-opacity">Maktab haqida</Link></li>
              <li><Link to="/programs" className="hover:opacity-100 transition-opacity">Ta'lim dasturlari</Link></li>
              <li><Link to="/admissions" className="hover:opacity-100 transition-opacity">Qabul</Link></li>
              <li><Link to="/news" className="hover:opacity-100 transition-opacity">Yangiliklar</Link></li>
              <li><Link to="/gallery" className="hover:opacity-100 transition-opacity">Fotogalereya</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Aloqa</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Toshkent sh., Chilonzor tumani, 12-mavze</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+998 90 123 45 67</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>info@maktab.uz</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Ish vaqti</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Dushanba - Shanba</span>
              </li>
              <li className="pl-6">08:00 - 17:00</li>
              <li className="pl-6 mt-1">Yakshanba - Dam olish kuni</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm opacity-60">
          <p>© 2026 Bilim Maskani maktabi. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
