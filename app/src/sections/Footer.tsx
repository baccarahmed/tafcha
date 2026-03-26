import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function Footer() {
  const footerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const menuLinks = [
    { name: 'Shop', href: '/shop' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const collectionLinks = [
    { name: 'Minimalist Elegance', href: '/shop?category=minimalist-elegance' },
    { name: 'Bridal Bliss', href: '/shop?category=bridal-bliss' },
    { name: 'Timeless Classics', href: '/shop?category=timeless-classics' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Delivery & Returns', href: '/shipping' },
  ];

  const socialLinks = [
    { icon: Instagram, href: settings?.socialInstagram || '#', label: 'Instagram' },
    { icon: Facebook, href: settings?.socialFacebook || '#', label: 'Facebook' },
  ];

  return (
    <footer
      ref={footerRef}
      className="bg-[--panel-bg] relative overflow-hidden"
    >
      {/* Wave Divider */}
      <svg
        className="absolute top-0 left-0 right-0 w-full h-12 -translate-y-full"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
      >
        <path
          d="M0,48 C480,0 960,48 1440,0 L1440,48 L0,48 Z"
          fill="var(--panel-bg)"
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </svg>

      <div className="section-padding py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div
            className={`transition-all duration-600 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{
              transitionDelay: '200ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Link to="/" className="inline-block mb-6">
              <img
                src="/images/logo.png"
                alt="Tafchaa"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-[#fff4e9]/60 text-sm mb-6 max-w-xs">
              The little something you've been missing. Elegant accessories crafted with love and timeless craftsmanship.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              {settings?.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-3 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  {settings.contactEmail}
                </a>
              )}
              {settings?.contactPhone && (
                <a
                  href={`tel:${settings.contactPhone}`}
                  className="flex items-center gap-3 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors text-sm"
                >
                  <Phone className="w-4 h-4" />
                  {settings.contactPhone}
                </a>
              )}
              {settings?.contactAddress && (
                <div className="flex items-start gap-3 text-[#fff4e9]/60 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  {settings.contactAddress}
                </div>
              )}
            </div>
          </div>

          {/* Menu Column */}
          <div
            className={`transition-all duration-600 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{
              transitionDelay: '300ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <h3 className="font-display text-xl text-[#fff4e9] mb-6">Menu</h3>
            <ul className="space-y-3">
              {menuLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors text-sm relative group"
                  >
                    {link.name}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#fff4e9] group-hover:w-full transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Collections Column */}
          <div
            className={`transition-all duration-600 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{
              transitionDelay: '400ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <h3 className="font-display text-xl text-[#fff4e9] mb-6">Collections</h3>
            <ul className="space-y-3">
              {collectionLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors text-sm relative group"
                  >
                    {link.name}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#fff4e9] group-hover:w-full transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Social Column */}
          <div
            className={`transition-all duration-600 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{
              transitionDelay: '500ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <h3 className="font-display text-xl text-[#fff4e9] mb-6">Useful</h3>
            <ul className="space-y-3 mb-8">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors text-sm relative group"
                  >
                    {link.name}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#fff4e9] group-hover:w-full transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social Links */}
            <h3 className="font-display text-xl text-[#fff4e9] mb-4">Follow Us</h3>
            <div className="flex items-center gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-full border border-[#fff4e9]/30 
                              flex items-center justify-center text-[#fff4e9]/60
                              hover:bg-[#fff4e9] hover:text-[#3d4d5d] hover:border-[#fff4e9]
                              hover:scale-110 transition-all duration-300 ${
                                isVisible
                                  ? 'opacity-100 scale-100'
                                  : 'opacity-0 scale-0'
                              }`}
                    style={{
                      transitionDelay: `${600 + index * 100}ms`,
                      transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    }}
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div
          className={`mt-16 pt-8 border-t border-[#fff4e9]/10 text-center transition-all duration-600 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          <p className="text-[#fff4e9]/40 text-sm">
            © {new Date().getFullYear()} Tafchaa. Made with{' '}
            <span className="text-red-400">♥</span> for elegant moments.
          </p>
        </div>
      </div>
    </footer>
  );
}
