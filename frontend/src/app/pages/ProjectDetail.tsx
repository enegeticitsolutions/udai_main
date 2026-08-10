import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { 
  PROJECTS_DATA, 
  type ProjectDetailData 
} from "../data/projectsData";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Calendar, 
  Phone, 
  Target, 
  Heart, 
  Users, 
  Building, 
  ShieldCheck 
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  // Handle slug matching (including legacy hash aliases like 'early-intervention-programme')
  const project = PROJECTS_DATA.find(
    (p) => p.slug === slug || slug?.includes(p.slug)
  );

  if (!project) {
    return (
      <div className="bg-[#f7f4ef] min-h-screen py-20 px-4 text-center">
        <div className="mx-auto max-w-md bg-white p-8 rounded-3xl shadow-sm border border-[#e8dfd8]">
          <h2 className="text-2xl font-bold text-[#24396f] mb-3">Project Not Found</h2>
          <p className="text-sm text-[#7a6e67] mb-6">The requested project details could not be found.</p>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-xl bg-[#24396f] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1a2b56] transition"
          >
            <ArrowLeft size={14} /> Back to All Projects
          </Link>
        </div>
      </div>
    );
  }

  // Find index for next/prev project navigation
  const currentIndex = PROJECTS_DATA.findIndex((p) => p.slug === project.slug);
  const prevProject = currentIndex > 0 ? PROJECTS_DATA[currentIndex - 1] : null;
  const nextProject = currentIndex < PROJECTS_DATA.length - 1 ? PROJECTS_DATA[currentIndex + 1] : null;

  return (
    <div className="bg-[#f7f4ef] text-[#2c221e] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-[#7a6e67]">
          <Link to="/" className="hover:text-[#24396f]">Home</Link>
          <ChevronRight size={12} />
          <Link to="/projects" className="hover:text-[#24396f]">Projects</Link>
          <ChevronRight size={12} />
          <span className="text-[#24396f] font-bold truncate max-w-[200px] sm:max-w-none">{project.title}</span>
        </nav>

        {/* Top Header Banner */}
        <header className="rounded-3xl bg-[#24396f] p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 opacity-10 pointer-events-none">
            <Heart size={350} />
          </div>

          <div className="relative z-10 max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition border border-white/15"
              >
                <ArrowLeft size={13} /> Back to Projects
              </Link>
              <span className="rounded-full bg-[#ef3c32] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                {project.category}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl text-white leading-tight">
              {project.title}
            </h1>

            <p className="text-base sm:text-xl text-[#ef3c32] font-medium leading-relaxed">
              {project.tagline}
            </p>
          </div>
        </header>

        {/* Main Content Grid: Left Main Details, Right Sidebar */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Left Column: Project Details (2 cols) */}
          <main className="lg:col-span-2 space-y-8">
            
            {/* Hero Image Card */}
            <div className="rounded-3xl bg-white p-3 shadow-md border border-[#e8dfd8] overflow-hidden">
              <div className="relative h-64 sm:h-96 rounded-2xl overflow-hidden">
                <ImageWithFallback
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Description Card */}
            <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] space-y-4">
              <h2 className="text-xl font-bold text-[#24396f] flex items-center gap-2">
                <Sparkles size={20} className="text-[#ef3c32]" /> About This Project
              </h2>
              <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[#4a3f39]">
                {project.description.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Objectives (if available) */}
            {project.objectives && project.objectives.length > 0 && (
              <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] space-y-4">
                <h2 className="text-xl font-bold text-[#24396f] flex items-center gap-2">
                  <Target size={20} className="text-[#ef3c32]" /> Key Objectives
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {project.objectives.map((obj, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 bg-[#fdfbf9] p-3.5 rounded-xl border border-[#ece4dd]">
                      <CheckCircle2 size={16} className="text-[#ef3c32] shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-[#4a3f39] font-medium leading-relaxed">{obj}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Services / Components Offered */}
            {project.services && project.services.length > 0 && (
              <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] space-y-4">
                <h2 className="text-xl font-bold text-[#24396f]">Core Services &amp; Components</h2>
                <div className="grid gap-4 sm:grid-cols-2 text-xs sm:text-sm">
                  {project.services.map((srv, idx) => (
                    <div key={idx} className="rounded-2xl bg-[#f0f4fb] p-4 border border-[#d5e1f5]">
                      <strong className="text-[#24396f] text-sm block mb-1">{srv.title}</strong>
                      <p className="text-[#554a44] leading-relaxed">{srv.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Who Can Benefit (Tag Cloud) */}
            {project.whoCanBenefit && project.whoCanBenefit.length > 0 && (
              <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] space-y-4">
                <h2 className="text-xl font-bold text-[#24396f] flex items-center gap-2">
                  <Users size={20} className="text-[#24396f]" /> Who Can Benefit?
                </h2>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#24396f]">
                  {project.whoCanBenefit.map((item) => (
                    <span key={item} className="rounded-full bg-[#f8f6f2] px-3.5 py-1.5 border border-[#e0d6cd] shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Class Groups (Special School specific) */}
            {project.classGroups && project.classGroups.length > 0 && (
              <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] space-y-4">
                <h2 className="text-xl font-bold text-[#24396f]">Class Groups (By Age &amp; Ability)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-semibold text-[#24396f]">
                  {project.classGroups.map((grp) => (
                    <div key={grp.name} className="bg-[#f0f4fb] p-3 rounded-2xl border border-[#cbe0f8]">
                      <strong className="block text-sm text-[#24396f]">{grp.name}</strong>
                      <span className="text-[11px] font-normal text-[#60544d]">{grp.age}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Vocational Training Areas */}
            {project.trainingAreas && project.trainingAreas.length > 0 && (
              <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] space-y-4">
                <h2 className="text-xl font-bold text-[#24396f]">Vocational Skill Areas</h2>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#24396f]">
                  {project.trainingAreas.map((area) => (
                    <span key={area} className="rounded-full bg-[#f8f6f2] px-3.5 py-1.5 border border-[#e0d6cd]">
                      {area}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Employability / Living Skills */}
            {project.livingSkills && (
              <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] space-y-4">
                <h2 className="text-xl font-bold text-[#24396f]">Independent Living Skills Training</h2>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#24396f]">
                  {project.livingSkills.map((sk) => (
                    <span key={sk} className="rounded-full bg-[#f0f4fb] px-3.5 py-1.5 border border-[#c2d7f5]">
                      {sk}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Impact Banner */}
            {project.impact && (
              <div className="rounded-3xl bg-[#24396f] p-6 sm:p-8 text-white shadow-lg space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ✨ Measurable Impact
                </h3>
                <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                  {project.impact}
                </p>
              </div>
            )}

            {/* Next / Previous Project Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#e0d6cd]">
              {prevProject ? (
                <Link
                  to={`/projects/${prevProject.slug}`}
                  className="w-full sm:w-auto inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-[#24396f] shadow-sm border border-[#e8dfd8] hover:bg-[#f8f6f2] transition"
                >
                  <ArrowLeft size={14} /> Previous: {prevProject.title}
                </Link>
              ) : <div />}

              {nextProject && (
                <Link
                  to={`/projects/${nextProject.slug}`}
                  className="w-full sm:w-auto inline-flex items-center justify-end gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-[#24396f] shadow-sm border border-[#e8dfd8] hover:bg-[#f8f6f2] transition"
                >
                  Next: {nextProject.title} <ChevronRight size={14} />
                </Link>
              )}
            </div>

          </main>

          {/* Right Column: Sidebar Navigation & Contact CTA */}
          <aside className="space-y-6">
            
            {/* Quick Projects Links Menu */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-[#e8dfd8] space-y-4">
              <h3 className="text-base font-bold text-[#24396f]">All UDAI Projects</h3>
              <div className="space-y-1.5 text-xs font-medium">
                {PROJECTS_DATA.map((item) => {
                  const isActive = item.slug === project.slug;
                  return (
                    <Link
                      key={item.slug}
                      to={`/projects/${item.slug}`}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition ${
                        isActive
                          ? "bg-[#24396f] text-white font-bold"
                          : "text-[#4a3f39] hover:bg-[#f8f6f2] hover:text-[#24396f]"
                      }`}
                    >
                      <span className="truncate pr-2">{item.title}</span>
                      <ChevronRight size={13} className={isActive ? "text-[#ef3c32]" : "text-[#b0a59e]"} />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Book Appointment CTA Card */}
            <div className="rounded-3xl bg-[#ef3c32] p-6 text-white shadow-md space-y-4">
              <h3 className="text-xl font-bold text-white">Enroll or Book Appointment</h3>
              <p className="text-xs text-white/90 leading-relaxed">
                Connect with our multidisciplinary team for screenings, consultations, or admissions at Janakpuri or Gurgaon.
              </p>
              <div className="space-y-2 pt-2">
                <Link
                  to="/appointment"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-[#ef3c32] shadow-sm hover:bg-[#fdf3f2] transition"
                >
                  <Calendar size={14} /> Book Appointment
                </Link>
                <a
                  href="tel:+919899681972"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 py-3 text-xs font-semibold text-white hover:bg-white/25 transition border border-white/20"
                >
                  <Phone size={14} /> Call +91-9899681972
                </a>
              </div>
            </div>

          </aside>

        </div>

      </div>
    </div>
  );
}
