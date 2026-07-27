import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/client.js';

export function AnalyticsPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/analytics/summary').then(({ data }) => setSummary(data));
  }, []);

  if (!summary) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-slate-400">Loading analytics...</div>;
  }

  const chartData = summary.dailyVolume.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Completed: Number(d.completed),
    Cancelled: Number(d.cancelled),
    'No-show': Number(d.no_show),
    Scheduled: Number(d.scheduled),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
      <p className="text-sm text-slate-500">Clinic-wide performance metrics</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Patient Conversion Rate" value={`${summary.patientConversionRate}%`} hint="Leads that became active or discharged patients" />
        <MetricCard label="Appointment Completion Rate" value={`${summary.appointmentCompletionRate}%`} hint="Completed vs. all past appointments" />
        <MetricCard label="Avg. Sessions per Patient" value={summary.avgSessionsPerPatient} hint="Completed sessions per active/discharged patient" />
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Appointment Volume (Last 14 Days)</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Completed" stackId="a" fill="#10b981" />
              <Bar dataKey="Scheduled" stackId="a" fill="#38bdf8" />
              <Bar dataKey="Cancelled" stackId="a" fill="#cbd5e1" />
              <Bar dataKey="No-show" stackId="a" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Therapist Load</h2>
        <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
          <thead className="text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="py-2">Therapist</th>
              <th className="py-2">Active Patients</th>
              <th className="py-2">Appointments Today</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.byTherapist.map((t) => (
              <tr key={t.id}>
                <td className="py-2 font-medium text-slate-800">{t.name}</td>
                <td className="py-2 text-slate-600">{t.active_patients}</td>
                <td className="py-2 text-slate-600">{t.todays_appointments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}
