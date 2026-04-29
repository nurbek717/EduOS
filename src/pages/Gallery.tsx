import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";

const galleryItems = [
  { id: 1, title: "Maktab binosi", category: "Maktab", color: "from-primary to-secondary" },
  { id: 2, title: "Sport musobaqalari", category: "Sport", color: "from-secondary to-primary" },
  { id: 3, title: "Laboratoriya mashg'ulotlari", category: "Ta'lim", color: "from-accent to-secondary" },
  { id: 4, title: "Kutubxona", category: "Maktab", color: "from-primary to-accent" },
  { id: 5, title: "Ilmiy konferensiya", category: "Tadbir", color: "from-secondary to-accent" },
  { id: 6, title: "Madaniy tadbir", category: "Tadbir", color: "from-accent to-primary" },
  { id: 7, title: "Kompyuter sinfi", category: "Ta'lim", color: "from-primary to-secondary" },
  { id: 8, title: "So'nggi qo'ng'iroq", category: "Marosim", color: "from-secondary to-primary" },
  { id: 9, title: "Bayram tadbiri", category: "Tadbir", color: "from-accent to-secondary" },
];

const categories = ["Barchasi", "Maktab", "Ta'lim", "Sport", "Tadbir", "Marosim"];

const Gallery = () => {
  const [filter, setFilter] = useState("Barchasi");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = filter === "Barchasi" ? galleryItems : galleryItems.filter(i => i.category === filter);

  return (
    <Layout>
      <section className="gradient-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            Fotogalereya
          </motion.h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Maktab hayotidan fotosuratlar
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setLightbox(item.id)}
                  className="cursor-pointer group"
                >
                  <div className={`aspect-[4/3] rounded-xl bg-gradient-to-br ${item.color} relative overflow-hidden`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-primary-foreground/30 font-display text-6xl font-bold">
                        {item.id}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-end">
                      <div className="p-4 w-full translate-y-full group-hover:translate-y-0 transition-transform">
                        <span className="text-xs text-primary-foreground/80">{item.category}</span>
                        <h3 className="text-primary-foreground font-semibold">{item.title}</h3>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-4 right-4 text-primary-foreground" onClick={() => setLightbox(null)}>
              <X className="h-8 w-8" />
            </button>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="max-w-3xl w-full"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const item = galleryItems.find(i => i.id === lightbox);
                if (!item) return null;
                return (
                  <div className={`aspect-video rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                    <div className="text-center">
                      <span className="text-primary-foreground/30 font-display text-8xl font-bold">{item.id}</span>
                      <h3 className="text-2xl text-primary-foreground font-display font-bold mt-4">{item.title}</h3>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Gallery;
