import React, { useState } from 'react';
import { useNavigate as useNav, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export default function Register() {
  const { registerHospital } = useAuth();
  const navigate = useNav();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    hospitalName: '',
    hospitalSlug: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'hospitalSlug' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value,
    }));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hospitalName || !formData.hospitalSlug) {
      setError('Please complete all hospital details');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await registerHospital(formData);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Tenant registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-primary relative overflow-hidden">
      {/* glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-healthcare-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-healthcare-teal/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glassmorphism p-8 rounded-xl shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-healthcare-teal/15 p-3 rounded-xl text-healthcare-teal">
            <PlusCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create Hospital Tenant</h1>
          <p className="text-xs text-primary-muted">
            Register your clinic or facility on PulseFlow AI to initiate clinical analytics.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-healthcare-rose/10 border border-healthcare-rose/25 text-healthcare-rose rounded-lg flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white tracking-wide uppercase">Hospital Name</label>
              <input
                type="text"
                name="hospitalName"
                required
                placeholder="St. Marys Hospital"
                value={formData.hospitalName}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white tracking-wide uppercase">Hospital slug / Identifier</label>
              <input
                type="text"
                name="hospitalSlug"
                required
                placeholder="st-marys"
                value={formData.hospitalSlug}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
              />
              <p className="text-[10px] text-primary-muted">Used for subdomain configurations or tenant identification (letters, numbers, hyphens only).</p>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-background hover:bg-white/90 font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
            >
              <span>Continue to Administrator Credentials</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-white tracking-wide uppercase">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  placeholder="Sarah"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-white tracking-wide uppercase">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  placeholder="Connor"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white tracking-wide uppercase">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-primary-muted absolute left-3 top-3" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="admin@stmarys.org"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white tracking-wide uppercase">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-primary-muted absolute left-3 top-3" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="•••••••• (Min 8 characters)"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-border-accent placeholder:text-primary-muted"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-border hover:bg-background-hover text-white rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-healthcare-teal text-white hover:bg-healthcare-teal/90 font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{submitting ? 'Registering...' : 'Complete Registration'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-primary-muted">
            Already registered?{' '}
            <RouterLink to="/login" className="text-healthcare-teal hover:underline font-medium">Sign in here</RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}
