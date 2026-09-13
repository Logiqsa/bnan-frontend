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
import AppStoreButtons from "@/components/AppStoreButtons";
import { phoneHref, useContactSettings } from "@/contexts/ContactSettingsContext";
import SocialPlatformIcon, { socialPlatforms } from "@/components/SocialPlatformIcon";

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
  const { settings } = useContactSettings();
  return (
    <footer ref={ref} id="contact" className="bg-hero-gradient pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-12 mb-12 md:grid-cols-2 lg:grid-cols-4">
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
              {[...settings.socialLinks].filter((social) => social.isActive).sort((a, b) => a.order - b.order).map((social, index) => {
                const label = socialPlatforms.find((platform) => platform.value === social.platform)?.label || social.platform;
                return <a key={social.id || `${social.platform}-${index}`} href={social.url} aria-label={label} title={label} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                  <SocialPlatformIcon platform={social.platform} className="h-4 w-4 text-primary-foreground/70" />
                </a>;
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-cairo font-bold mb-4 text-primary-foreground">
              {pick("روابط سريعة", "Quick links")}
            </h4>
            <ul className="space-y-2">
              {[
                { label: pick("المناهج", "Curricula"), href: "/#curricula" },
                { label: pick("المميزات", "Features"), href: "/#features" },
                { label: pick("آراء العملاء", "Testimonials"), href: "/#testimonials" },
                { label: pick("تواصل معنا", "Contact us"), href: "/#contact" },
                { label: pick("سياسة الخصوصية", "Privacy Policy"), href: "/privacy-policy" },
                { label: pick("الشروط والأحكام", "Terms & Conditions"), href: "/terms-and-conditions" },
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
              {settings.emails.map((email, index) => <li key={email.id || `${email.value}-${index}`}>
                <a
                  href={`mailto:${email.value}`}
                  className="flex items-center gap-2 text-sm font-tajawal text-primary-foreground/60 hover:text-secondary transition-colors"
                >
                  <Mail className="w-4 h-4 text-secondary shrink-0" />
                  <span dir="ltr">{email.value}</span>
                </a>
              </li>)}
              {settings.phones.map((phone, index) => <li key={phone.id || `${phone.value}-${index}`}>
                <a
                  href={phoneHref(phone.value)}
                  className="flex items-center gap-2 text-sm font-tajawal text-primary-foreground/60 hover:text-secondary transition-colors"
                >
                  <Phone className="w-4 h-4 text-secondary shrink-0" />
                  <span dir="ltr">{phone.value}</span>
                </a>
              </li>)}
              <li className="flex items-center gap-2 text-sm font-tajawal text-primary-foreground/60">
                <MapPin className="w-4 h-4 text-secondary shrink-0" /> {pick("الرياض", "Riyadh")}
              </li>
            </ul>
          </div>

          {/* App download */}
          <div>
            <h4 className="text-base font-cairo font-bold mb-3 text-primary-foreground">
              {pick("حمّل تطبيق أكاديمية بنان", "Download the BNAN Academy app")}
            </h4>
            <p className="mb-5 text-sm leading-6 font-tajawal text-primary-foreground/60">
              {pick("اضغط على المتجر المناسب لجهازك لتحميل التطبيق", "Choose your device's store to download the app")}
            </p>
            <AppStoreButtons onDark compact footerStyle className="max-w-[240px] sm:max-w-none" />
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
            <div className="order-3 w-full text-center font-tajawal text-xs text-primary-foreground/60 md:order-2 md:w-auto">
              <p className="leading-6">© 2026 {pick("جميع الحقوق محفوظة لشركة BNAN", "All rights reserved to BNAN")}</p>
              <nav aria-label={pick("الروابط القانونية", "Legal links")} className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 md:mt-0 md:inline-flex">
                <span className="hidden md:inline" aria-hidden="true">•</span>
                <Link to="/privacy-policy" className="rounded-md px-2 py-1 font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-secondary">{pick("سياسة الخصوصية", "Privacy Policy")}</Link>
                <span className="text-primary-foreground/35" aria-hidden="true">•</span>
                <Link to="/terms-and-conditions" className="rounded-md px-2 py-1 font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-secondary">{pick("الشروط والأحكام", "Terms & Conditions")}</Link>
              </nav>
            </div>

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
