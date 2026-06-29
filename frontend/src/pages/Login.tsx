import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-primary relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-healthcare-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-healthcare-teal/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glassmorphism p-8 rounded-xl shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-healthcare-cyan/15 p-3 rounded-xl text-healthcare-cyan">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to PulseFlow AI</h1>
          <p className="text-xs text-primary-muted max-w-xs">
            Enter your credentials to access the Clinical Prediction Engine dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-healthcare-rose/10 border border-healthcare-rose/25 text-healthcare-rose rounded-lg flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-primary-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="doctor@metro.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white tracking-wide uppercase">Password</label>
              <Link to="/forgot-password" className="text-xs text-healthcare-cyan hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-primary-muted absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-background hover:bg-white/90 font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-primary-muted">
            Don't have a registered hospital?{' '}
            <Link to="/register" className="text-healthcare-cyan hover:underline font-medium">Create a new tenant</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
