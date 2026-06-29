import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Users, Activity, ShieldAlert, Sparkles, CheckCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: () => api.get('/analytics/overview').then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-border rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-background-card border border-border rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-background-card border border-border rounded-xl lg:col-span-2" />
          <div className="h-80 bg-background-card border border-border rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-healthcare-rose/10 border border-healthcare-rose/20 rounded-xl text-healthcare-rose text-sm">
        Failed to load analytics dashboard data. Please try again later.
      </div>
    );
  }

  const { patientCount, riskDistribution, predictionTypeCounts, recentPredictions, riskTrendsOverTime } = data;

  // Formatting for Recharts Pie Chart
  const pieData = [
    { name: 'Low', value: riskDistribution.LOW, color: '#10B981' },
    { name: 'Moderate', value: riskDistribution.MODERATE, color: '#F59E0B' },
    { name: 'High', value: riskDistribution.HIGH, color: '#EF4444' },
    { name: 'Critical', value: riskDistribution.CRITICAL, color: '#B91C1C' },
  ].filter(item => item.value > 0);

  // Fallback if no values preloaded
  const activePieData = pieData.length > 0 ? pieData : [
    { name: 'Low', value: 1, color: '#10B981' },
    { name: 'Moderate', value: 0, color: '#F59E0B' },
  ];

  // Total high risk count
  const criticalCount = riskDistribution.CRITICAL + riskDistribution.HIGH;

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Overview</h1>
          <p className="text-xs text-primary-muted">Real-time patient risk monitoring and explainable AI insights.</p>
        </div>
        <Link 
          to="/patients/create" 
          className="bg-healthcare-cyan text-white hover:bg-healthcare-cyan/95 font-semibold text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center space-x-1.5 self-start"
        >
          <span>Onboard New Patient</span>
        </Link>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Patients */}
        <div className="bg-background-card border border-border p-6 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary-muted uppercase tracking-wider">Total Patients</p>
            <p className="text-3xl font-extrabold text-white">{patientCount}</p>
          </div>
          <div className="bg-background-hover p-3 rounded-lg text-primary-muted">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-background-card border border-border p-6 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary-muted uppercase tracking-wider">Critical Alerts</p>
            <p className="text-3xl font-extrabold text-healthcare-rose">{criticalCount}</p>
          </div>
          <div className={`bg-healthcare-rose/10 p-3 rounded-lg text-healthcare-rose ${criticalCount > 0 ? 'animate-pulse' : ''}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Prediction Queries */}
        <div className="bg-background-card border border-border p-6 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary-muted uppercase tracking-wider">Model Runs</p>
            <p className="text-3xl font-extrabold text-healthcare-cyan">
              {Object.values(predictionTypeCounts as Record<string, number>).reduce((a: number, b: number) => a + b, 0)}
            </p>
          </div>
          <div className="bg-healthcare-cyan/10 p-3 rounded-lg text-healthcare-cyan">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* System Status */}
        <div className="bg-background-card border border-border p-6 rounded-xl flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary-muted uppercase tracking-wider">Predictor Status</p>
            <p className="text-sm font-bold text-healthcare-emerald flex items-center space-x-1.5 pt-1.5">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Operational</span>
            </p>
          </div>
          <div className="bg-healthcare-emerald/10 p-3 rounded-lg text-healthcare-emerald">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. CHARTS SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Trend over last 30 days */}
        <div className="bg-background-card border border-border p-6 rounded-xl lg:col-span-2 shadow-sm flex flex-col space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Clinical Risk Trends</h2>
            <p className="text-[11px] text-primary-muted">Count of predictions logged daily for the past 30 days.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrendsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B91C1C" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#B91C1C" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" />
                <XAxis dataKey="date" stroke="#8A8F98" fontSize={9} />
                <YAxis stroke="#8A8F98" fontSize={9} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121215', borderColor: '#1F1F24', borderRadius: 8 }}
                  labelStyle={{ color: '#fff', fontSize: 11 }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area name="Critical" type="monotone" dataKey="CRITICAL" stroke="#B91C1C" fillOpacity={1} fill="url(#colorCritical)" strokeWidth={2} />
                <Area name="High" type="monotone" dataKey="HIGH" stroke="#EF4444" fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk distribution Pie */}
        <div className="bg-background-card border border-border p-6 rounded-xl shadow-sm flex flex-col space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Patient Risk Ratios</h2>
            <p className="text-[11px] text-primary-muted">Active patient distribution across risk categories.</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {activePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121215', borderColor: '#1F1F24', borderRadius: 8 }}
                  itemStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute text-center">
              <p className="text-[10px] text-primary-muted uppercase font-semibold">Alert ratio</p>
              <p className="text-xl font-extrabold text-white">
                {patientCount > 0 ? Math.round((criticalCount / patientCount) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-healthcare-emerald" />
              <span className="text-primary-muted">Low: {riskDistribution.LOW}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-healthcare-amber" />
              <span className="text-primary-muted">Mod: {riskDistribution.MODERATE}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-healthcare-rose" />
              <span className="text-primary-muted">High: {riskDistribution.HIGH}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-800" />
              <span className="text-primary-muted">Crit: {riskDistribution.CRITICAL}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT PREDICTIONS GRID */}
      <div className="bg-background-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Predictor Logs</h2>
            <p className="text-[11px] text-primary-muted">Real-time risk assessments emitted by inference engines.</p>
          </div>
          <Link to="/predictions" className="text-xs text-healthcare-cyan hover:underline">View all runs</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/25 text-[10px] uppercase font-bold text-primary-muted">
                <th className="py-3.5 px-6">Patient</th>
                <th className="py-3.5 px-6">MRN</th>
                <th className="py-3.5 px-6">Prediction Target</th>
                <th className="py-3.5 px-6">Risk Category</th>
                <th className="py-3.5 px-6">Risk Score</th>
                <th className="py-3.5 px-6">Confidence</th>
                <th className="py-3.5 px-6">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {recentPredictions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-primary-muted">
                    No clinical predictions generated yet. Onboard patients and log clinical assessments to evaluate risk.
                  </td>
                </tr>
              ) : (
                recentPredictions.map((pred: any) => {
                  let badgeColor = 'bg-healthcare-emerald/10 text-healthcare-emerald';
                  if (pred.riskCategory === 'MODERATE') badgeColor = 'bg-healthcare-amber/10 text-healthcare-amber';
                  if (pred.riskCategory === 'HIGH') badgeColor = 'bg-healthcare-rose/10 text-healthcare-rose';
                  if (pred.riskCategory === 'CRITICAL') badgeColor = 'bg-red-950/20 text-red-500 border border-red-900/50';

                  return (
                    <tr key={pred.id} className="hover:bg-background-hover/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-white">
                        <Link to={`/patients/${pred.patientId}`} className="hover:underline">
                          {pred.patient.firstName} {pred.patient.lastName}
                        </Link>
                      </td>
                      <td className="py-4 px-6 font-mono text-primary-muted">{pred.patient.mrn}</td>
                      <td className="py-4 px-6 text-white font-medium">{pred.predictionType}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {pred.riskCategory}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-white">{pred.riskScore}%</td>
                      <td className="py-4 px-6 font-medium text-primary-muted">{Math.round(pred.confidenceScore * 100)}%</td>
                      <td className="py-4 px-6 text-primary-muted font-mono">
                        {new Date(pred.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
