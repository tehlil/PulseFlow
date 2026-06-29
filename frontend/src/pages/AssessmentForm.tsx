import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ArrowLeft, Activity, AlertCircle, Save } from 'lucide-react';
import { z } from 'zod';

const clientAssessmentSchema = z.object({
  heartRate: z.number().int().min(20, 'Heart rate must be at least 20 bpm').max(300, 'Heart rate cannot exceed 300 bpm').nullable().optional(),
  bloodPressureSystolic: z.number().int().min(40, 'Systolic blood pressure must be at least 40 mmHg').max(300, 'Systolic blood pressure cannot exceed 300 mmHg').nullable().optional(),
  bloodPressureDiastolic: z.number().int().min(30, 'Diastolic blood pressure must be at least 30 mmHg').max(200, 'Diastolic blood pressure cannot exceed 200 mmHg').nullable().optional(),
  bloodSugar: z.number().int().min(10, 'Blood sugar must be at least 10 mg/dL').max(1000, 'Blood sugar cannot exceed 1000 mg/dL').nullable().optional(),
  oxygenSaturation: z.number().int().min(10, 'Oxygen saturation must be at least 10%').max(100, 'Oxygen saturation cannot exceed 100%').nullable().optional(),
  temperature: z.number().min(25, 'Temperature must be at least 25°C').max(48, 'Temperature cannot exceed 48°C').nullable().optional(),
  weight: z.number().min(1, 'Weight must be at least 1 kg').max(500, 'Weight cannot exceed 500 kg').nullable().optional(),
  height: z.number().min(10, 'Height must be at least 10 cm').max(300, 'Height cannot exceed 300 cm').nullable().optional(),
  bmi: z.number().min(5, 'BMI must be at least 5').max(100, 'BMI cannot exceed 100').nullable().optional(),
  status: z.enum(['DRAFT', 'COMPLETED', 'REVIEWED', 'ARCHIVED']),
});

