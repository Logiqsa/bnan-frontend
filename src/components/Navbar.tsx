import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo-bnan.png";


const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/#about" },
  { label: "المناهج", href: "/#curricula" },
  { label: "الدورات", href: "/courses" },
  { label: "آراء عملائنا", href: "/#testimonials" },
  { label: "انضم كمعلم", href: "/#join-teacher" },
  { label: "تواصل معنا", href: "/contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => setIsOpen(false);

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
            <a href="/portal/login">
              <Button variant="ghost" size="sm" className="font-cairo text-muted-foreground hover:text-primary">
                تسجيل الدخول
              </Button>
            </a>
            <a href="/portal/teacher/signup">
              <Button size="sm" className="font-cairo bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sky">
               إنشاء حساب
              </Button>
            </a>
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
              <a href="/portal/login"><Button variant="ghost" size="sm" className="font-cairo w-full">تسجيل الدخول</Button></a>
              <a href="/portal/teacher/signup">
                <Button size="sm" className="font-cairo bg-secondary text-secondary-foreground w-full mt-2">
               إنشاء حساب
                </Button>
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
