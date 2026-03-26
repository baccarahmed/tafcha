import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Package, Heart, Lock, Save, ChevronRight } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function MyAccount() {
  const { user, isAuthenticated, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    country: user?.country || '',
    postalCode: user?.postalCode || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        country: profileData.country,
        postalCode: profileData.postalCode,
      });
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    { name: 'My Profile', icon: User, href: '/account', active: true },
    { name: 'My Orders', icon: Package, href: '/account/orders' },
    { name: 'Wishlist', icon: Heart, href: '/account/wishlist' },
  ];

  const inputClass = "w-full px-4 py-3 bg-transparent border border-[#fff4e9]/20 rounded text-[#fff4e9] \
                      placeholder-[#fff4e9]/40 focus:outline-none focus:border-[#fff4e9]/50 transition-colors";

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Navigation />
      
      {/* Header */}
      <div className="pt-32 pb-12 section-padding border-b border-[#fff4e9]/10">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl text-[#fff4e9] mb-2">
            My Account
          </h1>
          <p className="text-[#fff4e9]/60">
            Welcome back, {user?.firstName || user?.email}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="py-12 section-padding">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="border border-[#fff4e9]/10 rounded-lg p-4">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          item.active
                            ? 'bg-[#fff4e9]/10 text-[#fff4e9]'
                            : 'text-[#fff4e9]/60 hover:bg-[#fff4e9]/5 hover:text-[#fff4e9]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-[#fff4e9] text-[#3d4d5d]'
                      : 'border border-[#fff4e9]/10 text-[#fff4e9]/60 hover:text-[#fff4e9]'
                  }`}
                >
                  Profile Details
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'password'
                      ? 'bg-[#fff4e9] text-[#3d4d5d]'
                      : 'border border-[#fff4e9]/10 text-[#fff4e9]/60 hover:text-[#fff4e9]'
                  }`}
                >
                  Change Password
                </button>
              </div>

              {/* Profile Form */}
              {activeTab === 'profile' && (
                <div className="border border-[#fff4e9]/10 rounded-xl p-8">
                  <h2 className="font-display text-2xl text-[#fff4e9] mb-6">
                    Personal Information
                  </h2>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-[#fff4e9]/80 mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
                          <input
                            type="text"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                            className={`${inputClass} pl-10`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-[#fff4e9]/80 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-[#fff4e9]/80 mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
                          <input
                            type="email"
                            value={profileData.email}
                            disabled
                            className={`${inputClass} pl-10 opacity-50`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-[#fff4e9]/80 mb-2">
                          Phone
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
                          <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            className={`${inputClass} pl-10`}
                            placeholder="+216 99 888 777"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#fff4e9]/80 mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
                        <input
                          type="text"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          className={`${inputClass} pl-10`}
                          placeholder="Street address"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm text-[#fff4e9]/80 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={profileData.city}
                          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#fff4e9]/80 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          value={profileData.country}
                          onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#fff4e9]/80 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={profileData.postalCode}
                          onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-secondary flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#3d4d5d] border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Password Form */}
              {activeTab === 'password' && (
                <div className="border border-[#fff4e9]/10 rounded-xl p-8">
                  <h2 className="font-display text-2xl text-[#fff4e9] mb-6">
                    Change Password
                  </h2>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-sm text-[#fff4e9]/80 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          required
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#fff4e9]/80 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          required
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#fff4e9]/80 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          required
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-secondary flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#3d4d5d] border-t-transparent rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Update Password
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <CartDrawer />
    </div>
  );
}
