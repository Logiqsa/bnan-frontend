import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import VisionMissionValues from "@/components/VisionMissionValues";
import StatsCounter from "@/components/StatsCounter";
import CurriculaShowcase from "@/components/CurriculaShowcase";
import JoinTeacherSection from "@/components/JoinTeacherSection";
import FeaturesSection from "@/components/FeaturesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import AnnouncementBanner from "@/components/AnnouncementBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BNAN Academy | منصة تعليم عن بعد"
        description="منصة BNAN التعليمية الرائدة في التعليم عن بعد وشرح أونلاين للمناهج السعودية والمصرية والخليجية. حصص مباشرة، معلمون متخصصون، واجبات وتسجيلات وشهادات معتمدة."
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
      <AnnouncementBanner />
      <Navbar inFlow />
      <HeroSection />
      <VisionMissionValues />
      <StatsCounter />
      <CurriculaShowcase />
      <JoinTeacherSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
