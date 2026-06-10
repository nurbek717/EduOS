import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, Mail, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import schoolLogo from "@/assets/eduos-logo.png";

const navLinks = [
  { label: "Bosh sahifa", path: "/" },
  { label: "Maktab haqida", path: "/about" },
  { label: "Ta'lim dasturlari", path: "/programs" },
  { label: "Yangiliklar", path: "/news" },
  { label: "Tadbirlar", path: "/events" },
  { label: "Qabul", path: "/admissions" },
  { label: "Galereya", path: "/gallery" },
  { label: "Aloqa", path: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Top bar */}
      <div className="gradient-primary text-primary-foreground">
        <div className="container mx-auto flex items-center justify-between px-4 py-2 text-sm">
          <div className="flex items-center gap-4">
            <a href="tel:+998901234567" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
              <Phone className="h-3.5 w-3.5" />
              <span>+998 90 123 45 67</span>
            </a>
            <a href="mailto:info@maktab.uz" className="hidden sm:flex items-center gap-1 hover:opacity-80 transition-opacity">
              <Mail className="h-3.5 w-3.5" />
              <span>info@maktab.uz</span>
            </a>
          </div>
          <Link to="/login" className="hover:opacity-80 transition-opacity font-medium">
            Kirish
          </Link>
        </div>
      </div>

      {/* Main nav */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b shadow-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={schoolLogo}
              alt="EduOs Logo"
              width="48"
              height="48"
              loading="eager"
              decoding="async"
              className="h-12 w-12 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold font-display text-foreground leading-tight tracking-tight">EduOs</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Education System</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Menyu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t bg-card"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === link.path
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Header;
