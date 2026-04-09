import { motion } from "framer-motion";
import { BookOpen, Beaker, Globe, Calculator, Palette, Dumbbell, Music, Code } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const subjects = [
  { icon: Calculator, name: "Matematika", desc: "Algebra, geometriya, statistika" },
  { icon: Beaker, name: "Tabiiy fanlar", desc: "Fizika, kimyo, biologiya" },
  { icon: Globe, name: "Tillar", desc: "O'zbek tili, rus tili, ingliz tili" },
  { icon: BookOpen, name: "Ijtimoiy fanlar", desc: "Tarix, geografiya, huquq" },
  { icon: Code, name: "Informatika", desc: "Dasturlash, kompyuter savodxonligi" },
  { icon: Palette, name: "San'at", desc: "Tasviriy san'at, musiqa, teatr" },
];

const clubs = [
  { icon: Dumbbell, name: "Sport", items: ["Futbol", "Basketbol", "Voleybol", "Yengil atletika", "Shaxmat"] },
  { icon: Code, name: "Texnologiya", items: ["Robototexnika", "Dasturlash", "3D modellashtirish"] },
  { icon: Palette, name: "San'at", items: ["Rasmchilik", "Xattotlik", "Foto studiya"] },
  { icon: Music, name: "Musiqa", items: ["Xor", "Milliy cholg'u", "Gitara"] },
];

const grades = [
  { grade: "1-4 sinflar", focus: "Boshlang'ich ta'lim", subjects: "Ona tili, matematika, tabiat, san'at, jismoniy tarbiya" },
  { grade: "5-9 sinflar", focus: "Asosiy ta'lim", subjects: "Barcha asosiy fanlar, chet tillari, informatika" },
  { grade: "10-11 sinflar", focus: "O'rta ta'lim", subjects: "Ixtisoslashtirilgan fanlar, oliy ta'limga tayyorlov" },
];

const Programs = () => {
  return (
    <Layout>
      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            Ta'lim Dasturlari
          </motion.h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Zamonaviy o'quv dasturlari va qo'shimcha ta'lim imkoniyatlari
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="subjects" className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-10">
              <TabsTrigger value="subjects">O'quv fanlari</TabsTrigger>
              <TabsTrigger value="grades">Sinflar</TabsTrigger>
              <TabsTrigger value="clubs">To'garaklar</TabsTrigger>
            </TabsList>

            <TabsContent value="subjects">
              <SectionTitle title="O'quv Fanlari" subtitle="Maktabda o'qitiladigan asosiy fanlar" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subj, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-elevated transition-all hover:-translate-y-1">
                      <CardContent className="p-6 flex items-start gap-4">
                        <div className="gradient-primary rounded-lg p-3 shrink-0">
                          <subj.icon className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{subj.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{subj.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="grades">
              <SectionTitle title="Sinflar Bo'yicha" subtitle="Har bir bosqich uchun ta'lim dasturlari" />
              <div className="space-y-6">
                {grades.map((g, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="gradient-secondary rounded-xl px-5 py-3 text-center shrink-0">
                            <span className="text-secondary-foreground font-bold text-lg">{g.grade}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">{g.focus}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{g.subjects}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="clubs">
              <SectionTitle title="To'garaklar va Seksiyalar" subtitle="Qo'shimcha darslar va bo'sh vaqtni foydali o'tkazish" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {clubs.map((club, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="gradient-accent rounded-lg p-2.5">
                            <club.icon className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <h3 className="font-semibold text-foreground text-lg">{club.name}</h3>
                        </div>
                        <ul className="space-y-2">
                          {club.items.map((item, j) => (
                            <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Programs;
