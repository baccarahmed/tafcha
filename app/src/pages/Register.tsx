import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Navigation />
      
      <div className="pt-32 pb-16 section-padding flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-md border border-[#fff4e9]/10 p-8 rounded-xl backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl text-[#fff4e9] mb-2">
              Create Account
            </h1>
            <p className="text-[#fff4e9]/60">
              Join the Tafchaa family
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#fff4e9]/80">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fff4e9]/40" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-transparent border border-[#fff4e9]/30 rounded
                             text-[#fff4e9] placeholder-[#fff4e9]/40
                             focus:outline-none focus:border-[#fff4e9] transition-colors"
                    placeholder="John"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#fff4e9]/80">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-4 bg-transparent border border-[#fff4e9]/30 rounded
                           text-[#fff4e9] placeholder-[#fff4e9]/40
                           focus:outline-none focus:border-[#fff4e9] transition-colors"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm text-[#fff4e9]/80">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fff4e9]/40" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-transparent border border-[#fff4e9]/30 rounded
                           text-[#fff4e9] placeholder-[#fff4e9]/40
                           focus:outline-none focus:border-[#fff4e9] transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm text-[#fff4e9]/80">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fff4e9]/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full pl-12 pr-12 py-4 bg-transparent border border-[#fff4e9]/30 rounded
                           text-[#fff4e9] placeholder-[#fff4e9]/40
                           focus:outline-none focus:border-[#fff4e9] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#fff4e9]/40 hover:text-[#fff4e9] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm text-[#fff4e9]/80">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fff4e9]/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-[--site-bg] border border-[#fff4e9]/30 rounded
                           text-[#fff4e9] placeholder-[#fff4e9]/40
                           focus:outline-none focus:border-[#fff4e9] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="font-semibold uppercase tracking-wider">Create Account</span>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-[#fff4e9]/60 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#fff4e9] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
