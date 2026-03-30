import { Outlet, Link, useLocation } from "react-router";
import { Menu, X, Heart, Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { useState } from "react";

export function NewLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: "About", href: "/about" },
    { name: "Programs", href: "/programs" },
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

  const handleNavClick = (href: string) => {
    if (href.startsWith("/#")) {
      const id = href.substring(2);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
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
                if (item.href.startsWith("/#")) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.href)}
                      className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                    >
                      {item.name}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-gray-700 hover:text-blue-600 transition-colors font-medium ${
                      isActive(item.href) ? "text-blue-600" : ""
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
                  if (item.href.startsWith("/#")) {
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavClick(item.href)}
                        className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-left"
                      >
                        {item.name}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-gray-700 hover:text-blue-600 transition-colors font-medium ${
                        isActive(item.href) ? "text-blue-600" : ""
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
                <Link
                  to="/#donate"
                  onClick={() => setMobileMenuOpen(false)}
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
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
                <button className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  <Mail className="size-4" />
                </button>
              </div>
              
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
                  href="#"
                  className="size-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="size-5" />
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
