import { useEffect } from "react";
import { Shield, Lock, Eye, FileText, Phone, Mail, MapPin, CheckCircle2, UserCheck, Heart } from "lucide-react";

export function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="bg-[#f7f4ef] text-[#2c221e] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        
        {/* Header Hero Banner */}
        <div className="rounded-3xl bg-[#24396f] p-8 sm:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
            <Shield size={320} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md mb-4 border border-white/15">
              <Lock size={14} className="text-[#ef3c32]" />
              Official Policy
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-base sm:text-lg text-white/80 max-w-3xl leading-relaxed">
              <strong>UDAI Working Together Works</strong> (&quot;UDAIREHAB&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) — Dedicated to safeguarding your data and maintaining complete transparency.
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
          <p className="mb-4">
            <strong>UDAI Working Together Works</strong> is a Charitable Trust registered under the <strong>Indian Trusts Act, 1882</strong>, operating a special school, outpatient department, intervention centre, assistive/residential living program, and vocational skill centre (Ek Prayas) for children and adults with special needs, based in Janakpuri, Delhi and Gurugram, Haryana.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and protect information when you visit our website, enroll in or receive our services, donate to us, apply for internships/volunteering, purchase from our Shop, or otherwise interact with us. By using our website or services, you agree to the practices described in this Policy.
          </p>
        </div>

        {/* Policy Content Sections */}
        <div className="space-y-8">
          
          {/* Section 1 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">1</span>
              Scope of This Policy
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39] mb-4">
              This Policy applies to information we collect through:
            </p>
            <ul className="grid gap-3 text-sm sm:text-base text-[#4a3f39] sm:grid-cols-2">
              <li className="flex items-start gap-2.5 rounded-xl bg-[#f8f6f2] p-3.5 border border-[#ece4dd]">
                <CheckCircle2 size={18} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>Our website (<strong>udairehab.org</strong>) and its forms (contact, enrolment, internship/volunteer, donation, shop).</span>
              </li>
              <li className="flex items-start gap-2.5 rounded-xl bg-[#f8f6f2] p-3.5 border border-[#ece4dd]">
                <CheckCircle2 size={18} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>WhatsApp, phone, and email communications initiated via our contact channels.</span>
              </li>
              <li className="flex items-start gap-2.5 rounded-xl bg-[#f8f6f2] p-3.5 border border-[#ece4dd]">
                <CheckCircle2 size={18} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>In-person interactions at our centres (Janakpuri, Ek Prayas Rotary Skill Centre, and Gurugram) in connection with admissions, therapy, or programs.</span>
              </li>
              <li className="flex items-start gap-2.5 rounded-xl bg-[#f8f6f2] p-3.5 border border-[#ece4dd]">
                <CheckCircle2 size={18} className="text-[#ef3c32] shrink-0 mt-0.5" />
                <span>Our social media pages (Facebook, Instagram, Twitter/X, YouTube), to the extent permitted by those platforms.</span>
              </li>
            </ul>
            <p className="mt-4 text-xs sm:text-sm text-[#7a6e67] bg-[#fdfbf9] p-3 rounded-lg border border-[#eee6df]">
              <em>Note:</em> It does not apply to third-party websites or services we link to, including payment gateways, which have their own privacy policies.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">2</span>
              Information We Collect
            </h2>
            
            <div className="space-y-6 text-sm sm:text-base text-[#4a3f39]">
              <div className="border-l-4 border-[#24396f] pl-4 py-1">
                <h3 className="font-bold text-[#24396f] text-base sm:text-lg mb-2">2.1 Information from Beneficiaries, Students, and Their Families/Guardians</h3>
                <p className="leading-relaxed mb-3">
                  Because our core services involve special education, therapy, and residential care for children and adults with special needs, we may collect:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Name, date of birth, gender, and contact details of the beneficiary and their parent/guardian;</li>
                  <li>Diagnostic, medical, developmental, and disability-related information relevant to admission, therapy planning, and care (a category of sensitive personal data);</li>
                  <li>Educational history, therapy records, progress notes, and attendance;</li>
                  <li>Photographs and videos taken during classroom activities, events, and celebrations (e.g., Annual Day, Diwali Stalls, Summer Camp), which may be used for our records or, with consent, for promotional/awareness purposes;</li>
                  <li>Emergency contact and identification details for residential (Assistive Living Program) participants.</li>
                </ul>
                <p className="mt-3 text-xs sm:text-sm text-[#635750]">
                  This information is collected directly from parents/guardians or authorized caregivers, since our beneficiaries are children or adults who may not be able to independently provide informed consent. We do not knowingly collect personal data directly from a child without verifiable parental/guardian consent.
                </p>
              </div>

              <div className="border-l-4 border-[#ef3c32] pl-4 py-1">
                <h3 className="font-bold text-[#24396f] text-base sm:text-lg mb-2">2.2 Information from Donors</h3>
                <p className="leading-relaxed">
                  When you donate to us (online or offline), we may collect your name, contact details, address, PAN (for tax-exemption receipts, where applicable), and payment-related information. Payment card or banking details are collected and processed directly by our payment gateway partner (see Section 5); we do not store full card numbers on our servers.
                </p>
              </div>

              <div className="border-l-4 border-[#24396f] pl-4 py-1">
                <h3 className="font-bold text-[#24396f] text-base sm:text-lg mb-2">2.3 Information from Volunteers and Interns</h3>
                <p className="leading-relaxed">
                  When you apply for an internship or volunteer opportunity, we may collect your name, contact details, educational/professional background, resume/CV, areas of interest, and references.
                </p>
              </div>

              <div className="border-l-4 border-[#ef3c32] pl-4 py-1">
                <h3 className="font-bold text-[#24396f] text-base sm:text-lg mb-2">2.4 Information from Shop Customers</h3>
                <p className="leading-relaxed">
                  If you purchase products through our Shop, we collect your name, shipping address, contact details, order details, and payment confirmation (processed via our payment gateway).
                </p>
              </div>

              <div className="border-l-4 border-[#24396f] pl-4 py-1">
                <h3 className="font-bold text-[#24396f] text-base sm:text-lg mb-2">2.5 General Website Visitors</h3>
                <p className="leading-relaxed">
                  We may automatically collect limited technical information such as IP address, browser type, pages visited, and referring website, typically through standard web server logs or embedded third-party content (e.g., YouTube video embeds, Google Maps embeds). We currently do not use advertising or cross-site tracking cookies; any cookies used are limited to essential website functionality and, where applicable, third-party embeds (Google Maps, YouTube, WhatsApp) which are governed by those providers&apos; own policies.
                </p>
              </div>

              <div className="border-l-4 border-[#ef3c32] pl-4 py-1">
                <h3 className="font-bold text-[#24396f] text-base sm:text-lg mb-2">2.6 Communications</h3>
                <p className="leading-relaxed">
                  If you contact us via our contact form, WhatsApp number, phone, or email, we retain the content of that communication and your contact details to respond to your query.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">3</span>
              How We Use Information
            </h2>
            <p className="text-sm sm:text-base text-[#4a3f39] mb-4">We use the information we collect to:</p>
            <ul className="grid gap-2.5 text-sm sm:text-base text-[#4a3f39] sm:grid-cols-2">
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Assess admissions and deliver special education, therapy, &amp; rehabilitation services</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Maintain student/beneficiary records for care continuity &amp; regulatory compliance</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Communicate with parents/guardians about progress, attendance, or administration</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Process donations, issue receipts/tax-exemption certificates (FCRA)</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Evaluate and manage internship/volunteer applications</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Fulfil and ship Shop orders</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Respond to enquiries made via contact form, phone, email, or WhatsApp</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2]">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Share updates, newsletters, event invitations, or fundraising appeals</span>
              </li>
              <li className="flex items-center gap-2 bg-[#fdfbf9] p-3 rounded-lg border border-[#f0e8e2] sm:col-span-2">
                <CheckCircle2 size={16} className="text-[#24396f] shrink-0" />
                <span>Comply with legal, regulatory, tax, and audit obligations applicable to a registered charitable trust</span>
              </li>
            </ul>
            <div className="mt-6 rounded-xl bg-[#ef3c32]/10 p-4 border border-[#ef3c32]/20 font-semibold text-[#ef3c32] text-sm text-center">
              🚫 We do not sell personal information to third parties.
            </div>
          </section>

          {/* Section 4 - Special Safeguards */}
          <section className="rounded-2xl bg-[#fff8f7] p-6 sm:p-8 shadow-sm border border-[#f5d5ce]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#ef3c32] flex items-center gap-3 mb-4">
              <Heart size={26} className="text-[#ef3c32]" />
              4. Sensitive and Children&apos;s Data — Special Safeguards
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-[#4a3f39] leading-relaxed">
              <p>Given the nature of our work:</p>
              <ul className="space-y-2 list-disc pl-5">
                <li>Medical, diagnostic, and disability-related information is accessed only by staff, therapists, and administrators directly involved in a beneficiary&apos;s care, on a need-to-know basis.</li>
                <li>Photographs or personal stories of children/beneficiaries used for promotional, fundraising, or social media purposes are used only with the express, informed consent of a parent or legal guardian, which may be withdrawn at any time by contacting us.</li>
                <li>Parents/guardians may request access to, correction of, or deletion of their child&apos;s records (subject to our obligations to retain certain records for regulatory, medical continuity, or legal reasons).</li>
                <li>We take reasonable steps to limit collection of children&apos;s data to what is necessary for admission and service delivery.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">5</span>
              Payment Processing
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39] mb-3">
              Donations and Shop purchases made through our website are processed via a third-party payment gateway (e.g., Razorpay). When you make a payment:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-[#4a3f39]">
              <li>You are redirected to or interact with the payment gateway&apos;s own secure interface;</li>
              <li>Card, UPI, net-banking, or wallet credentials are entered directly into the payment gateway&apos;s systems, not stored by UDAIREHAB;</li>
              <li>The payment gateway&apos;s own privacy policy and security practices govern that transaction data;</li>
              <li>We receive confirmation of payment status and limited transaction details (amount, date, reference ID, and donor/customer information provided) for our records and receipting.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24396f]/10 text-sm font-bold text-[#24396f]">6</span>
              Sharing and Disclosure of Information
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39] mb-3">We may share information:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#4a3f39]">
              <li>With staff, therapists, and trustees involved in service delivery or governance;</li>
              <li>With regulatory or government authorities where required by law (e.g., tax authorities, FCRA compliance, child welfare authorities, or in response to a valid legal request);</li>
              <li>With payment gateway providers, shipping/courier partners (for Shop orders), and IT/hosting service providers who process data on our behalf under confidentiality obligations;</li>
              <li>With partner organizations (e.g., Rotary Club of Delhi Janak Association, corporate/CSR partners, or grant-making bodies) only where necessary for a specific program and, where beneficiary data is involved, only with appropriate consent and anonymization where feasible;</li>
              <li>With auditors or legal advisors as necessary for compliance and governance of the Trust.</li>
            </ul>
            <p className="mt-4 text-xs sm:text-sm font-medium text-[#24396f] bg-[#f0f4fb] p-3 rounded-lg">
              🔒 We do not share sensitive beneficiary information with third parties for marketing purposes.
            </p>
          </section>

          {/* Section 7 & 8 Grid */}
          <div className="grid gap-8 sm:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-lg sm:text-xl font-bold text-[#24396f] flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#24396f]/10 text-xs font-bold text-[#24396f]">7</span>
                Data Retention
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                We retain personal information for as long as necessary to fulfil the purposes described in this Policy, including beneficiary/student records for care continuity &amp; legal compliance, donor records under tax/FCRA regulations, volunteer/internship applications, and shop order accounting records.
              </p>
            </section>

            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-lg sm:text-xl font-bold text-[#24396f] flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#24396f]/10 text-xs font-bold text-[#24396f]">8</span>
                Data Security
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                We implement reasonable administrative, technical, and physical safeguards to protect personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>
          </div>

          {/* Section 9 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
            <h2 className="text-xl sm:text-2xl font-bold text-[#24396f] flex items-center gap-3 mb-4">
              <UserCheck size={26} className="text-[#24396f]" />
              9. Your Rights
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#4a3f39] mb-3">
              Subject to applicable law (including India&apos;s Digital Personal Data Protection Act, 2023, once and to the extent in force), you (or, for a minor/dependent beneficiary, their parent/guardian) may have the right to:
            </p>
            <ul className="grid gap-2.5 text-xs sm:text-sm text-[#4a3f39] sm:grid-cols-2">
              <li className="bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">Access the personal information we hold about you or your dependent</li>
              <li className="bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">Request correction of inaccurate or incomplete information</li>
              <li className="bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">Request erasure of information, subject to legal &amp; record-keeping obligations</li>
              <li className="bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">Withdraw consent previously given without affecting prior lawful processing</li>
              <li className="bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">Opt out of non-essential communications (newsletters, appeals) at any time</li>
              <li className="bg-[#f8f6f2] p-3 rounded-lg border border-[#ece4dd]">Lodge a grievance with our Grievance Officer or competent regulatory authority</li>
            </ul>
          </section>

          {/* Section 10 & 11 */}
          <div className="grid gap-8 sm:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-base sm:text-lg font-bold text-[#24396f] mb-3">10. Third-Party Links &amp; Embedded Content</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                Our website contains links to and embeds from third-party platforms, including WhatsApp, Facebook, Instagram, Twitter/X, YouTube, and Google Maps. These third parties collect information according to their own privacy policies.
              </p>
            </section>

            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8]">
              <h2 className="text-base sm:text-lg font-bold text-[#24396f] mb-3">11. Children&apos;s Privacy — Website Use</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[#4a3f39]">
                While our services are designed for children with special needs (with parent/guardian involvement at every stage), our website itself is not directed at unaccompanied use by children, and we do not knowingly collect personal data directly from children without parental consent.
              </p>
            </section>
          </div>

          {/* Section 12 - Grievance Officer & Contact Us */}
          <section className="rounded-3xl bg-[#24396f] p-8 sm:p-10 text-white shadow-lg">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
              <Phone size={24} className="text-[#ef3c32]" />
              12. Grievance Officer / Contact Us
            </h2>
            <p className="text-sm sm:text-base text-white/80 mb-6">
              For any questions, requests, or grievances regarding this Privacy Policy or your personal information, please contact our team:
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

          {/* Section 13 */}
          <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-[#e8dfd8] text-xs sm:text-sm text-[#7a6e67]">
            <h2 className="text-base font-bold text-[#24396f] mb-2">13. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. The updated Policy will be posted on this page with a revised &ldquo;Effective Date.&rdquo; Continued use of our website or services after such changes constitutes acceptance of the updated Policy.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
