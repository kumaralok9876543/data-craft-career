import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, BookOpen, FileText, Star, Compass, LogOut, Menu, X, Moon, Sun, User, CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  const navItems = user ? [
    { to: "/dashboard", label: "Jobs", icon: Briefcase },
    { to: "/recommendations", label: "For You", icon: Compass },
    { to: "/applied", label: "Applied", icon: CheckCircle2 },
    { to: "/resume", label: "Resume", icon: FileText },
    { to: "/study-plan", label: "Study Plan", icon: BookOpen },
    { to: "/bookmarks", label: "Saved", icon: Star },
  ] : [];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            DE
          </div>
          <span className="hidden font-bold text-lg sm:block">DataEng Jobs</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button
                variant={isActive(to) ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/login">
              <Button size="sm" className="gap-2">
                <User className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t bg-background p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={isActive(to) ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
