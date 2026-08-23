import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Languages, LogOut, Menu, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/portal/PortalAuthContext";
import logoImg from "@/assets/logo-bnan.png";
import { useLanguage } from "@/i18n/LanguageContext";

const dashboardPathFor = (role: string) => (role === "admin" ? "/admin" : `/portal/${role}/schedule`);


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = usePortalAuth();
  const navigate = useNavigate();
  const { isArabic, toggleLanguage, pick } = useLanguage();
  const navLinks = [
    { label: pick("الرئيسية", "Home"), href: "/" },
    { label: pick("من نحن", "About us"), href: "/#about" },
    { label: pick("المناهج", "Curricula"), href: "/#curricula" },
    { label: pick("الدورات", "Courses"), href: "/courses" },
    { label: pick("آراء عملائنا", "Testimonials"), href: "/#testimonials" },
    { label: pick("انضم كمعلم", "Join as a teacher"), href: "/#join-teacher" },
    { label: pick("تواصل معنا", "Contact us"), href: "/contact" },
  ];

  const handleLinkClick = () => setIsOpen(false);
  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30 shadow-elegant">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <img src={logoImg} alt="BNAN Online Academy" className="h-16 w-auto object-contain" />
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-cairo font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-2" aria-label={pick("التبديل إلى الإنجليزية", "Switch to Arabic")}>
              <Languages className="h-4 w-4" />{isArabic ? "English" : "العربية"}
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="font-cairo gap-2 text-foreground">
                    <User className="w-4 h-4" />
                    {pick("مرحبًا،", "Welcome,")} {user.fullName}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-cairo">
                  <DropdownMenuItem onClick={() => navigate(dashboardPathFor(user.role))}>
                    {pick("لوحة التحكم", "Dashboard")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 ml-2" />
                    {pick("تسجيل الخروج", "Log out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <a href="/portal/login">
                  <Button variant="ghost" size="sm" className="font-cairo text-muted-foreground hover:text-primary">
                    {pick("تسجيل الدخول", "Log in")}
                  </Button>
                </a>
                <a href="/register">
                  <Button size="sm" className="font-cairo bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sky">
                   {pick("إنشاء حساب", "Create account")}
                  </Button>
                </a>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden pb-4"
          >
            <div className="flex flex-col gap-3">
              <Button variant="outline" size="sm" onClick={toggleLanguage} className="w-full gap-2">
                <Languages className="h-4 w-4" />{isArabic ? "English" : "العربية"}
              </Button>
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={handleLinkClick}
                  className="text-sm font-cairo font-medium text-muted-foreground hover:text-primary py-2"
                >
                  {link.label}
                </a>
              ))}
              {user ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-cairo w-full gap-2"
                    onClick={() => { navigate(dashboardPathFor(user.role)); handleLinkClick(); }}
                  >
                    <User className="w-4 h-4" />
                    {pick("مرحبًا،", "Welcome,")} {user.fullName}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-cairo w-full gap-2 text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    {pick("تسجيل الخروج", "Log out")}
                  </Button>
                </>
              ) : (
                <>
                  <a href="/portal/login"><Button variant="ghost" size="sm" className="font-cairo w-full">{pick("تسجيل الدخول", "Log in")}</Button></a>
                  <a href="/register">
                    <Button size="sm" className="font-cairo bg-secondary text-secondary-foreground w-full mt-2">
                   {pick("إنشاء حساب", "Create account")}
                    </Button>
                  </a>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
