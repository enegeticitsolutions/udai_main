import { useEffect } from "react";
import { FileText, ShieldAlert, Scale, AlertTriangle, CheckCircle2, Phone, Mail, MapPin, Building2, ShoppingBag, HeartHandshake, Award } from "lucide-react";

export function TermsOfService() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="bg-[#f7f4ef] text-[#2c221e] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        
        {/* Header Hero Banner */}
        <div className="rounded-3xl bg-[#24396f] p-8 sm:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
            <Scale size={320} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md mb-4 border border-white/15">
              <FileText size={14} className="text-[#ef3c32]" />
              Legal Terms
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-base sm:text-lg text-white/80 max-w-3xl leading-relaxed">
              <strong>UDAI Working Together Works</strong> (&quot;UDAIREHAB&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) — Please read these terms carefully before engaging with our website, services, donations, or programs.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs sm:text-sm text-white/70 border-t border-white/15 pt-4">
              <span><strong>Effective Date:</strong> July 29, 2026</span>
              <span>•</span>
              <span><strong>Website:</strong> <a href="https://udairehab.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">https://udairehab.org/</a></span>
            </div>
          </div>
        </div>

        {/* Intro Card */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] mb-8 leading-relaxed text-sm sm:text-base text-[#4a3f39]">
          <p>
            Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using our website or engaging with our services, donation platform, Shop, or internship/volunteer programs. By accessing or using <strong>udairehab.org</strong>, you agree to be bound by these Terms. If you do not agree, please do not use our website.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          
          {/* Section 1 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <Building2 size={24} className="text-[#ef3c32]" />
              1. About Us
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39]">
              <strong>UDAI Working Together Works</strong> is a Charitable Trust registered under the <strong>Indian Trusts Act, 1882</strong>, operating a special school, outpatient department, intervention centre, assistive/residential living program (Assistive Living Program), and vocational skill centre (Ek Prayas, supported by the Rotary Club of Delhi, Janak Association), serving children and adults with special needs in Janakpuri, West Delhi and Gurugram, Haryana since 2009.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">2</span>
              Use of the Website
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39] mb-4">
              You agree to use this website only for lawful purposes and in a manner consistent with its intended use, which includes learning about our programs, applying for services or opportunities, making donations, and purchasing items from our Shop.
            </p>
            <p className="font-semibold text-sm sm:text-base text-[#24396f] mb-3">You agree not to:</p>
            <ul className="grid gap-2.5 text-xs sm:text-sm text-[#4a3f39] sm:grid-cols-2">
              <li className="flex items-start gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <ShieldAlert size={16} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>Use the website in any way that could damage, disable, overburden, or impair it.</span>
              </li>
              <li className="flex items-start gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <ShieldAlert size={16} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>Attempt unauthorized access to any part of the website, accounts, or connected systems.</span>
              </li>
              <li className="flex items-start gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <ShieldAlert size={16} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>Upload or transmit viruses, malware, or any malicious code.</span>
              </li>
              <li className="flex items-start gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <ShieldAlert size={16} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>Use automated bots or scrapers to extract content without written consent.</span>
              </li>
              <li className="flex items-start gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2] sm:col-span-2">
                <ShieldAlert size={16} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>Post or transmit any content that is unlawful, defamatory, obscene, or infringes on rights.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">3</span>
              Admissions and Service Delivery
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39] mb-3">
              Enrolment of a child or adult beneficiary into our Special School, Outpatient Department, Intervention Centre, Assistive Living Program, or Ek Prayas Skill Centre is subject to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4a3f39]">
              <li>A separate admission/enrolment process, assessment, and documentation, governed by internal policies;</li>
              <li>Availability of seats/capacity at the relevant centre;</li>
              <li>Submission of accurate medical, developmental, and identification information by parent/guardian;</li>
              <li>Applicable fees, subsidies, or fee waiver arrangements as communicated separately;</li>
              <li>Our right to determine program suitability for a prospective beneficiary based on professional assessment.</li>
            </ul>
            <p className="mt-4 text-xs sm:text-sm text-[#7a6e67] bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">
              <em>Note:</em> Specific service arrangements (fees, therapy plans, hostel rules for Assistive Living) are governed by separate agreements or policies provided upon admission.
            </p>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <HeartHandshake size={24} className="text-[#ef3c32]" />
              4. Donations
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4a3f39] leading-relaxed">
              <li>Donations made through our website are voluntary contributions to support our charitable programs and are, in general, non refundable except where required by law or at our sole discretion in cases of demonstrable error.</li>
              <li>Tax exemption receipts (under Section 80G of the Income Tax Act, where applicable) are issued based on details provided (including PAN). Please ensure accuracy as we are not responsible for errors arising from incorrect input.</li>
              <li>Foreign contributions accepted are subject to compliance with the Foreign Contribution (Regulation) Act (FCRA) and related regulations.</li>
              <li>Donation payments are processed through a third party payment gateway (e.g., Razorpay). We are not responsible for payment gateway or bank processing failures.</li>
              <li>Donated funds are used toward general charitable objectives unless expressly earmarked for a specific program by mutual written agreement.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <ShoppingBag size={24} className="text-[#24396f]" />
              5. Shop / Purchases
            </h2>
            <p className="text-sm sm:text-base text-[#4a3f39] mb-3">If you purchase products through our Shop:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4a3f39]">
              <li>Product descriptions, images, and prices are provided in good faith but may be subject to change without notice;</li>
              <li>Orders are subject to acceptance and availability; we reserve the right to cancel or refuse any order at our discretion with a full refund;</li>
              <li>Payment is processed via third party gateway; accurate billing &amp; shipping details are required;</li>
              <li>Shipping timelines are estimates only;</li>
              <li>Returns, exchanges, or refund requests for physical products should be raised within a reasonable time of delivery and will be assessed on a case by case basis;</li>
              <li>Proceeds from Shop sales directly support our charitable programs.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <Award size={24} className="text-[#24396f]" />
              6. Internship / Volunteer Applications
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4a3f39] leading-relaxed">
              <li>Submitting an internship or volunteer application does not guarantee placement; all applications are subject to review and discretion.</li>
              <li>Volunteers and interns engaging directly with beneficiaries may be required to undergo background checks, orientation, and comply with child safeguarding and code of conduct policies.</li>
              <li>Any stipend, certificate, or reference provided is subject to satisfactory completion of the term as determined by us.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">7</span>
              Intellectual Property
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39] mb-3">
              All content on this website — including text, logos, images, videos, graphics, and the UDAIREHAB name and branding — is owned by or licensed to UDAI Working Together Works and is protected by applicable intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without prior written permission.
            </p>
            <p className="text-xs sm:text-sm text-[#7a6e67] bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">
              Photographs and videos of beneficiaries, students, staff, and events shared on this website and social media channels are used with appropriate consent and remain our exclusive property or that of the relevant rights holder.
            </p>
          </section>

          {/* Section 8 & 9 Grid */}
          <div className="grid gap-8 sm:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-lg sm:text-xl font-bold text-[#24396f] mb-3">8. Third Party Links and Content</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                Our website contains links to third party platforms (WhatsApp, Facebook, Instagram, Twitter/X, YouTube, Google Maps, payment gateways). We do not control and are not responsible for third party content or privacy practices.
              </p>
            </section>

            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-lg sm:text-xl font-bold text-[#24396f] mb-3">9. Disclaimers</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                This website is provided &ldquo;as is&rdquo; without warranties of any kind. Nothing on this website constitutes medical, therapeutic, legal, or financial advice. Treatment plans are determined through individual professional assessment.
              </p>
            </section>
          </div>

          {/* Section 10, 11 & 12 */}
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-lg sm:text-xl font-bold text-[#24396f] mb-2">10. Limitation of Liability</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                To the maximum extent permitted by law, UDAI Working Together Works, its trustees, staff, and volunteers shall not be liable for any indirect, incidental, or consequential damages arising out of your use of this website, services, donations, or Shop purchases.
              </p>
            </section>

            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-lg sm:text-xl font-bold text-[#24396f] mb-2">11. Indemnity</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                You agree to indemnify and hold harmless UDAI Working Together Works, its trustees, employees, and volunteers from any claims, losses, or damages arising from your misuse of the website or violation of these Terms.
              </p>
            </section>

            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-lg sm:text-xl font-bold text-[#24396f] flex items-center gap-2 mb-2">
                <Scale size={20} className="text-[#ef3c32]" />
                12. Governing Law and Jurisdiction
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts at <strong>Delhi, India</strong>.
              </p>
            </section>
          </div>

          {/* Section 13 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-base font-bold text-[#24396f] mb-2">13. Changes to These Terms</h2>
            <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
              We may revise these Terms from time to time. The updated Terms will be posted on this page with a revised &ldquo;Effective Date.&rdquo; Your continued use of the website after such changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* Section 14 - Contact Us */}
          <section className="rounded-3xl bg-[#24396f] p-8 sm:p-10 text-white shadow-lg">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
              <Phone size={24} className="text-[#ef3c32]" />
              14. Contact Us
            </h2>
            <p className="text-sm sm:text-base text-white/80 mb-6">
              For any questions or inquiries regarding these Terms of Service, please reach out to us:
            </p>

            <div className="grid gap-6 sm:grid-cols-3 mb-6">
              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/15">
                <div className="flex items-center gap-2 text-[#ef3c32] font-semibold text-sm mb-2">
                  <MapPin size={16} /> Janakpuri Centre
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  WZ-12B, Asalatpur Village, Janakpuri, Delhi-110058
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/15">
                <div className="flex items-center gap-2 text-[#ef3c32] font-semibold text-sm mb-2">
                  <MapPin size={16} /> Ek Prayas Rotary Skill Centre
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  WZ-12B, Asalatpur Village, Janakpuri, Delhi-110058
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/15">
                <div className="flex items-center gap-2 text-[#ef3c32] font-semibold text-sm mb-2">
                  <MapPin size={16} /> Gurgaon Centre
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  H. No. 121, Sec. 23, Gurugram, Haryana-122017
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-white/15 text-xs sm:text-sm">
              <a href="tel:+919899681972" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-white hover:bg-white/25 transition">
                <Phone size={14} /> +91-9899681972 / +91-8377066832
              </a>
              <a href="mailto:info@udairehab.org" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-white hover:bg-white/25 transition">
                <Mail size={14} /> info@udairehab.org / udai.march@gmail.com
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
