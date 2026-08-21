import { motion } from "framer-motion";

import w1 from "@/assets/testimonials/whatsapp/wa-1.jpeg";
import w2 from "@/assets/testimonials/whatsapp/wa-2.jpeg";
import w3 from "@/assets/testimonials/whatsapp/wa-3.jpeg";
import w4 from "@/assets/testimonials/whatsapp/wa-4.jpeg";
import w5 from "@/assets/testimonials/whatsapp/wa-5.jpeg";
import w6 from "@/assets/testimonials/whatsapp/wa-6.jpeg";
import w7 from "@/assets/testimonials/whatsapp/wa-7.jpeg";
import w8 from "@/assets/testimonials/whatsapp/wa-8.jpeg";
import w9 from "@/assets/testimonials/whatsapp/wa-9.jpeg";
import w10 from "@/assets/testimonials/whatsapp/wa-10.jpeg";
import w11 from "@/assets/testimonials/whatsapp/wa-11.jpeg";
const images = [w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11];

const WhatsAppTestimonialsMarquee = () => {
  const renderImages = (groupKey: string) =>
    images.map((src, i) => (
      <div
        key={`${groupKey}-${i}`}
        className="shrink-0 rounded-2xl overflow-hidden shadow-md border border-primary/10 bg-card"
      >
        <img
          src={src}
          alt={`رأي عميل واتساب ${i + 1}`}
          loading="eager"
          decoding="async"
          className="block h-[150px] md:h-[180px] w-auto"
        />
      </div>
    ));

  return (
    <section className="py-12 md:py-16 bg-background overflow-hidden" dir="rtl">
      <div className="container mx-auto px-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h3 className="text-2xl md:text-3xl font-cairo font-bold text-foreground mb-2">
            رسائل من قلوب أولياء الأمور
          </h3>
          <p className="text-muted-foreground font-tajawal">
            كلمات شكر وصلتنا عبر الواتساب
          </p>
        </motion.div>
      </div>

      {/* Marquee — isolated overflow */}
      <div className="relative w-full overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-24 bg-gradient-to-r from-background to-transparent z-10" />

        <motion.div
          className="flex w-max gap-4 md:gap-6"
          dir="rtl"
          animate={{ x: ["0%", "50%"] }}
          transition={{
            duration: 75,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          <div className="flex shrink-0 gap-4 md:gap-6">
            {renderImages("first")}
          </div>
          <div className="flex shrink-0 gap-4 md:gap-6" aria-hidden="true">
            {renderImages("second")}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatsAppTestimonialsMarquee;
