import { useState } from 'react';
import { Mail, Phone, MapPin, Send, Instagram, Facebook  } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

export default function Contact() {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Message sent successfully! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: settings?.contactEmail || 'hello@tafcha.com',
      href: `mailto:${settings?.contactEmail || 'hello@tafcha.com'}`,
    },
    {
      icon: Phone,
      label: 'Phone',
      value: settings?.contactPhone || '+216 99 888 777',
      href: `tel:${(settings?.contactPhone || '+216 99 888 777').replace(/\s/g, '')}`,
    },
    {
      icon: MapPin,
      label: 'Address',
      value: settings?.contactAddress || 'Tunis, Tunisia',
      href: '#',
    },
  ];

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>Contact | Tafchaa</title>
        <meta name="description" content="Contact the Tafchaa team for any questions about our jewelry or your orders." />
        <meta property="og:title" content="Contact | Tafchaa" />
        <meta property="og:description" content="Contact the Tafchaa team for any questions about our jewelry or your orders." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tafcha.com/contact" />
        <link rel="canonical" href="https://tafcha.com/contact" />
      </Helmet>
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-32 pb-20 section-padding border-b border-[#fff4e9]/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-[#fff4e9] mb-6">
            Contact Us
          </h1>
          <p className="text-xl text-[#fff4e9]/70 max-w-2xl mx-auto leading-relaxed">
            We'd love to hear from you. Whether you have a question about our products, 
            need help with an order, or just want to say hello.
          </p>
        </div>
      </div>

      {/* Contact Info Cards */}
      <section className="py-16 section-padding -mt-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="border border-[#fff4e9]/10 rounded-lg p-6 text-center group hover:bg-[#fff4e9]/5 transition-colors backdrop-blur-sm"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#fff4e9]/10 flex items-center justify-center
                                group-hover:bg-[#fff4e9]/20 transition-colors">
                    <Icon className="w-6 h-6 text-[#fff4e9]" />
                  </div>
                  <h3 className="text-sm text-[#fff4e9]/60 uppercase tracking-wider mb-1">
                    {item.label}
                  </h3>
                  <p className="text-[#fff4e9] font-medium">
                    {item.value}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 section-padding">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start text-center lg:text-left">
            {/* Form */}
            <div className="border border-[#fff4e9]/10 p-8 rounded-xl backdrop-blur-sm text-left">
              <h2 className="font-display text-3xl text-[#fff4e9] mb-6 text-center lg:text-left">
                Send Us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-[#fff4e9]/80 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-transparent border border-[#fff4e9]/30 rounded
                               text-[#fff4e9] placeholder-[#fff4e9]/40
                               focus:outline-none focus:border-[#fff4e9]/50 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#fff4e9]/80 mb-2">
                      Your Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-transparent border border-[#fff4e9]/30 rounded
                               text-[#fff4e9] placeholder-[#fff4e9]/40
                               focus:outline-none focus:border-[#fff4e9]/50 transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#fff4e9]/80 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-[#fff4e9]/30 rounded
                             text-[#fff4e9] placeholder-[#fff4e9]/40
                             focus:outline-none focus:border-[#fff4e9]/50 transition-colors"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#fff4e9]/80 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-transparent border border-[#fff4e9]/30 rounded
                             text-[#fff4e9] placeholder-[#fff4e9]/40
                             focus:outline-none focus:border-[#fff4e9]/50 transition-colors resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-[#3d4d5d] border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Info Side */}
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-3xl text-[#fff4e9] mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      q: 'What is your shipping policy?',
                      a: 'We offer free shipping on orders over $100. Standard shipping takes 3-5 business days.',
                    },
                    {
                      q: 'How do I care for my jewelry?',
                      a: 'Store your jewelry in a dry place, avoid contact with chemicals, and clean gently with a soft cloth.',
                    },
                    {
                      q: 'What is your return policy?',
                      a: 'We offer a 30-day hassle-free return policy on all unused items in original packaging.',
                    },
                    {
                      q: 'Do you offer gift wrapping?',
                      a: 'Yes! All orders come in our signature gift-ready packaging at no extra cost.',
                    },
                  ].map((faq, index) => (
                    <div key={index} className="border-b border-[#fff4e9]/10 pb-4">
                      <h3 className="text-[#fff4e9] font-medium mb-2">{faq.q}</h3>
                      <p className="text-[#fff4e9]/60 text-sm">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="font-display text-xl text-[#fff4e9] mb-4 text-center lg:text-left">
                  Follow Us
                </h3>
                <div className="flex justify-center lg:justify-start gap-3">
                  {[
                    { icon: Instagram, href: settings?.socialInstagram || '#' },
                    { icon: Facebook, href: settings?.socialFacebook || '#' },
                  ].map((social, index) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={index}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full border border-[#fff4e9]/30 flex items-center justify-center
                                 text-[#fff4e9] hover:bg-[#fff4e9] hover:text-[#3d4d5d] transition-all"
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
      <CartDrawer />
    </div>
  );
}
