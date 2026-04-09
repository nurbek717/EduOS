import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { useAppLocale } from "@/context/LanguageContext";

const events = [
  { id: 1, date: "2026-03-15", time: "14:00", title: "Ota-onalar yig'ilishi", location: "Asosiy zal", type: "Yig'ilish" },
  { id: 2, date: "2026-03-20", time: "10:00", title: "Bahorgi ta'til boshlanishi", location: "Maktab", type: "Ta'til" },
  { id: 3, date: "2026-04-01", time: "08:00", title: "Darslar qayta boshlanadi", location: "Maktab", type: "Ta'lim" },
  { id: 4, date: "2026-04-10", time: "09:00", title: "Fan olimpiadasi", location: "3-qavat laboratoriya", type: "Musobaqa" },
  { id: 5, date: "2026-04-22", time: "15:00", title: "Sport musobaqalari", location: "Sport maydoni", type: "Sport" },
  { id: 6, date: "2026-05-01", time: "10:00", title: "Mehnat bayrami tadbiri", location: "Asosiy zal", type: "Bayram" },
  { id: 7, date: "2026-05-25", time: "11:00", title: "So'nggi qo'ng'iroq marosimi", location: "Hovli", type: "Marosim" },
];

const Events = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const locale = useAppLocale();

  return (
    <Layout>
      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            Tadbirlar Kalendari
          </motion.h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Maktabda rejalashtirilgan tadbirlar va muhim sanalar
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Calendar */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Events list */}
            <div className="lg:col-span-2">
              <SectionTitle title="Kelgusi Tadbirlar" centered={false} />
              <div className="space-y-4">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card className="hover:shadow-card transition-shadow">
                      <CardContent className="p-5 flex items-center gap-5">
                        <div className="gradient-primary rounded-xl p-3 text-center min-w-[70px]">
                          <div className="text-2xl font-bold text-primary-foreground">
                            {event.date.split("-")[2]}
                          </div>
                          <div className="text-xs text-primary-foreground/80 uppercase">
                            {new Date(event.date).toLocaleDateString(locale, { month: "short" })}
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-secondary">{event.type}</span>
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {event.time}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Events;
