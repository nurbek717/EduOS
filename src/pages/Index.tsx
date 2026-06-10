import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, Award, Calendar, ArrowRight, Bell, GraduationCap, Trophy } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImg from "@/assets/school-hero-optimized.jpg";

const announcements = [
  { id: 1, date: "2026-03-05", title: "Bahorgi ta'til jadvali e'lon qilindi", category: "E'lon" },
  { id: 2, date: "2026-03-03", title: "Matematika olimpiadasi g'oliblari aniqlandi", category: "Yangilik" },
  { id: 3, date: "2026-02-28", title: "Ota-onalar yig'ilishi - 15 mart", category: "Tadbir" },
  { id: 4, date: "2026-02-25", title: "Yangi sport zali ochildi", category: "Yangilik" },
];

const services = [
  { icon: BookOpen, title: "Zamonaviy ta'lim", desc: "Davlat standartlariga mos, innovatsion o'quv dasturlari" },
  { icon: Users, title: "Tajribali o'qituvchilar", desc: "Yuqori malakali va tajribali pedagoglar jamoasi" },
  { icon: Trophy, title: "Olimpiadalar", desc: "Respublika va xalqaro olimpiadalarda ishtirok" },
  { icon: GraduationCap, title: "Qo'shimcha darslar", desc: "To'garaklar, sport sektsiyalari va til kurslari" },
];

const stats = [
  { value: "1200+", label: "O'quvchilar" },
  { value: "85", label: "O'qituvchilar" },
  { value: "35+", label: "Yillik tajriba" },
  { value: "98%", label: "Natija" },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px] flex items-center">
        <img
          src={heroImg}
          alt="Maktab binosi"
          width="1600"
          height="1067"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative container mx-auto px-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4 leading-tight">
              Bilim — Kelajak Kaliti
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed font-medium">
              Zamonaviy ta'lim muhitida farzandlaringizning har tomonlama rivojlanishini ta'minlaymiz. 
              EduOs maktabiga xush kelibsiz!
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground font-semibold text-base px-8 shadow-glow">
                <Link to="/admissions">Qabul haqida</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/30 text-primary bg-white/50 hover:bg-white/80 font-semibold text-base px-8">
                <Link to="/about">Batafsil</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="gradient-primary -mt-16 relative z-20">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-xl shadow-elevated p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary font-display">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Yangiliklar va E'lonlar" subtitle="Maktabdagi so'nggi yangiliklar va muhim e'lonlar" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {announcements.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="hover:shadow-elevated transition-shadow cursor-pointer group">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="gradient-accent rounded-lg p-2.5 shrink-0">
                      <Bell className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-secondary">{item.category}</span>
                      <h3 className="font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild variant="outline">
              <Link to="/news">Barcha yangiliklar <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <SectionTitle title="Bizning Xizmatlar" subtitle="Maktabimizning asosiy yo'nalishlari va imkoniyatlari" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full text-center hover:shadow-elevated transition-all hover:-translate-y-1">
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="gradient-primary rounded-xl p-4 mb-4">
                      <service.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground">{service.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-primary/5 border border-primary/10 rounded-2xl p-10 md:p-16 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Farzandingizning kelajagini birga quramiz
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 font-medium">
              Maktabimizga qabul jarayoni boshlandi. Hoziroq ariza topshiring va zamonaviy ta'lim imkoniyatlaridan foydalaning.
            </p>
            <Button asChild size="lg" className="gradient-primary text-primary-foreground font-semibold text-base px-10 shadow-glow">
              <Link to="/admissions">Ariza topshirish</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