export default function AssessmentForm() {
  const { id, assessmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 16),
    heartRate: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    bloodSugar: '',
    oxygenSaturation: '',
    temperature: '',
    weight: '',
    height: '',
    bmi: '',
    status: 'DRAFT',
    notes: '',
  });

  const [symptomInput, setSymptomInput] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState<'LOW' | 'MODERATE' | 'HIGH'>('MODERATE');
  const [symptomsList, setSymptomsList] = useState<{ name: string; severity: 'LOW' | 'MODERATE' | 'HIGH' }[]>([]);
  const [labValues, setLabValues] = useState({ hbA1c: '', cholesterolTotal: '' });
  const [error, setError] = useState('');
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  // Fetch assessment details if in Edit mode
  useEffect(() => {
    if (assessmentId) {
      setLoadingAssessment(true);
      api.get(`/assessments/${assessmentId}`)
        .then((res) => {
          const a = res.data.assessment;
          if (a) {
            setFormData({
              date: a.date ? new Date(a.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
              heartRate: a.heartRate !== null ? String(a.heartRate) : '',
              bloodPressureSystolic: a.bloodPressureSystolic !== null ? String(a.bloodPressureSystolic) : '',
              bloodPressureDiastolic: a.bloodPressureDiastolic !== null ? String(a.bloodPressureDiastolic) : '',
              bloodSugar: a.bloodSugar !== null ? String(a.bloodSugar) : '',
              oxygenSaturation: a.oxygenSaturation !== null ? String(a.oxygenSaturation) : '',
              temperature: a.temperature !== null ? String(a.temperature) : '',
              weight: a.weight !== null ? String(a.weight) : '',
              height: a.height !== null ? String(a.height) : '',
              bmi: a.bmi !== null ? String(a.bmi) : '',
              status: a.status || 'DRAFT',
              notes: a.notes || '',
            });
            setSymptomsList(a.symptoms || []);
            setLabValues({
              hbA1c: a.labValues?.hbA1c !== undefined ? String(a.labValues.hbA1c) : '',
              cholesterolTotal: a.labValues?.cholesterolTotal !== undefined ? String(a.labValues.cholesterolTotal) : '',
            });
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load assessment record');
        })
        .finally(() => {
          setLoadingAssessment(false);
        });
    }
  }, [assessmentId]);

  // Auto-calculate BMI when weight or height changes
  useEffect(() => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    if (!isNaN(w) && !isNaN(h) && h > 0) {
      const heightInMeters = h / 100;
      const computed = (w / (heightInMeters * heightInMeters)).toFixed(2);
      setFormData((prev) => ({ ...prev, bmi: computed }));
    }
  }, [formData.weight, formData.height]);

  const assessmentMutation = useMutation({
    mutationFn: (payload: any) => {
      if (assessmentId) {
        return api.put(`/assessments/${assessmentId}`, payload);
      }
      return api.post('/assessments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDetails', id] });
      navigate(`/patients/${id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to save clinical assessment');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSymptom = (e: React.MouseEvent) => {
    e.preventDefault();
    if (symptomInput.trim()) {
      setSymptomsList((prev) => [...prev, { name: symptomInput.trim(), severity: symptomSeverity }]);
      setSymptomInput('');
      setSymptomSeverity('MODERATE');
    }
  };

  const handleRemoveSymptom = (index: number) => {
    setSymptomsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Parse values to floats/ints
    const parsedPayload = {
      patientId: id,
      date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
      heartRate: formData.heartRate ? parseInt(formData.heartRate, 10) : null,
      bloodPressureSystolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic, 10) : null,
      bloodPressureDiastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic, 10) : null,
      bloodSugar: formData.bloodSugar ? parseInt(formData.bloodSugar, 10) : null,
      oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation, 10) : null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      bmi: formData.bmi ? parseFloat(formData.bmi) : null,
      status: formData.status,
      symptoms: symptomsList,
      labValues: {
        hbA1c: labValues.hbA1c ? parseFloat(labValues.hbA1c) : undefined,
        cholesterolTotal: labValues.cholesterolTotal ? parseFloat(labValues.cholesterolTotal) : undefined,
      },
      notes: formData.notes || null,
    };

    // Client-side Zod validation
    const validation = clientAssessmentSchema.safeParse(parsedPayload);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      setError(`Validation error: ${errorMsg}`);
      return;
    }

    assessmentMutation.mutate(parsedPayload);
  };

  if (loadingAssessment) {
    return <div className="p-8 text-center text-primary-muted animate-pulse">Loading assessment chart...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* back link */}
      <div className="flex items-center space-x-2 text-xs text-primary-muted">
        <Link to={`/patients/${id}`} className="hover:text-white flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Chart folder</span>
        </Link>
      </div>

      <div className="flex items-center space-x-3">
        <div className="bg-healthcare-cyan/15 p-2 rounded-lg text-healthcare-cyan">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {assessmentId ? 'Edit Vitals & Clinical Assessment' : 'Record Vitals & Clinical Assessment'}
          </h1>
          <p className="text-xs text-primary-muted">
            Logs physiological check indicators, symptoms, and key laboratory parameters.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-healthcare-rose/10 border border-healthcare-rose/25 text-healthcare-rose rounded-lg flex items-center space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-background-card border border-border rounded-xl p-6 shadow-sm space-y-8">
        
        {/* Section 1: Metadata & Status */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-border pb-2">Assessment Context</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Assessment Date & Time</label>
              <input
                type="datetime-local"
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Workflow Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2 text-sm"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Vitals Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-border pb-2">Physiological Vital Signs</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Heart Rate (bpm)</label>
              <input
                type="number"
                name="heartRate"
                placeholder="72"
                value={formData.heartRate}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">BP Systolic (mmHg)</label>
              <input
                type="number"
                name="bloodPressureSystolic"
                placeholder="120"
                value={formData.bloodPressureSystolic}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">BP Diastolic (mmHg)</label>
              <input
                type="number"
                name="bloodPressureDiastolic"
                placeholder="80"
                value={formData.bloodPressureDiastolic}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Blood Sugar (mg/dL)</label>
              <input
                type="number"
                name="bloodSugar"
                placeholder="95"
                value={formData.bloodSugar}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Oxygen Saturation (%)</label>
              <input
                type="number"
                name="oxygenSaturation"
                placeholder="98"
                value={formData.oxygenSaturation}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                placeholder="36.8"
                value={formData.temperature}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                placeholder="70.0"
                value={formData.weight}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Height (cm)</label>
              <input
                type="number"
                name="height"
                placeholder="175"
                value={formData.height}
                onChange={handleInputChange}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Body Mass Index (BMI)</label>
              <input
                type="number"
                step="0.1"
                name="bmi"
                disabled
                placeholder="22.4"
                value={formData.bmi}
                className="w-full bg-background/50 border border-border/80 rounded-lg text-white px-3 py-2 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Laboratory Panels */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-border pb-2">Laboratory Blood Panels</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">HbA1c (%) - Diabetes Indicator</label>
              <input
                type="number"
                step="0.1"
                placeholder="5.4"
                value={labValues.hbA1c}
                onChange={(e) => setLabValues((prev) => ({ ...prev, hbA1c: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-white uppercase">Total Cholesterol (mg/dL) - Cardiovascular</label>
              <input
                type="number"
                placeholder="180"
                value={labValues.cholesterolTotal}
                onChange={(e) => setLabValues((prev) => ({ ...prev, cholesterolTotal: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Symptom Tracker */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-border pb-2">Symptom Track Panel</h3>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Polyuria, Chest Pain, Headache"
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg text-sm text-white px-3 py-2 focus:outline-none"
            />
            <select
              value={symptomSeverity}
              onChange={(e) => setSymptomSeverity(e.target.value as any)}
              className="bg-background border border-border rounded-lg text-xs text-white px-2 py-2"
            >
              <option value="LOW">LOW</option>
              <option value="MODERATE">MODERATE</option>
              <option value="HIGH">HIGH</option>
            </select>
            <button
              onClick={handleAddSymptom}
              className="bg-background-hover hover:bg-border-accent text-white text-xs px-4 rounded-lg font-semibold border border-border"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {symptomsList.map((s, idx) => (
              <span 
                key={idx} 
                className={`border text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center space-x-1.5 ${
                  s.severity === 'HIGH' ? 'bg-healthcare-rose/10 border-healthcare-rose/30 text-healthcare-rose' :
                  s.severity === 'MODERATE' ? 'bg-healthcare-amber/10 border-healthcare-amber/30 text-healthcare-amber' :
                  'bg-healthcare-cyan/10 border-healthcare-cyan/20 text-healthcare-cyan'
                }`}
              >
                <span>{s.name} ({s.severity})</span>
                <button type="button" onClick={() => handleRemoveSymptom(idx)} className="hover:text-white font-bold">×</button>
              </span>
            ))}
            {symptomsList.length === 0 && (
              <p className="text-xs text-primary-muted">No active symptoms added to tracker.</p>
            )}
          </div>
        </div>

        {/* Section 5: General Notes */}
        <div className="space-y-1.5 text-xs">
          <label className="font-semibold text-white uppercase">Clinical Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Log details relating to patient physical condition, complaints, or instructions."
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
          />
        </div>

        <hr className="border-border" />

        <div className="flex items-center justify-end space-x-3 text-xs">
          <Link
            to={`/patients/${id}`}
            className="px-5 py-2.5 border border-border hover:bg-background-hover text-white rounded-lg font-semibold"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={assessmentMutation.isPending}
            className="px-5 py-2.5 bg-healthcare-cyan hover:bg-healthcare-cyan/90 text-white font-semibold rounded-lg flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{assessmentMutation.isPending ? 'Saving...' : 'Submit & Analyze Vitals'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
