import { Link } from "react-router-dom";
import { Home } from "lucide-react";

interface Props {
  className?: string;
  variant?: "light" | "dark";
}

const BackToHomeButton = ({ className = "", variant = "light" }: Props) => {
  const colorClasses =
    variant === "light"
      ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20"
      : "bg-card hover:bg-muted text-foreground border-border";

  return (
    <Link
      to="/"
      className={`fixed top-4 right-4 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md font-cairo text-sm shadow-elegant transition-all hover:scale-105 ${colorClasses} ${className}`}
    >
      <Home className="w-4 h-4" />
      الصفحة الرئيسية
    </Link>
  );
};

export default BackToHomeButton;
