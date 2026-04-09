import { motion } from "framer-motion";
import { Target, Eye, Heart, Award } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import { Card, CardContent } from "@/components/ui/card";

const leadership = [
  { name: "Abdullayev Karim", role: "Maktab direktori", exp: "25 yil tajriba" },
  { name: "Rahimova Dilnoza", role: "O'quv ishlari bo'yicha direktor o'rinbosari", exp: "18 yil tajriba" },
  { name: "Toshmatov Jasur", role: "Tarbiyaviy ishlar bo'yicha direktor o'rinbosari", exp: "15 yil tajriba" },
];

const teachers = [
  { name: "Karimova Gulnora", subject: "Matematika", qual: "Oliy toifa" },
  { name: "Saidov Bobur", subject: "Fizika", qual: "Oliy toifa" },
  { name: "Umarova Nilufar", subject: "Ingliz tili", qual: "IELTS 8.0" },
  { name: "Xasanov Sardor", subject: "Informatika", qual: "1-toifa" },
  { name: "Rashidova Malika", subject: "Biologiya", qual: "Oliy toifa" },
  { name: "Tursunov Aziz", subject: "Tarix", qual: "PhD" },
];

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            Maktab Haqida
          </motion.h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            35 yillik tajriba, minglab bitiruvchilar va zamonaviy ta'lim an'analari
          </p>
        </div>
      </section>

      {/* History */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <SectionTitle title="Maktab Tarixi" />
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="prose prose-lg max-w-none text-muted-foreground leading-relaxed space-y-4"
            >
              <p>
                Bilim Maskani maktabi 1991 yilda tashkil topgan bo'lib, o'z faoliyati davomida minglab
                iqtidorli o'quvchilarni tarbiyalab, jamiyatga munosib kadrlar yetishtirgan. Maktab o'z
                tarixi davomida bir necha bor davlat mukofotlari bilan taqdirlangan.
              </p>
              <p>
                Bugungi kunda maktabimiz zamonaviy laboratoriyalar, sport zallari, kutubxona va
                multimedia xonalari bilan jihozlangan. 1200 dan ortiq o'quvchi ta'lim olmoqda.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <SectionTitle title="Maqsad va Missiya" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Target, title: "Maqsadimiz", text: "Har bir o'quvchining iqtidorini ro'yobga chiqarish va ularni hayotga tayyorlash." },
              { icon: Eye, title: "Tashabbusimiz", text: "Innovatsion ta'lim usullarini joriy etib, dunyo standartlariga mos ta'lim berish." },
              { icon: Heart, title: "Qadriyatlarimiz", text: "Hurmat, bilim, mehr va mas'uliyat — bizning asosiy tamoyillarimiz." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="h-full text-center">
                  <CardContent className="p-8">
                    <div className="gradient-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Rahbariyat" subtitle="Maktab boshqaruv xodimlari" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {leadership.map((person, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="text-center hover:shadow-elevated transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{person.name}</h3>
                    <p className="text-sm text-primary font-medium mt-1">{person.role}</p>
                    <p className="text-xs text-muted-foreground mt-1">{person.exp}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Teachers */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <SectionTitle title="O'qituvchilar Jamoasi" subtitle="Tajribali va malakali pedagoglarimiz" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {teachers.map((teacher, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="hover:shadow-card transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center shrink-0">
                      <span className="text-secondary-foreground font-bold text-sm">
                        {teacher.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{teacher.name}</h4>
                      <p className="text-xs text-primary">{teacher.subject}</p>
                      <p className="text-xs text-muted-foreground">{teacher.qual}</p>
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

export default About;
