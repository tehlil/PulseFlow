import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  ArrowLeft,
  Activity,
  Calendar,
  Sparkles,
  Heart,
  Edit,
  Trash2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function PatientDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({
    reason: "",
    notes: "",
    visitDate: new Date().toISOString().split("T")[0],
  });

  // Fetch patient profile details
  const { data, isLoading, error } = useQuery({
    queryKey: ["patientDetails", id],
    queryFn: () => api.get(`/patients/${id}`).then((res) => res.data.patient),
  });

  // Mutators to add visit logs
  const visitMutation = useMutation({
    mutationFn: (body: any) => api.post("/visits", { ...body, patientId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientDetails", id] });
      setShowVisitModal(false);
      setVisitForm({
        reason: "",
        notes: "",
        visitDate: new Date().toISOString().split("T")[0],
      });
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: (assessmentId: string) =>
      api.delete(`/assessments/${assessmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientDetails", id] });
    },
  });

  const handleDeleteAssessment = (assessmentId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this clinical assessment record? This will soft-delete the chart and invalidate its AI risk predictions.",
      )
    ) {
      deleteAssessmentMutation.mutate(assessmentId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-primary-muted animate-pulse">
        Loading patient chart folder...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-healthcare-rose/10 border border-healthcare-rose/20 rounded-xl text-healthcare-rose text-sm">
        Failed to load patient chart data. The record may have been soft-deleted
        or you do not have permission.
      </div>
    );
  }

  // Format DOB age
  const age =
    new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear();

  // Vitals timeline data for trends
  const vitalsTrendData = data.assessments
    .slice()
    .reverse()
    .map((a: any) => ({
      date: new Date(a.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      Systolic: a.bloodPressureSystolic,
      Diastolic: a.bloodPressureDiastolic,
      Glucose: a.bloodSugar,
      Pulse: a.heartRate,
    }));

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    visitMutation.mutate(visitForm);
  };

  // Identify latest prediction
  const latestPrediction = data.predictions[0];

  return (
    <div className="space-y-8">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="space-y-2">
          <Link
            to="/patients"
            className="text-xs text-primary-muted hover:text-white flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Patient Registry</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {data.firstName} {data.lastName}
            </h1>
            <span className="font-mono text-xs bg-border px-2 py-0.5 rounded text-primary-muted">
              MRN: {data.mrn}
            </span>
          </div>
          <p className="text-xs text-primary-muted">
            {data.gender} • {age} years old • DOB:{" "}
            {new Date(data.dateOfBirth).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start">
          <button
            onClick={() => setShowVisitModal(true)}
            className="border border-border hover:bg-background-hover text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>Log Consult Visit</span>
          </button>
          <Link
            to={`/patients/${id}/assessments/create`}
            className="bg-healthcare-cyan text-white hover:bg-healthcare-cyan/90 font-semibold text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center space-x-1.5"
          >
            <Activity className="w-4 h-4" />
            <span>Record Vitals Check</span>
          </Link>
        </div>
      </div>

      {/* 2. PATIENT INSIGHTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Clinical Summary, Vitals Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vitals Trends Chart */}
          <div className="bg-background-card border border-border p-6 rounded-xl shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Vitals Trends Panel
                </h2>
                <p className="text-[10px] text-primary-muted">
                  Historical timelines of blood pressure and glucose check
                  recordings.
                </p>
              </div>
              <Heart className="w-4 h-4 text-healthcare-rose animate-pulse" />
            </div>
            <div className="h-60 w-full">
              {vitalsTrendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-primary-muted">
                  No vital assessments logged to plot trends.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={vitalsTrendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="date" stroke="#8A8F98" fontSize={9} />
                    <YAxis stroke="#8A8F98" fontSize={9} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#121215",
                        borderColor: "#1F1F24",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "#fff", fontSize: 10 }}
                      itemStyle={{ fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Systolic"
                      stroke="#EF4444"
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Diastolic"
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Glucose"
                      stroke="#F59E0B"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Vitals logs history table */}
          <div className="bg-background-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Vitals Log Trail
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/25 text-[9px] uppercase font-bold text-primary-muted">
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-6">BP (mmHg)</th>
                    <th className="py-3 px-6">HR (bpm)</th>
                    <th className="py-3 px-6">Sugar (mg/dL)</th>
                    <th className="py-3 px-6">O2 Sat (%)</th>
                    <th className="py-3 px-6">Temp (°C)</th>
                    <th className="py-3 px-6">Wt / Ht</th>
                    <th className="py-3 px-6">BMI</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {data.assessments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-8 text-center text-primary-muted"
                      >
                        No physical vital checks recorded.
                      </td>
                    </tr>
                  ) : (
                    data.assessments.map((a: any) => (
                      <tr
                        key={a.id}
                        className="hover:bg-background-hover/20 transition-colors"
                      >
                        <td className="py-3.5 px-6 text-white font-medium">
                          {new Date(a.date).toLocaleDateString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {a.bloodPressureSystolic && a.bloodPressureDiastolic
                            ? `${a.bloodPressureSystolic}/${a.bloodPressureDiastolic}`
                            : "—"}
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {a.heartRate || "—"}
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {a.bloodSugar || "—"}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-healthcare-cyan">
                          {a.oxygenSaturation ? `${a.oxygenSaturation}%` : "—"}
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {a.temperature ? `${a.temperature}°C` : "—"}
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {a.weight || a.height
                            ? `${a.weight || "—"} kg / ${a.height || "—"} cm`
                            : "—"}
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {a.bmi || "—"}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.status === "COMPLETED"
                                ? "bg-healthcare-emerald/10 text-healthcare-emerald"
                                : a.status === "REVIEWED"
                                  ? "bg-healthcare-cyan/10 text-healthcare-cyan"
                                  : a.status === "ARCHIVED"
                                    ? "bg-border text-primary-muted"
                                    : "bg-healthcare-amber/10 text-healthcare-amber" // DRAFT
                            }`}
                          >
                            {a.status || "DRAFT"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center space-x-3">
                            <Link
                              to={`/patients/${id}/assessments/${a.id}/edit`}
                              className="text-primary-muted hover:text-white transition-colors"
                              title="Edit Assessment"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDeleteAssessment(a.id)}
                              className="text-primary-muted hover:text-healthcare-rose transition-colors"
                              title="Delete Assessment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: AI Risk Prediction Card, Medical History, Visit logs */}
        <div className="space-y-6">
          {/* AI RISK CARD */}
          <div className="bg-background-card border border-border p-6 rounded-xl shadow-sm flex flex-col space-y-4 relative overflow-hidden">
            {/* Glow backing */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-healthcare-amber/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center space-x-2 text-healthcare-amber">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                AI Predictive Risk
              </h2>
            </div>

            {latestPrediction ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] text-primary-muted font-bold uppercase">
                    {latestPrediction.predictionType} RISK
                  </p>
                  <span className="text-xs text-primary-muted">
                    Confidence:{" "}
                    {Math.round(latestPrediction.confidenceScore * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-3xl font-extrabold text-white">
                    {latestPrediction.riskScore}%
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-[10px] font-bold ${
                      latestPrediction.riskCategory === "CRITICAL"
                        ? "bg-red-950 text-red-500 border border-red-900/50"
                        : latestPrediction.riskCategory === "HIGH"
                          ? "bg-healthcare-rose/10 text-healthcare-rose"
                          : latestPrediction.riskCategory === "MODERATE"
                            ? "bg-healthcare-amber/10 text-healthcare-amber"
                            : "bg-healthcare-emerald/10 text-healthcare-emerald"
                    }`}
                  >
                    {latestPrediction.riskCategory}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-[10px] font-semibold text-white uppercase">
                    Key Risk Contributors
                  </p>
                  <div className="space-y-1.5">
                    {(latestPrediction.contributingFactors as any[]).map(
                      (f, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="text-primary-muted">{f.factor}</span>
                          <span className="text-healthcare-rose font-semibold">
                            +{f.weight} pts
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border space-y-1">
                  <p className="text-[10px] font-semibold text-white uppercase">
                    Suggested Directives
                  </p>
                  <p className="text-xs text-primary-muted leading-relaxed italic">
                    "
                    {(latestPrediction.recommendedActions as string[])[0] ||
                      "Observe status changes."}
                    "
                  </p>
                </div>

                <Link
                  to="/predictions"
                  className="text-xs text-healthcare-cyan hover:underline font-semibold block text-center pt-2"
                >
                  View full explainability report
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2 text-xs text-primary-muted">
                <p>No active predictive calculations found.</p>
                <p className="text-[10px]">
                  Assessments generate predictions in the background.
                </p>
              </div>
            )}
          </div>

          {/* Visits Timeline */}
          <div className="bg-background-card border border-border p-6 rounded-xl shadow-sm flex flex-col space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Consultation History
            </h2>

            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {data.visits.length === 0 ? (
                <p className="text-xs text-primary-muted text-center py-4">
                  No doctor consultation visits logged.
                </p>
              ) : (
                data.visits.map((v: any) => (
                  <div
                    key={v.id}
                    className="relative pl-5 border-l border-border space-y-1 text-xs"
                  >
                    {/* Circle marker */}
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-border-accent flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-healthcare-cyan" />
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-white truncate max-w-[120px]">
                        {v.reason}
                      </span>
                      <span className="text-[10px] text-primary-muted font-mono">
                        {new Date(v.visitDate).toLocaleDateString(undefined, {
                          dateStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-primary-muted text-[11px] leading-relaxed truncate">
                      {v.notes || "No notes."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. VISIT MODAL */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleVisitSubmit}
            className="bg-background-card border border-border max-w-md w-full rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Log Consultation Visit
              </h3>
              <p className="text-[10px] text-primary-muted">
                Create a consultation encounter log for clinical tracking.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-white uppercase">
                  Visit Date
                </label>
                <input
                  type="date"
                  required
                  value={visitForm.visitDate}
                  onChange={(e) =>
                    setVisitForm((prev) => ({
                      ...prev,
                      visitDate: e.target.value,
                    }))
                  }
                  className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-white uppercase">
                  Reason for Consultation
                </label>
                <input
                  type="text"
                  required
                  placeholder="Routine Cardiology Checkup"
                  value={visitForm.reason}
                  onChange={(e) =>
                    setVisitForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-white uppercase">
                  Encounter Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Patient reports occasional fatigue, heart rates range normal. Advised lifestyle modifications."
                  value={visitForm.notes}
                  onChange={(e) =>
                    setVisitForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-lg text-white px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowVisitModal(false)}
                className="px-4 py-2 border border-border hover:bg-background-hover text-white rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={visitMutation.isPending}
                className="px-4 py-2 bg-healthcare-cyan text-white hover:bg-healthcare-cyan/90 font-semibold rounded-lg"
              >
                {visitMutation.isPending ? "Logging..." : "Save Encounter"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
