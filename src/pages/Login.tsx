import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { dashboardPathByRole, normalizeUserRole } from "@/lib/auth";
import schoolLogo from "@/assets/school-logo-optimized.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Xatolik!",
          description: data.message || "Login yoki parol noto'g'ri.",
          variant: "destructive",
        });
        return;
      }

      const normalizedRole = normalizeUserRole(data?.user?.role);
      const normalizedUser = {
        ...data.user,
        role: normalizedRole,
      };

      localStorage.setItem("auth_token", data.token || data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken);
      }
      localStorage.setItem("auth_user", JSON.stringify(normalizedUser));

      toast({
        title: "Xush kelibsiz!",
        description: `${normalizedRole || data.user.role} sifatida tizimga kirdingiz.`,
      });

      navigate(dashboardPathByRole(normalizedRole), { replace: true });
    } catch (err) {
      toast({
        title: "Xatolik!",
        description: "Server bilan bog'lanib bo'lmadi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
      <section className="py-20 min-h-[70vh] flex items-center">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="text-center mb-8">
              <img
                src={schoolLogo}
                alt="Logo"
                width="64"
                height="64"
                loading="eager"
                decoding="async"
                className="h-16 w-16 mx-auto mb-4"
              />
              <h1 className="text-3xl font-display font-bold text-foreground">Tizimga kirish</h1>
              <p className="text-muted-foreground mt-2">Email va parolingizni kiriting</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        className="pl-10"
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password">Parol</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground font-semibold"
                    disabled={loading}
                  >
                    {loading ? "Kirish..." : "Kirish"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

  );
};

export default Login;
