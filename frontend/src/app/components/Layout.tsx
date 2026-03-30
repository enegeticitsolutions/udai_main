import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Facebook, Instagram, Mail, Menu, Phone, Twitter, X } from "lucide-react";
import { useEffect, useState } from "react";

const logo = "/images/logo_udai.png";

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: "About", href: "/about", type: "route" as const },
    { name: "Programs", href: "/programs", type: "route" as const },
    { name: "Therapist", href: "#therapists", type: "section" as const },
    { name: "Shop", href: "#shop", type: "section" as const },
    { name: "Event", href: "#events", type: "section" as const },
    { name: "Volunteer", href: "#volunteer", type: "section" as const },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  useEffect(() => {
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

  const handleSectionNavigation = (sectionHref: string) => {
    const targetId = sectionHref.replace("#", "");

    if (location.pathname === "/") {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      navigate({ pathname: "/", hash: sectionHref });
    }

    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white">
        <div className="bg-[#2f5597] text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-start gap-2 px-4 py-2 text-sm font-medium sm:px-6 md:flex-row md:items-center md:gap-10 lg:px-8">
            <a
              href="tel:+919899681972"
              className="flex items-center gap-3 transition hover:text-white/80"
            >
              <Phone className="h-4 w-4" />
              <span>+91 - 9899681972, 8377066832</span>
            </a>
            <a
              href="mailto:info@udairehab.org"
              className="flex items-center gap-3 transition hover:text-white/80"
            >
              <Mail className="h-4 w-4" />
              <span>info@udairehab.org, udai.march@gmail.com</span>
            </a>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[92px] items-center justify-between gap-6">
            <Link to="/" className="flex shrink-0 items-center">
              <img src={logo} alt="UDAI Logo" className="h-16 w-auto sm:h-20" />
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              {navigation.map((item) =>
                item.type === "route" ? (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-[15px] font-medium transition-colors ${
                      isActive(item.href)
                        ? "text-[#2f5597]"
                        : "text-[#2b1b15] hover:text-[#2f5597]"
                    }`}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSectionNavigation(item.href)}
                    className="text-[15px] font-medium text-[#2b1b15] transition-colors hover:text-[#2f5597]"
                  >
                    {item.name}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => handleSectionNavigation("#donate")}
                className="rounded-full bg-[#ef3c32] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(239,60,50,0.28)] transition hover:bg-[#da2f26]"
              >
                Donate Now
              </button>
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
            <div className="border-t border-slate-200 py-4 lg:hidden">
              <div className="flex flex-col gap-4">
                {navigation.map((item) =>
                  item.type === "route" ? (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? "text-[#2f5597]"
                          : "text-[#2b1b15] hover:text-[#2f5597]"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSectionNavigation(item.href)}
                      className="text-left text-sm font-medium text-[#2b1b15] transition-colors hover:text-[#2f5597]"
                    >
                      {item.name}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => handleSectionNavigation("#donate")}
                  className="rounded-full bg-[#ef3c32] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#da2f26]"
                >
                  Donate Now
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <div className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a79b95]">
            Trusted by our partners & sponsors
          </div>
          <div className="mt-8 grid grid-cols-2 gap-y-8 text-xl font-semibold text-[#7b7270] sm:grid-cols-3 lg:grid-cols-6">
            <div>Global Aid Alliance</div>
            <div>Tech For Good</div>
            <div>Future Foundations</div>
            <div>Community First</div>
            <div>Education United</div>
            <div>Health & Hope</div>
          </div>
        </div>
      </div>

      <footer className="bg-[#2f5597] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.8fr_0.8fr_1fr]">
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
                <Twitter className="h-5 w-5 text-white" />
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
                <li><Link to="/about">Team & Board</Link></li>
                <li><Link to="/about">Financials</Link></li>
                <li><Link to="/careers">Careers</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#ffd86b]">Get Involved</h3>
              <ul className="mt-6 space-y-4 text-sm text-white/78">
                <li><button type="button" onClick={() => handleSectionNavigation("#donate")}>Donate</button></li>
                <li><button type="button" onClick={() => handleSectionNavigation("#volunteer")}>Volunteer</button></li>
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
              <div className="mt-5">
                <div className="rounded-md bg-white/10 px-4 py-3 text-sm text-white/55">
                  Your email address
                </div>
                <button className="mt-4 w-full rounded-md bg-[#d24d4e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c34345]">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/12 pt-6 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} UDAIREHAB NGO. All rights reserved.</p>
            <div className="flex items-center gap-8">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
