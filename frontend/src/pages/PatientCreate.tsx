import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';

export default function PatientCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    mrn: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    phone: '',
    email: '',
    address: '',
    status: 'ACTIVE',
    hospitalId: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      api.get('/hospitals')
        .then((res) => {
          const list = res.data?.hospitals || [];
          setHospitals(list);
          if (list.length > 0) {
            setFormData((prev) => ({ ...prev, hospitalId: list[0].id }));
          }
        })
        .catch((err) => {
          console.error('Failed to fetch hospitals', err);
        });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = { ...formData };
    if (user?.role !== 'SUPER_ADMIN') {
      delete (payload as any).hospitalId;
    } else if (!payload.hospitalId) {
      setError('Hospital selection is required for global administrators');
      setSubmitting(false);
      return;
    }

    try {
      const response = await api.post('/patients', payload);
      navigate(`/patients/${response.data.patient.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to onboard patient record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back button link */}
      <div className="flex items-center space-x-2 text-xs text-primary-muted">
        <Link to="/patients" className="hover:text-white flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Registry</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <div className="bg-healthcare-cyan/15 p-2 rounded-lg text-healthcare-cyan">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Onboard New Patient</h1>
          <p className="text-xs text-primary-muted">Create a new patient chart and medical record folder.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-healthcare-rose/10 border border-healthcare-rose/25 text-healthcare-rose rounded-lg flex items-center space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-background-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hospital Selection (only for SUPER_ADMIN) */}
          {user?.role === 'SUPER_ADMIN' && (
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-white tracking-wide uppercase">Assign to Hospital *</label>
              <select
                name="hospitalId"
                required
                value={formData.hospitalId}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
              >
                <option value="" disabled>Select a hospital</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Medical Record Number (MRN) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Medical Record Number (MRN) *</label>
            <input
              type="text"
              name="mrn"
              required
              placeholder="MRN-10294"
              value={formData.mrn}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Registry Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">First Name *</label>
            <input
              type="text"
              name="firstName"
              required
              placeholder="Gregory"
              value={formData.firstName}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Last Name *</label>
            <input
              type="text"
              name="lastName"
              required
              placeholder="House"
              value={formData.lastName}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            />
          </div>

          {/* Date of birth */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Date of Birth *</label>
            <input
              type="date"
              name="dateOfBirth"
              required
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Gender *</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            >
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
              <option value="OTHER">OTHER</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Phone Number</label>
            <input
              type="tel"
              name="phone"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white tracking-wide uppercase">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="gregory@house.org"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white tracking-wide uppercase">Physical Address</label>
          <textarea
            name="address"
            rows={2}
            placeholder="123 Clinical Way, Apt 4B, Princeton, NJ"
            value={formData.address}
            onChange={handleInputChange}
            className="w-full bg-background border border-border rounded-lg text-sm text-white px-4 py-2.5"
          />
        </div>

        <hr className="border-border" />

        <div className="flex items-center justify-end space-x-3">
          <Link
            to="/patients"
            className="px-5 py-2.5 border border-border hover:bg-background-hover text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-healthcare-cyan text-white hover:bg-healthcare-cyan/90 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
