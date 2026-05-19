import { Outlet, Link, useLocation } from "react-router";
import { ChevronDown, Menu, X, Heart, Facebook, Youtube, Instagram, Linkedin, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { adminApiPost } from "../lib/api";

export function NewLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const location = useLocation();

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
    { name: "About", href: "/about" },
    { name: "Programs", href: "/programs" },
    {
      name: "Projects",
      type: "dropdown" as const,
      children: [
        { name: "Early Intervention Programme", href: "/projects#early-intervention-programme" },
        { name: "School Readiness Programme", href: "/projects#school-readiness-programme" },
        { name: "Therapy Services", href: "/projects#therapy-services" },
        { name: "Special Education and Life-Skills Development", href: "/projects#special-education-life-skills" },
        { name: "Ek Prayas – Intervention on Wheels", href: "/projects#ek-prayas-intervention-on-wheels" },
        { name: "Ek Prayas – Vocational Training and Employability Support", href: "/projects#ek-prayas-vocational-training" },
        { name: "Assistive Living Hostel for Boys", href: "/projects#assistive-living-hostel" },
        { name: "Community Outreach Program", href: "/projects#community-outreach" },
        { name: "Assistive Living Programme (Residential facility for Boys)", href: "/projects#assistive-living-programme" },
        { name: "Teachers Training & Parent Empowerment Program", href: "/projects#teachers-training-parent-empowerment" },
      ],
    },
    { name: "Therapist", href: "/#therapists" },
    { name: "Shop", href: "/#shop" },
    { name: "Event", href: "/#events" },
    { name: "Volunteer", href: "/get-involved" },
  ];

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return false;
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setProjectsOpen(false);
  };

  useEffect(() => {
    setProjectsOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="size-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Heart className="size-7 text-white fill-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">UDAI</div>
                <div className="text-xs text-gray-600">Empowering Special Needs</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navigation.map((item) => {
                if (item.type === "dropdown") {
                  return (
                    <div key={item.name} className="relative">
                      <button
                        type="button"
                        onClick={() => setProjectsOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-1 font-medium transition-colors ${projectsOpen ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                          }`}
                      >
                        {item.name}
                        <ChevronDown className={`h-4 w-4 transition-transform ${projectsOpen ? "rotate-180" : ""}`} />
                      </button>
                      {projectsOpen ? (
                        <div className="absolute left-0 top-full z-50 mt-3 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_18px_40px_rgba(41,29,22,0.12)]">
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              to={child.href}
                              onClick={closeMenus}
                              className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 hover:text-blue-600"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }
                if (item.href.startsWith("/#")) {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeMenus}
                      className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                    >
                      {item.name}
                    </Link>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-gray-700 hover:text-blue-600 transition-colors font-medium ${isActive(item.href) ? "text-blue-600" : ""
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <Link
                to="/#donate"
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                Donate Now
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="size-6 text-gray-900" />
              ) : (
                <Menu className="size-6 text-gray-900" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t">
              <div className="flex flex-col gap-4">
                {navigation.map((item) => {
                  if (item.type === "dropdown") {
                    return (
                      <div key={item.name} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <button
                          type="button"
                          onClick={() => setProjectsOpen((prev) => !prev)}
                          className="flex w-full items-center justify-between text-left text-gray-700 font-medium"
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
                                onClick={closeMenus}
                                className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-blue-600"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                  if (item.href.startsWith("/#")) {
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={closeMenus}
                        className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-left"
                      >
                        {item.name}
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-gray-700 hover:text-blue-600 transition-colors font-medium ${isActive(item.href) ? "text-blue-600" : ""
                        }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
                <Link
                  to="/#donate"
                  onClick={closeMenus}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg text-center hover:from-emerald-700 hover:to-emerald-800 transition-all font-medium shadow-lg"
                >
                  Donate Now
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* About Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Heart className="size-7 text-white fill-white" />
                </div>
                <div>
                  <div className="text-xl font-bold">UDAIREHAB</div>
                  <div className="text-xs text-gray-400">Empowering Special Needs</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Empowering children with special needs through compassionate care, innovative therapy, and inclusive education.
              </p>
            </div>

            {/* About Links */}
            <div>
              <h3 className="font-semibold mb-4 text-lg">About</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/about" className="hover:text-blue-400 transition-colors">
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-blue-400 transition-colors">
                    Mission & Vision
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-blue-400 transition-colors">
                    Our Team
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-blue-400 transition-colors">
                    Impact Reports
                  </Link>
                </li>
                <li>
                  <Link to="/careers" className="hover:text-blue-400 transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get Involved Links */}
            <div>
              <h3 className="font-semibold mb-4 text-lg">Get Involved</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/get-involved" className="hover:text-blue-400 transition-colors">
                    Volunteer
                  </Link>
                </li>
                <li>
                  <Link to="/#donate" className="hover:text-blue-400 transition-colors">
                    Donate
                  </Link>
                </li>
                <li>
                  <Link to="/get-involved" className="hover:text-blue-400 transition-colors">
                    Partner With Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-blue-400 transition-colors">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="font-semibold mb-4 text-lg">Stay Connected</h3>
              <p className="text-gray-400 text-sm mb-4">
                Subscribe to our newsletter for updates and stories.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="mb-4 flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  <Mail className="size-4" />
                </button>
              </form>
              {newsletterMessage ? <p className="mb-4 text-xs text-gray-400">{newsletterMessage}</p> : null}

              {/* Social Icons */}
              <div className="flex gap-3">
                <a
                  href="https://www.facebook.com/share/1ApdkHwEuw/"
                  target="_blank"
                  rel="noreferrer"
                  className="size-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="size-5" />
                </a>
                <a
                  href="https://www.youtube.com/@udaiworkingtogetherworkssp2603"
                  target="_blank"
                  rel="noreferrer"
                  className="size-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="size-5" />
                </a>
                <a
                  href="#"
                  className="size-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-pink-600 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="size-5" />
                </a>
                <a
                  href="#"
                  className="size-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} UDAIREHAB NGO. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
