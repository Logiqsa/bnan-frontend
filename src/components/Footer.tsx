import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import logoImg from "@/assets/logo-bnan.png";
import saudiBusinessCenter from "@/assets/partners/saudi-business-center.png";
import ministryCommerce from "@/assets/partners/ministry-commerce.png";
import maroof from "@/assets/partners/maroof.png";
import visaImg from "@/assets/payment/visa.png";
import mastercardImg from "@/assets/payment/mastercard.png";
import applePayImg from "@/assets/payment/apple-pay.png";
import madaImg from "@/assets/payment/mada.png";
import tamaraImg from "@/assets/payment/tamara.png";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const partners = [
  { src: saudiBusinessCenter, alt: "المركز السعودي للأعمال" },
  { src: ministryCommerce, alt: "وزارة التجارة" },
  { src: maroof, alt: "معروف" },
];

const paymentMethods = [
  { src: visaImg, alt: "Visa" },
  { src: mastercardImg, alt: "Mastercard" },
  { src: applePayImg, alt: "Apple Pay" },
  { src: madaImg, alt: "مدى" },
  { src: tamaraImg, alt: "Tamara" },
];

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { pick } = useLanguage();
  return (
    <footer ref={ref} id="contact" className="bg-hero-gradient pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logoImg} alt="BNAN Academy" className="h-10 w-auto object-contain brightness-0 invert" />
              <span className="text-xl font-cairo font-bold text-primary-foreground">
                BNAN Academy
              </span>
            </div>
            <p className="text-sm font-tajawal leading-relaxed text-primary-foreground/60">
              {pick("منصة تعليم إلكتروني متكاملة تخدم الطلاب في جميع أنحاء العالم العربي", "An integrated online learning platform serving students across the Arab world")}
            </p>
            {/* Social Media */}
            <div className="flex items-center gap-3 mt-4">
              <a href="https://www.instagram.com/bnanacademy_sa?igsh=eWN4c2RyNnoxZzBy&utm_source=qr" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <svg className="w-4 h-4 text-primary-foreground/70" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://x.com/bnanacademy_sa" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <svg className="w-4 h-4 text-primary-foreground/70" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@bnanacademy_sa" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <svg className="w-4 h-4 text-primary-foreground/70" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
              <a href="https://snapchat.com/t/J3dAMP59" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <svg className="w-4 h-4 text-primary-foreground/70" fill="currentColor" viewBox="0 0 512 512"><path d="M496.926 366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.7-52.772-46.37-3.407-5.2-6.96-10.632-10.2-16.384a7.15 7.15 0 01-.555-6.158 9.142 9.142 0 015.193-4.87c7.7-3.2 15.946-6.316 22.23-8.893 8.2-3.373 14.27-6.912 19.157-11.3a32.27 32.27 0 009.881-24.109 30.087 30.087 0 00-9.411-21.626c-7.627-7.66-17.863-11.863-28.9-11.863a41.826 41.826 0 00-13.073 2.084 63.88 63.88 0 01-5.7 1.985c-.57 0-.97-.124-1.1-.7.3-22.474-1.1-49.452-10.3-72.327C371.5 74.8 325.678 35.555 259.2 31.993c-1.337-.066-2.73-.1-4.067-.1H254.6c-1.1 0-2.2.033-3.3.066-66.318 3.456-112.246 42.7-134.4 89.437-9.292 22.983-10.665 49.852-10.3 72.327-.165.6-.555.7-1.1.7a65.48 65.48 0 01-5.7-1.985 41.826 41.826 0 00-13.073-2.084c-11.032 0-21.263 4.2-28.9 11.863a30.083 30.083 0 00-9.397 21.626 32.27 32.27 0 009.88 24.109c4.888 4.39 10.96 7.926 19.157 11.3 6.282 2.577 14.53 5.7 22.23 8.893a9.316 9.316 0 015.2 4.87 7.14 7.14 0 01-.554 6.158c-3.252 5.752-6.8 11.182-10.2 16.384-12.163 18.666-29.97 34.28-52.772 46.37-2.22 1.153-4.452 2.245-6.634 3.373-1.079.5-2.344 1.141-3.72 1.947-7.315 4.067-13.74 8.977-17.112 18.153-4.42 12.014-.88 25.2 10.3 38.269 13.37 15.64 36.4 23.985 51.6 26.4a26.269 26.269 0 013.752 1.125c4.7 1.965 5.638 6.6 6.4 10.7.578 3.178 2.4 5.562 5.454 7.1a33.06 33.06 0 0014.628 3.373 59.64 59.64 0 0013.484-2.017 110.57 110.57 0 0118.381-3.813c4.226-.38 8.505.223 13.073 1.848 10.4 3.72 20.036 10.1 30.953 17.408 18.3 12.254 39.058 26.135 68.3 28.7a17.3 17.3 0 001.87.1h.549a17.3 17.3 0 001.87-.1c29.239-2.56 49.993-16.446 68.3-28.7 10.917-7.308 20.546-13.688 30.953-17.408 4.568-1.625 8.847-2.228 13.073-1.848a110.57 110.57 0 0118.381 3.813 59.64 59.64 0 0013.484 2.017 33.06 33.06 0 0014.628-3.373c3.054-1.541 4.876-3.925 5.454-7.1.765-4.1 1.7-8.737 6.4-10.7a26.269 26.269 0 013.752-1.125c15.2-2.42 38.232-10.76 51.6-26.4C497.806 391.8 501.346 378.614 496.926 366.6z"/></svg>
              </a>
              <a href="https://www.facebook.com/share/19P2F1jE38/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <svg className="w-4 h-4 text-primary-foreground/70" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.youtube.com/@BnanAcademy_sa" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <svg className="w-4 h-4 text-primary-foreground/70" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-cairo font-bold mb-4 text-primary-foreground">
              {pick("روابط سريعة", "Quick links")}
            </h4>
            <ul className="space-y-2">
              {[
                { label: pick("المناهج", "Curricula"), href: "#curricula" },
                { label: pick("المميزات", "Features"), href: "#features" },
                { label: pick("آراء العملاء", "Testimonials"), href: "#testimonials" },
                { label: pick("تواصل معنا", "Contact us"), href: "#contact" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm font-tajawal text-primary-foreground/60 hover:text-secondary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base font-cairo font-bold mb-4 text-primary-foreground">
              {pick("تواصل معنا", "Contact us")}
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@bnanacademysa.com"
                  className="flex items-center gap-2 text-sm font-tajawal text-primary-foreground/60 hover:text-secondary transition-colors"
                >
                  <Mail className="w-4 h-4 text-secondary shrink-0" />
                  <span dir="ltr">info@bnanacademysa.com</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+966582502026"
                  className="flex items-center gap-2 text-sm font-tajawal text-primary-foreground/60 hover:text-secondary transition-colors"
                >
                  <Phone className="w-4 h-4 text-secondary shrink-0" />
                  <span dir="ltr">+966 58 250 2026</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+966530808189"
                  className="flex items-center gap-2 text-sm font-tajawal text-primary-foreground/60 hover:text-secondary transition-colors"
                >
                  <Phone className="w-4 h-4 text-secondary shrink-0" />
                  <span dir="ltr">+966 53 080 8189</span>
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm font-tajawal text-primary-foreground/60">
                <MapPin className="w-4 h-4 text-secondary shrink-0" /> {pick("الرياض", "Riyadh")}
              </li>
            </ul>
          </div>
        </div>


        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/10 pt-5 pb-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Partners - Right (RTL) */}
            <div className="flex items-center gap-3 flex-wrap order-1 md:order-1">
              {partners.map((partner, index) => (
                <div key={index} className="bg-white rounded-xl px-3 py-2">
                  <img
                    src={partner.src}
                    alt={partner.alt}
                    loading="lazy"
                    className="h-10 w-auto object-contain"
                  />
                </div>
              ))}
            </div>

            {/* Copyright - Center */}
            <p className="text-xs font-tajawal text-primary-foreground/50 order-3 md:order-2 whitespace-nowrap">
              © 2026 {pick("جميع الحقوق محفوظة لشركة BNAN", "All rights reserved to BNAN")}
              <span className="mx-2">•</span>
              <Link to="/privacy-policy" className="hover:text-secondary transition-colors">{pick("سياسة الخصوصية", "Privacy Policy")}</Link>
              <span className="mx-2">•</span>
              <Link to="/terms-and-conditions" className="hover:text-secondary transition-colors">{pick("الشروط والأحكام", "Terms & Conditions")}</Link>
            </p>

            {/* Payment Methods - Left (RTL) */}
            <div className="flex items-center gap-4 order-2 md:order-3">
              {paymentMethods.map((method, index) => (
                <img
                  key={index}
                  src={method.src}
                  alt={method.alt}
                  loading="lazy"
                  className="h-14 w-auto object-contain"
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
