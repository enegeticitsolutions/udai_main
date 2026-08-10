import { useEffect } from "react";
import { Link } from "react-router";
import { PROJECTS_DATA } from "../data/projectsData";
import { 
  Sparkles, 
  ArrowRight, 
  Heart, 
  ShieldCheck, 
  Users, 
  Building,
  CheckCircle2
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Projects() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="bg-[#f7f4ef] text-[#2c221e] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        
        {/* Hero Banner */}
        <header className="rounded-3xl bg-[#24396f] p-8 sm:p-14 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 opacity-10 pointer-events-none">
            <Heart size={400} />
          </div>
          <div className="relative z-10 max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/15">
              <Sparkles size={14} className="text-[#ef3c32]" />
              17+ Years of Impact
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl text-white leading-tight">
              OUR PROJECTS
            </h1>
            <p className="text-lg sm:text-xl text-[#ef3c32] font-semibold">
              Transforming Lives Through Inclusive Care, Education and Empowerment
            </p>
            <p className="text-base sm:text-lg text-white/85 leading-relaxed">
              At <strong>UDAI – Working Together Works</strong>, we believe that every individual with a disability deserves the opportunity to learn, grow, become independent, and participate fully in society. Our programmes provide a continuum of care beginning with early childhood intervention through education, therapy, vocational training, community inclusion, and independent living.
            </p>
            
            <div className="grid sm:grid-cols-3 gap-4 pt-6 border-t border-white/15 text-xs sm:text-sm text-white/80">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#ef3c32]" />
                <span>Evidence-based Care</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#ef3c32]" />
                <span>Multidisciplinary Team</span>
              </div>
              <div className="flex items-center gap-2">
                <Building size={18} className="text-[#ef3c32]" />
                <span>Janakpuri &amp; Gurugram</span>
              </div>
            </div>
          </div>
        </header>

        {/* Projects Grid: Individual Project Cards */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#24396f]">Explore Our Specialized Projects</h2>
            <span className="text-xs font-semibold text-[#7a6e67] bg-white px-3 py-1 rounded-full border border-[#e8dfd8]">
              {PROJECTS_DATA.length} Projects
            </span>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {PROJECTS_DATA.map((project) => (
              <article
                key={project.slug}
                className="group flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-[#e8dfd8] hover:shadow-xl hover:border-[#24396f]/30 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Card Image */}
                  <div className="relative h-48 rounded-2xl overflow-hidden">
                    <ImageWithFallback
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#24396f]/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider">
                      {project.category}
                    </div>
                  </div>

                  {/* Card Title & Summary */}
                  <div>
                    <h3 className="text-xl font-bold text-[#24396f] group-hover:text-[#ef3c32] transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#ef3c32] mt-1 mb-2">
                      {project.tagline}
                    </p>
                    <p className="text-xs text-[#5f534c] leading-relaxed line-clamp-3">
                      {project.summary}
                    </p>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-6 border-t border-[#f0e8e2] mt-4">
                  <Link
                    to={`/projects/${project.slug}`}
                    className="inline-flex w-full items-center justify-between rounded-xl bg-[#f8f6f2] px-4 py-2.5 text-xs font-bold text-[#24396f] group-hover:bg-[#24396f] group-hover:text-white transition-all duration-300"
                  >
                    <span>View Project Details</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Why Choose UDAI */}
        <section className="rounded-3xl bg-[#24396f] p-8 sm:p-12 text-white shadow-xl">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ef3c32] bg-white/10 px-3 py-1 rounded-full border border-white/15">
              Key Pillars
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mt-3">
              Why Choose UDAI?
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "17+ Years of Experience in Disability Rehabilitation",
              "Holistic Continuum of Care from Early Childhood to Adulthood",
              "Multidisciplinary Team of Qualified Professionals",
              "Individualised Care Plans for Every Beneficiary",
              "Family-Centred Intervention Approach",
              "Community Outreach Through Mobile Rehabilitation Services",
              "Vocational Training and Employment Support",
              "Safe Residential Care for Independent Living",
              "Partnerships with Government, CSR, Educational Institutions & Communities",
              "Committed to Building an Inclusive Society for All"
            ].map((pillar, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-sm">
                <CheckCircle2 size={20} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">{pillar}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}


