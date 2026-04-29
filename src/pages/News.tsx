import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const newsItems = [
  {
    id: 1, date: "2026-03-05", category: "Ta'lim",
    title: "Matematika olimpiadasi g'oliblari",
    summary: "Maktabimiz o'quvchilari respublika matematika olimpiadasida 3 ta oltin va 5 ta kumush medal qo'lga kiritdi."
  },
  {
    id: 2, date: "2026-03-01", category: "Sport",
    title: "Yangi sport zali ochildi",
    summary: "Zamonaviy sport jihozlari bilan ta'minlangan yangi sport zali o'quvchilar uchun ochildi."
  },
  {
    id: 3, date: "2026-02-25", category: "Tadbir",
    title: "Ilmiy konferensiya o'tkazildi",
    summary: "O'quvchilarning ilmiy-tadqiqot ishlari bo'yicha yillik konferensiya muvaffaqiyatli o'tkazildi."
  },
  {
    id: 4, date: "2026-02-20", category: "E'lon",
    title: "Bahorgi ta'til jadvali",
    summary: "2026-yil bahorgi ta'til 20-martdan 1-aprelgacha davom etadi. Barcha o'quvchilarga yoqimli dam olish tilaymiz."
  },
  {
    id: 5, date: "2026-02-15", category: "Ta'lim",
    title: "Yangi kompyuter laboratoriyasi",
    summary: "30 ta zamonaviy kompyuter bilan jihozlangan yangi laboratoriya foydalanishga topshirildi."
  },
  {
    id: 6, date: "2026-02-10", category: "Hamkorlik",
    title: "Xalqaro hamkorlik shartnomasi",
    summary: "Turkiya va Janubiy Koreyaning yetakchi maktablari bilan hamkorlik shartnomasi imzolandi."
  },
];

const categoryColors: Record<string, string> = {
  "Ta'lim": "bg-primary text-primary-foreground",
  "Sport": "bg-secondary text-secondary-foreground",
  "Tadbir": "gradient-accent text-accent-foreground",
  "E'lon": "bg-destructive text-destructive-foreground",
  "Hamkorlik": "bg-muted text-foreground",
};

const News = () => {
  return (
    <Layout>
      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            Yangiliklar
          </motion.h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Maktabdagi so'nggi yangiliklar, e'lonlar va press-relizlar
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-6">
            {newsItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="hover:shadow-elevated transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={categoryColors[item.category] || "bg-muted"}>
                            {item.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {item.date}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">{item.summary}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default News;
