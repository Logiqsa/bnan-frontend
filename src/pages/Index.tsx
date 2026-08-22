import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import VisionMissionValues from "@/components/VisionMissionValues";
import StatsCounter from "@/components/StatsCounter";
import CurriculaShowcase from "@/components/CurriculaShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import AudioTestimonialsSection from "@/components/AudioTestimonialsSection";
import JoinTeacherSection from "@/components/JoinTeacherSection";
import FeaturesSection from "@/components/FeaturesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BNAN Academy | منصة تعليم عن بعد"
        description="منصة BNAN التعليمية الرائدة في التعليم عن بعد و شرح اونلاين للمناهج السعودية والمصرية والخليجية. حصص مباشرة، معلمون متخصصون، تقييمات أسبوعية وشهادات معتمدة."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "BNAN Academy",
          url: "https://bnanacademysa.com",
          inLanguage: "ar",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://bnanacademysa.com/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Navbar />
      <HeroSection />
      <VisionMissionValues />
      <StatsCounter />
      <CurriculaShowcase />
      <TestimonialsSection />
      <AudioTestimonialsSection />
      <JoinTeacherSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
