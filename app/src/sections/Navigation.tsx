import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import AnnouncementBar from './AnnouncementBar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalItems, toggleCart } = useCart();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Shop', href: '/shop' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'glass-effect border-b border-[#fff4e9]/20'
          : 'bg-transparent'
      }`}
    >
      <AnnouncementBar />
      <nav className="section-padding">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className={`flex items-center h-full transition-transform duration-500 ${
              isScrolled ? 'scale-90' : 'scale-100'
            }`}
          >
            <img 
              src="/images/logo.png" 
              alt="Tafchaa" 
              className="h-full w-auto object-contain py-2"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`relative text-sm font-medium tracking-wider uppercase transition-colors duration-300 ${
                  isActive(link.href)
                    ? 'text-[#fff4e9]'
                    : 'text-[#fff4e9]/70 hover:text-[#fff4e9]'
                }`}
              >
                {link.name}
                <span
                  className={`absolute -bottom-1 left-1/2 h-px bg-[#fff4e9] transition-all duration-300 ${
                    isActive(link.href)
                      ? 'w-full -translate-x-1/2'
                      : 'w-0 -translate-x-1/2 group-hover:w-full'
                  }`}
                />
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <button
              onClick={toggleCart}
              className="relative p-2 text-[#fff4e9] hover:text-[#f3e7d9] transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#fff4e9] text-[#5b8bfb] text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                  {totalItems}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 text-[#fff4e9] hover:text-[#f3e7d9] transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[--panel-bg] border-[#fff4e9]/20">
                  <div className="px-3 py-2 text-sm text-[#fff4e9]">
                    <p className="font-medium">{user?.firstName || user?.email}</p>
                    <p className="text-[#fff4e9]/60 text-xs">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-[#fff4e9]/10" />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="text-[#fff4e9] hover:bg-[#fff4e9]/10 cursor-pointer">
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/orders" className="text-[#fff4e9] hover:bg-[#fff4e9]/10 cursor-pointer">
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="text-[#fff4e9] hover:bg-[#fff4e9]/10 cursor-pointer">
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-[#fff4e9]/10" />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="text-[#fff4e9] hover:bg-[#fff4e9]/10 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="p-2 text-[#fff4e9] hover:text-[#f3e7d9] transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="md:hidden p-2 text-[#fff4e9]">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[--site-bg] border-[#fff4e9]/20 w-80 p-5">
                <div className="flex flex-col gap-8 mt-8">
                  <img 
                    src="/images/logo.png" 
                    alt="Tafchaa" 
                    className="h-12 w-auto object-contain"
                  />
                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link, index) => (
                      <Link
                        key={link.name}
                        to={link.href}
                        className="text-2xl font-display text-[#fff4e9] hover:text-[#f3e7d9] transition-colors animate-slide-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {link.name}
                      </Link>
                    ))}
                  </nav>
                  {!isAuthenticated && (
                    <div className="flex flex-col gap-3 mt-auto">
                      <Link
                        to="/login"
                        className="btn-primary text-center"
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="btn-secondary text-center"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
