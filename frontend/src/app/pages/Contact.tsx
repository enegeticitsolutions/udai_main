import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { useState } from "react";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would send this data to a server
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      details: ["info@udairehab.org", "support@udairehab.org"],
    },
    {
      icon: Phone,
      title: "Phone",
      details: ["+256 123 456 789", "+256 987 654 321"],
    },
    {
      icon: MapPin,
      title: "Address",
      details: ["Plot 123, Main Street", "Kampala, Uganda"],
    },
    {
      icon: Clock,
      title: "Office Hours",
      details: ["Monday - Friday: 8:00 AM - 5:00 PM", "Saturday: 9:00 AM - 1:00 PM"],
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gray-900 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl mb-6">Contact Us</h1>
            <p className="text-lg sm:text-xl text-gray-300">
              Have questions or want to get involved? We'd love to hear from you. Reach out to us and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm mb-2 text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm mb-2 text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm mb-2 text-gray-700">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select a subject</option>
                    <option value="volunteer">Volunteer Opportunities</option>
                    <option value="donation">Make a Donation</option>
                    <option value="partnership">Partnership Inquiry</option>
                    <option value="programs">Program Information</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm mb-2 text-gray-700">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitted}
                  className="w-full px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitted ? (
                    "Message Sent!"
                  ) : (
                    <>
                      <Send className="size-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-3xl mb-6">Contact Information</h2>
              <p className="text-gray-600 mb-8">
                You can also reach us through any of the following channels. We're here to help and answer any questions you may have.
              </p>

              <div className="space-y-6">
                {contactInfo.map((info, index) => {
                  const Icon = info.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="size-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="size-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg mb-2">{info.title}</h3>
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-gray-600 text-sm">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Map Placeholder */}
              <div className="mt-8 bg-gray-200 h-64 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="size-12 mx-auto mb-2" />
                  <p className="text-sm">Map Location</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donation Info */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl mb-6">Make a Donation</h2>
            <p className="text-gray-600 mb-8">
              Your generous donations help us continue our mission to transform lives. Every contribution makes a difference.
            </p>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-xl mb-4">Bank Transfer Details</h3>
              <div className="space-y-3 text-left max-w-md mx-auto text-sm text-gray-600">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium">Bank Name:</span>
                  <span>Stanbic Bank Uganda</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium">Account Name:</span>
                  <span>UDAIREHAB NGO</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium">Account Number:</span>
                  <span>1234567890</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium">Swift Code:</span>
                  <span>SBICUGKX</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> All donations are tax-deductible. Please email your donation receipt to donations@udairehab.org to receive your tax certificate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600">
              Quick answers to common questions about UDAI and our programs.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg mb-2">How can I volunteer with UDAIREHAB?</h3>
              <p className="text-gray-600 text-sm">
                You can start by filling out the contact form above and selecting "Volunteer Opportunities" as your subject. Our team will get back to you with information about current opportunities and the application process.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg mb-2">Are donations tax-deductible?</h3>
              <p className="text-gray-600 text-sm">
                Yes, UDAIREHAB is a registered NGO and all donations are tax-deductible. We will provide you with an official receipt for tax purposes.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg mb-2">How can I partner with UDAIREHAB?</h3>
              <p className="text-gray-600 text-sm">
                We welcome partnerships with organizations, businesses, and institutions that share our values. Please contact us through the form above or email us directly at partnerships@udairehab.org to discuss collaboration opportunities.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg mb-2">Where does my donation go?</h3>
              <p className="text-gray-600 text-sm">
                Your donations directly support our programs including healthcare services, education, community development, and operational costs. We maintain transparency in our financial reporting and can provide detailed breakdowns upon request.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
