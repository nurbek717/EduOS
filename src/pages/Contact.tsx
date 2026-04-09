import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const contactInfo = [
  { icon: MapPin, label: "Manzil", value: "Toshkent sh., Chilonzor tumani, 12-mavze, 45-uy" },
  { icon: Phone, label: "Telefon", value: "+998 90 123 45 67", href: "tel:+998901234567" },
  { icon: Mail, label: "Elektron pochta", value: "info@maktab.uz", href: "mailto:info@maktab.uz" },
  { icon: Clock, label: "Ish vaqti", value: "Dushanba - Shanba, 08:00 - 17:00" },
];

const Contact = () => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: "Xabar yuborildi!", description: "Tez orada javob beramiz." });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <Layout>
      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            Aloqa
          </motion.h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Biz bilan bog'laning — savollaringizga javob beramiz
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact info */}
            <div>
              <SectionTitle title="Aloqa Ma'lumotlari" centered={false} />
              <div className="space-y-4 mb-8">
                {contactInfo.map((info, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="gradient-primary rounded-lg p-3 shrink-0">
                          <info.icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{info.label}</p>
                          {info.href ? (
                            <a href={info.href} className="font-medium text-foreground hover:text-primary transition-colors">
                              {info.value}
                            </a>
                          ) : (
                            <p className="font-medium text-foreground text-sm">{info.value}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Map placeholder */}
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-sm">Xarita</p>
                      <p className="text-xs">Toshkent sh., Chilonzor tumani</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact form */}
            <div>
              <SectionTitle title="Xabar Yuborish" centered={false} />
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Ismingiz *</Label>
                        <Input id="name" placeholder="Ism familiya" required />
                      </div>
                      <div>
                        <Label htmlFor="contactEmail">Elektron pochta *</Label>
                        <Input id="contactEmail" type="email" placeholder="email@example.com" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="subject">Mavzu</Label>
                      <Input id="subject" placeholder="Xabar mavzusi" />
                    </div>
                    <div>
                      <Label htmlFor="contactMessage">Xabar *</Label>
                      <Textarea id="contactMessage" placeholder="Xabaringizni yozing..." rows={5} required />
                    </div>
                    <Button type="submit" size="lg" className="w-full gradient-primary text-primary-foreground font-semibold" disabled={sending}>
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? "Yuborilmoqda..." : "Yuborish"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
