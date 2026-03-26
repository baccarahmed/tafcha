import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
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
              Welcome Back
            </h1>
            <p className="text-[#fff4e9]/60">
              Sign in to access your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

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

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 inline-flex animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 hover:text-[#fff4e9] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="font-semibold uppercase tracking-wider">Sign In</span>
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-[#fff4e9]/60 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#fff4e9] hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
