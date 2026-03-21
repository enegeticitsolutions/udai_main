import { HeroSection } from "../sections/HeroSection";
import { AboutSection } from "../sections/AboutSection";
import { ImpactSection } from "../sections/ImpactSection";
import { RecognitionSection } from "../sections/RecognitionSection";
import { EducationSection } from "../sections/EducationSection";
import { TherapistsSection } from "../sections/TherapistsSection";
import { HealthWellnessSection } from "../sections/HealthWellnessSection";
import { ArtsSection } from "../sections/ArtsSection";
import { ShopSection } from "../sections/ShopSection";
import { EventsSection } from "../sections/EventsSection";
import { BlogSection } from "../sections/BlogSection";
import { TestimonialsSection } from "../sections/TestimonialsSection";
import { SocialGallerySection } from "../sections/SocialGallerySection";
import { VolunteerCTASection } from "../sections/VolunteerCTASection";
import { DonationSection } from "../sections/DonationSection";

export function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <AboutSection />
      <ImpactSection />
      <RecognitionSection />
      <EducationSection />
      <TherapistsSection />
      <HealthWellnessSection />
      <ArtsSection />
      <ShopSection />
      <EventsSection />
      <BlogSection />
      <TestimonialsSection />
      <SocialGallerySection />
      <VolunteerCTASection />
      <DonationSection />
    </div>
  );
}
