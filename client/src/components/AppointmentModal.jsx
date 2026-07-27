import { useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toDateInputValue, toTimeInputValue, combineDateAndTime } from '../lib/dates.js';

export function AppointmentModal({ appointment, initialDate, initialHour, patients, therapists, onClose, onSaved }) {
  const { user, isAdmin } = useAuth();
  const isEdit = Boolean(appointment);

  const startDefault = appointment ? new Date(appointment.start_time) : new Date(initialDate);
  if (!appointment) startDefault.setHours(initialHour ?? 9, 0, 0, 0);
  const endDefault = appointment
    ? new Date(appointment.end_time)
    : new Date(startDefault.getTime() + 60 * 60 * 1000);

  const [patientId, setPatientId] = useState(appointment?.patient_id || patients[0]?.id || '');
  const [therapistId, setTherapistId] = useState(appointment?.therapist_id || user.id);
  const [date, setDate] = useState(toDateInputValue(startDefault));
  const [startTime, setStartTime] = useState(toTimeInputValue(startDefault));
  const [endTime, setEndTime] = useState(toTimeInputValue(endDefault));
  const [status, setStatus] = useState(appointment?.status || 'scheduled');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const start_time = combineDateAndTime(date, startTime).toISOString();
    const end_time = combineDateAndTime(date, endTime).toISOString();

    try {
      if (isEdit) {
        await api.put(`/appointments/${appointment.id}`, { start_time, end_time, status, notes });
      } else {
        await api.post('/appointments', {
          patient_id: Number(patientId),
          therapist_id: isAdmin ? Number(therapistId) : undefined,
          start_time,
          end_time,
          notes,
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this appointment?')) return;
    await api.delete(`/appointments/${appointment.id}`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">
          {isEdit ? 'Edit Appointment' : 'New Appointment'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!isEdit && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Patient</span>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="input mt-1" required>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isEdit && isAdmin && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Therapist</span>
              <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} className="input mt-1" required>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1" required />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Start</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input mt-1" required />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">End</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input mt-1" required />
            </label>
          </div>

          {isEdit && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input mt-1">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-show</option>
              </select>
            </label>
          )}

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input mt-1" rows={2} />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEdit && (
                <button type="button" onClick={handleDelete} className="text-sm font-medium text-red-500 hover:text-red-700">
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
