import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy, createContext } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import SmokeyBackground from '@/components/lightswind/smokey-background';

// Pages (public, chargées normalement)
import Home from '@/pages/Home';
import Shop from '@/pages/Shop';
import ProductDetail from '@/pages/ProductDetail';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import MyAccount from '@/pages/MyAccount';
import MyOrders from '@/pages/MyOrders';
import Checkout from '@/pages/Checkout';
import Wishlist from '@/pages/Wishlist';
import { WishlistProvider } from '@/contexts/WishlistContext';

// Admin Pages (lazy-loaded pour réduire le bundle public)
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const ProductForm = lazy(() => import('@/pages/admin/ProductForm'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminPromotions = lazy(() => import('@/pages/admin/Promotions'));

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[--site-bg] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Avoid <Navigate> during SSR
    if (typeof window === 'undefined') return null;
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    if (typeof window === 'undefined') return null;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/shop/:categorySlug" element={<Shop />} />
      <Route path="/product/:slug" element={<ProductDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />

      {/* Protected User Routes */}
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <MyAccount />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/orders"
        element={
          <ProtectedRoute>
            <MyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/wishlist"
        element={
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <AdminProducts />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/new"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <ProductForm />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/edit/:id"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <ProductForm />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <AdminUsers />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <AdminOrders />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/promotions"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <AdminPromotions />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<div className="min-h-screen bg-[--site-bg] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" /></div>}>
              <AdminSettings />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route 
        path="*" 
        element={
          typeof window !== 'undefined' ? (
            <Navigate to="/" replace />
          ) : null
        } 
      />
    </Routes>
  );
}

export interface PreloadedData {
  categories?: { id: string; name: string; slug: string }[];
  product?: any;
  [key: string]: any;
}

export const PreloadedDataContext = createContext<PreloadedData | null>(null);

function App({ 
  RouterComponent, 
  preloadedData 
}: { 
  RouterComponent?: React.ComponentType<{ children: React.ReactNode }>;
  preloadedData?: PreloadedData;
}) {
  const resolvedPreloadedData = preloadedData || (typeof window !== 'undefined' ? (window as { __PRELOADED_DATA__?: PreloadedData }).__PRELOADED_DATA__ || null : null);
  const { settings: fetchedSettings } = useSettings();
  const settings = resolvedPreloadedData?.settings || fetchedSettings;
  
  const panel = settings?.sitePanelColor || '#2a3a4a';
  const showAnimated = Boolean(settings?.animatedBackground);
  const blurAmount = (settings?.animatedBlur as string) || 'sm';
  const smokey = (settings?.smokeyColor || panel || '#2a3a4a').slice(0, 7);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const Router = RouterComponent ?? BrowserRouter;

  // Prevent hydration mismatch: root attributes must be static until mounted
  const currentShowAnimated = mounted ? showAnimated : Boolean(resolvedPreloadedData?.settings?.animatedBackground);

  // Robust hydration: root attributes must be static until mounted
  const rootClassName = mounted && currentShowAnimated ? 'animated-bg-on' : (currentShowAnimated ? 'animated-bg-on' : undefined);

  return (
    <div className={rootClassName} style={{ minHeight: '100vh' }}>
      <SmokeyBackground className="fixed inset-0 -z-10" color={smokey} backdropBlurAmount={blurAmount} />
      <div className="fixed inset-0 -z-9 pointer-events-none" style={{ background: 'transparent' }} />
      <style>
        {`
          /* Ensure all sections and body are transparent to show SmokeyBackground */
          .bg-\[--site-bg\] { background: transparent !important; }
          body { background: transparent !important; }
        `}
      </style>
      <Router>
        <PreloadedDataContext.Provider value={resolvedPreloadedData}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <AppRoutes />
                <Toaster 
                  position="top-right" 
                  toastOptions={{
                    style: {
                      background: '#2a3a4a',
                      color: '#fff4e9',
                      border: '1px solid rgba(255, 244, 233, 0.2)',
                    },
                  }}
                />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </PreloadedDataContext.Provider>
      </Router>
    </div>
  );
}

export default App;

