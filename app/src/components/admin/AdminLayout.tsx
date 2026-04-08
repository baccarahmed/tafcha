import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { 
  IconBrandTabler, 
  IconPackage, 
  IconUsers, 
  IconShoppingCart, 
  IconSettings,
  IconTag,
  IconArrowLeft 
} from "@tabler/icons-react";
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ordersAPI } from '@/services/api';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Polling des nouvelles commandes (notification)
  const pendingRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    
    let mounted = true;
    const fetchStats = async () => {
      try {
        const data = await ordersAPI.getStats();
        const pending = data.stats?.pendingOrders ?? 0;
        if (mounted) {
          if (pendingRef.current !== null && pending > pendingRef.current) {
            toast.info(`Nouvelle commande reçue (${pending - pendingRef.current})`);
          }
          pendingRef.current = pending;
        }
      } catch {
        // ignore
      }
    };
    // Initial sans notification
    fetchStats();
    const id = setInterval(fetchStats, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const links = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <IconBrandTabler className={cn("h-5 w-5 shrink-0", location.pathname === "/admin" ? "text-[#fff4e9]" : "text-[#fff4e9]/60")} />,
    },
    {
      label: "Products",
      href: "/admin/products",
      icon: <IconPackage className={cn("h-5 w-5 shrink-0", location.pathname.startsWith("/admin/products") ? "text-[#fff4e9]" : "text-[#fff4e9]/60")} />,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: <IconUsers className={cn("h-5 w-5 shrink-0", location.pathname === "/admin/users" ? "text-[#fff4e9]" : "text-[#fff4e9]/60")} />,
    },
    {
      label: "Orders",
      href: "/admin/orders",
      icon: <IconShoppingCart className={cn("h-5 w-5 shrink-0", location.pathname === "/admin/orders" ? "text-[#fff4e9]" : "text-[#fff4e9]/60")} />,
    },
    {
      label: "Promotions",
      href: "/admin/promotions",
      icon: <IconTag className={cn("h-5 w-5 shrink-0", location.pathname === "/admin/promotions" ? "text-[#fff4e9]" : "text-[#fff4e9]/60")} />,
    },
    {
      label: "Site Settings",
      href: "/admin/settings",
      icon: <IconSettings className={cn("h-5 w-5 shrink-0", location.pathname === "/admin/settings" ? "text-[#fff4e9]" : "text-[#fff4e9]/60")} />,
    },
  ];

  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-[--site-bg] w-full flex-1 mx-auto overflow-hidden",
      "h-screen"
    )}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 bg-[--panel-bg] border-r border-[#fff4e9]/10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink 
                  key={idx} 
                  link={link}
                  className={cn(
                    "transition-colors",
                    location.pathname === link.href || (link.href !== "/admin" && location.pathname.startsWith(link.href))
                      ? "text-[#fff4e9] bg-[#fff4e9]/10 rounded-lg px-2"
                      : "text-[#fff4e9]/60 hover:text-[#fff4e9] px-2"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-[#fff4e9]/10 pt-4">
            <SidebarLink
              link={{
                label: user?.firstName || user?.email || "Admin",
                href: "/admin",
                icon: (
                  <div className="w-7 h-7 rounded-full bg-[#fff4e9]/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-[#fff4e9]">
                      {user?.firstName?.[0] || user?.email?.[0] || "A"}
                    </span>
                  </div>
                ),
              }}
              className="text-[#fff4e9]"
            />
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-2 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors w-full"
            >
              <IconArrowLeft className="h-5 w-5 shrink-0" />
              {open && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[--site-bg]">
        {/* Header */}
        <header className="bg-[--panel-bg] border-b border-[#fff4e9]/10 px-[5px] md:px-8 py-4">
          <h1 className="font-display text-2xl text-[#fff4e9]">{title}</h1>
        </header>

        {/* Content */}
        <div className="p-8 px-[5px] md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      to="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal"
    >
      <img src="/images/logo.png" alt="Tafchaa" className="h-10 w-auto" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display text-xl text-[#fff4e9] whitespace-pre"
      >
        Tafchaa
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      to="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal"
    >
      <img src="/images/logo.png" alt="Tafchaa" className="h-8 w-auto" />
    </Link>
  );
};
