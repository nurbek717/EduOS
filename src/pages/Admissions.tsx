import { motion } from "framer-motion";
import { FileText, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const requirements = [
  "Tug'ilganlik haqida guvohnoma nusxasi",
  "Ota-onaning pasporti nusxasi",
  "Tibbiy ma'lumotnoma (086-shakl)",
  "3x4 hajmda 4 dona fotosurat",
  "Oldingi maktabdan ko'chirma (o'tkazish uchun)",
  "JSHSHIR (identifikatsiya raqami)",
];

const Admissions = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      title: "Ariza qabul qilindi!",
      description: "Tez orada siz bilan bog'lanamiz.",
    });
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
            Qabul
          </motion.h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Maktabga qabul jarayoni va ariza topshirish
          </p>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <SectionTitle title="Kerakli Hujjatlar" centered={false} />
              <div className="space-y-3">
                {requirements.map((req, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{req}</span>
                  </motion.div>
                ))}
              </div>

              <Card className="mt-8">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">Qabul jarayoni</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Onlayn ariza to'ldiring</li>
                    <li>Hujjatlarni tayyorlang</li>
                    <li>Suhbatga keling</li>
                    <li>Natijani kuting (3-5 ish kuni)</li>
                    <li>Shartnoma imzolang</li>
                  </ol>
                </CardContent>
              </Card>
            </div>

            {/* Form */}
            <div>
              <SectionTitle title="Ariza Topshirish" centered={false} />
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <CheckCircle className="h-16 w-16 text-secondary mx-auto mb-4" />
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">Ariza qabul qilindi!</h3>
                  <p className="text-muted-foreground">Tez orada siz bilan bog'lanamiz.</p>
                  <Button className="mt-6" onClick={() => setSubmitted(false)}>Yangi ariza</Button>
                </motion.div>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="childName">O'quvchi ismi *</Label>
                          <Input id="childName" placeholder="Ism familiya" required />
                        </div>
                        <div>
                          <Label htmlFor="birthDate">Tug'ilgan sana *</Label>
                          <Input id="birthDate" type="date" required />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="grade">Sinf *</Label>
                        <Select required>
                          <SelectTrigger>
                            <SelectValue placeholder="Sinfni tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 11 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}-sinf</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="parentName">Ota-ona ismi *</Label>
                          <Input id="parentName" placeholder="Ism familiya" required />
                        </div>
                        <div>
                          <Label htmlFor="phone">Telefon raqam *</Label>
                          <Input id="phone" type="tel" placeholder="+998 90 123 45 67" required />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Elektron pochta</Label>
                        <Input id="email" type="email" placeholder="email@example.com" />
                      </div>
                      <div>
                        <Label htmlFor="message">Qo'shimcha ma'lumot</Label>
                        <Textarea id="message" placeholder="Izoh yoki savol..." rows={3} />
                      </div>
                      <Button type="submit" size="lg" className="w-full gradient-secondary text-secondary-foreground font-semibold">
                        Ariza topshirish
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Admissions;
