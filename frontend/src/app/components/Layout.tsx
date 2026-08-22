import { Outlet, Link, useLocation } from "react-router";
import { ChevronDown, Facebook, Instagram, Mail, Menu, Phone, Youtube, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { adminApiPost } from "../lib/api";
import { getImageUrl } from "../lib/imageUtils";

const logo = getImageUrl("/images/logo_udai.png");

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const location = useLocation();

  const handleHashLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileMenuOpen(false);
    if (href.startsWith("/#")) {
      const targetId = href.replace("/#", "");
      if (location.pathname === "/") {
        const element = document.getElementById(targetId);
        if (element) {
          e.preventDefault();
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.pushState(null, "", href);
        }
      }
    }
  };

  async function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterMessage("");

    if (!newsletterEmail.trim()) {
      setNewsletterMessage("Please enter your email address.");
      return;
    }

    try {
      await adminApiPost("/subscribers", { email: newsletterEmail.trim() });
      setNewsletterMessage("Thanks. Your email has been saved.");
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterMessage(error instanceof Error ? error.message : "Unable to save your email.");
    }
  }

  const navigation = [
    { name: "About", href: "/about", type: "route" as const },
    { name: "Programs", href: "/programs", type: "route" as const },
    {
      name: "Projects",
      type: "dropdown" as const,
      children: [
        { name: "Early Intervention Programme", href: "/projects/early-intervention" },
        { name: "School Readiness Programme", href: "/projects/school-readiness" },
        { name: "Therapy Services", href: "/projects/therapy-services" },
        { name: "Special Education and Life-Skills Development", href: "/projects/special-education" },
        { name: "Ek Prayas – Intervention on Wheels", href: "/projects/intervention-on-wheels" },
        { name: "Ek Prayas – Vocational Training and Employability Support", href: "/projects/vocational-training" },
        { name: "Assistive Living Hostel for Boys", href: "/projects/assistive-living" },
        { name: "Community Outreach Program", href: "/projects/community-outreach" },
        { name: "Teachers Training & Parent Empowerment Program", href: "/projects/teachers-training" },
      ],
    },
    { name: "Therapist", href: "/#therapists", type: "section" as const },
    { name: "Shop", href: "/#shop", type: "section" as const },
    { name: "Event", href: "/#events", type: "section" as const },
    { name: "Volunteer", href: "/#volunteer", type: "section" as const },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  useEffect(() => {
    setProjectsOpen(false);
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const targetId = location.hash.replace("#", "");

    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header Group */}
      <div className="fixed top-0 left-0 right-0 z-50 shadow-md">
        {/* Top Contact Bar */}
        <div className="bg-[#2f5597] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-medium sm:px-6 sm:py-2 sm:text-sm md:justify-start md:gap-10 lg:px-8">
            <a
              href="tel:+919899681972"
              className="flex min-w-0 items-center gap-2 transition hover:text-white/80 sm:gap-3"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">+91 9899681972<span className="hidden sm:inline">, 8377066832</span></span>
            </a>
            <a
              href="mailto:info@udairehab.org"
              className="flex min-w-0 items-center gap-2 transition hover:text-white/80 sm:gap-3"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="max-w-[9.5rem] truncate min-[390px]:max-w-none">info@udairehab.org<span className="hidden md:inline">, udai.march@gmail.com</span></span>
            </a>
          </div>
        </div>

        {/* Main Navigation */}
        <header className="bg-white border-b border-[#e7dfd7] z-50 shadow-sm">
          <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-[56px] items-center justify-between gap-4 sm:min-h-[92px] sm:gap-6">
              <Link to="/" className="flex shrink-0 items-center">
                <img src={logo} alt="UDAI Logo" className="h-9 w-auto sm:h-20" />
              </Link>

              <div className="hidden items-center gap-8 lg:flex">
                {navigation.map((item) =>
                  item.type === "dropdown" ? (
                    <div key={item.name} className="relative">
                      <button
                        type="button"
                        onClick={() => setProjectsOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-1 text-[15px] font-medium transition-colors ${projectsOpen ? "text-[#2f5597]" : "text-[#2b1b15] hover:text-[#2f5597]"
                          }`}
                      >
                        {item.name}
                        <ChevronDown className={`h-4 w-4 transition-transform ${projectsOpen ? "rotate-180" : ""}`} />
                      </button>
                      {projectsOpen ? (
                        <div className="absolute left-0 top-full z-50 mt-3 w-72 rounded-2xl border border-[#e7dfd7] bg-white p-2 shadow-[0_18px_40px_rgba(41,29,22,0.12)]">
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              to={child.href}
                              onClick={() => setProjectsOpen(false)}
                              className="block rounded-xl px-4 py-3 text-sm font-medium text-[#2b1b15] transition hover:bg-[#f7f4ef] hover:text-[#2f5597]"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : item.type === "route" ? (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`text-[15px] font-medium transition-colors ${isActive(item.href)
                        ? "text-[#2f5597]"
                        : "text-[#2b1b15] hover:text-[#2f5597]"
                        }`}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={(e) => handleHashLink(e, item.href)}
                      className="text-[15px] font-medium text-[#2b1b15] transition-colors hover:text-[#2f5597]"
                    >
                      {item.name}
                    </Link>
                  ),
                )}
                <Link
                  to="/#donate"
                  onClick={(e) => handleHashLink(e, "/#donate")}
                  className="rounded-full bg-[#ef3c32] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(239,60,50,0.28)] transition hover:bg-[#da2f26]"
                >
                  Donate Now
                </Link>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 lg:hidden"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="size-6 text-gray-900" />
                ) : (
                  <Menu className="size-6 text-gray-900" />
                )}
              </button>
            </div>

            {mobileMenuOpen && (
              <div className="max-h-[calc(100vh-92px)] overflow-y-auto border-t border-slate-200 bg-white py-3 lg:hidden">
                <div className="flex flex-col gap-2 pb-2">
                  {navigation.map((item) =>
                    item.type === "dropdown" ? (
                      <div key={item.name} className="rounded-xl border border-[#e7dfd7] bg-[#fbfaf8] p-3">
                        <button
                          type="button"
                          onClick={() => setProjectsOpen((prev) => !prev)}
                          className="flex w-full items-center justify-between text-left text-sm font-medium text-[#2b1b15]"
                        >
                          <span>{item.name}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${projectsOpen ? "rotate-180" : ""}`} />
                        </button>
                        {projectsOpen ? (
                          <div className="mt-3 grid gap-2">
                            {item.children.map((child) => (
                              <Link
                                key={child.name}
                                to={child.href}
                                onClick={() => {
                                  setProjectsOpen(false);
                                  setMobileMenuOpen(false);
                                }}
                                className="rounded-xl px-3 py-2 text-sm font-medium text-[#2b1b15] transition hover:bg-white hover:text-[#2f5597]"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : item.type === "route" ? (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive(item.href)
                          ? "text-[#2f5597]"
                          : "text-[#2b1b15] hover:text-[#2f5597]"
                          }`}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={(e) => handleHashLink(e, item.href)}
                        className="rounded-xl px-3 py-2 text-left text-sm font-medium text-[#2b1b15] transition-colors hover:bg-[#fbfaf8] hover:text-[#2f5597]"
                      >
                        {item.name}
                      </Link>
                    ),
                  )}
                  <Link
                    to="/#donate"
                    onClick={(e) => handleHashLink(e, "/#donate")}
                    className="rounded-full bg-[#ef3c32] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#da2f26]"
                  >
                    Donate Now
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-[86px] sm:pt-[126px]">
        <Outlet />
      </main>

      <footer className="bg-[#2f5597] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.8fr_0.8fr_1fr]">
            <div>
              <img src={logo} alt="UDAI Logo" className="h-16 w-auto" />
              <p className="mt-6 max-w-xs text-sm leading-8 text-white/76">
                Cultivating hope and building sustainable communities through compassion, education, and shared resources.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <a
                  href="https://www.facebook.com/share/1ApdkHwEuw/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="transition hover:text-white/80"
                >
                  <Facebook className="h-5 w-5 text-white" />
                </a>
                <a
                  href="https://www.youtube.com/@udaiworkingtogetherworkssp2603"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="transition hover:text-white/80"
                >
                  <Youtube className="h-5 w-5 text-white" />
                </a>
                <a
                  href="https://www.instagram.com/udaispecialschool/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="transition hover:text-white/80"
                >
                  <Instagram className="h-5 w-5 text-white" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#ffd86b]">About Us</h3>
              <ul className="mt-6 space-y-4 text-sm text-white/78">
                <li><Link to="/about">Our Mission</Link></li>
                <li><Link to="/about">Board of Trustees</Link></li>
                <li><Link to="/about">Leadership Team</Link></li>
                <li><Link to="/careers">Career</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#ffd86b]">Get Involved</h3>
              <ul className="mt-6 space-y-4 text-sm text-white/78">
                <li><Link to="/#donate">Donate</Link></li>
                <li><Link to="/get-involved">Internships</Link></li>
                <li><Link to="/#volunteer">Volunteer</Link></li>
                <li><Link to="/get-involved">Partner with Us</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/contact">Fundraise</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#ffd86b]">Stay Connected</h3>
              <p className="mt-6 text-sm leading-8 text-white/78">
                Join our newsletter for inspiring stories and updates.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="mt-5">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="Your email address"
                  className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/25 focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="submit"
                  className="mt-4 w-full rounded-md bg-[#d24d4e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c34345]"
                >
                  Subscribe
                </button>
                {newsletterMessage ? <p className="mt-3 text-xs text-white/75">{newsletterMessage}</p> : null}
              </form>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/12 pt-6 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} UDAIREHAB NGO. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
