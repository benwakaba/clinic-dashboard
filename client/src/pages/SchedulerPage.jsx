import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AppointmentModal } from '../components/AppointmentModal.jsx';
import { startOfWeek, addDays, HOURS, formatHour, formatTimeRange, WEEKDAY_LABELS } from '../lib/dates.js';

const statusColors = {
  scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-slate-200 text-slate-500 border-slate-300 line-through',
  no_show: 'bg-red-100 text-red-700 border-red-200',
};

export function SchedulerPage() {
  const { isAdmin } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [therapistFilter, setTherapistFilter] = useState('');
  const [modalState, setModalState] = useState(null); // { appointment } | { date, hour } | null

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const loadAppointments = useCallback(async () => {
    const { data } = await api.get('/appointments', {
      params: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        therapist_id: isAdmin && therapistFilter ? therapistFilter : undefined,
      },
    });
    setAppointments(data.appointments);
  }, [weekStart, weekEnd, isAdmin, therapistFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    api.get('/patients').then(({ data }) => setPatients(data.patients));
    if (isAdmin) {
      api.get('/users', { params: { role: 'therapist' } }).then(({ data }) => setTherapists(data.users));
    }
  }, [isAdmin]);

  function appointmentsFor(day, hour) {
    return appointments.filter((a) => {
      const start = new Date(a.start_time);
      return (
        start.getFullYear() === day.getFullYear() &&
        start.getMonth() === day.getMonth() &&
        start.getDate() === day.getDate() &&
        start.getHours() === hour
      );
    });
  }

  function closeModal(refresh) {
    setModalState(null);
    if (refresh) loadAppointments();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Weekly Schedule</h1>
          <p className="text-sm text-slate-500">
            {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
            {addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={therapistFilter}
              onChange={(e) => setTherapistFilter(e.target.value)}
              className="input w-44"
            >
              <option value="">All therapists</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="btn-secondary">
            Today
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-secondary">
            ← Prev
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-secondary">
            Next →
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="grid min-w-[900px] grid-cols-[70px_repeat(7,1fr)]">
          <div className="border-b border-r border-slate-200 bg-slate-50" />
          {weekDays.map((day, i) => (
            <div key={i} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center last:border-r-0">
              <div className="text-xs font-medium uppercase text-slate-500">{WEEKDAY_LABELS[i]}</div>
              <div className="text-sm font-semibold text-slate-800">{day.getDate()}</div>
            </div>
          ))}

          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-r border-slate-200 px-2 py-3 text-right text-xs text-slate-400">
                {formatHour(hour)}
              </div>
              {weekDays.map((day, i) => {
                const cellAppointments = appointmentsFor(day, hour);
                return (
                  <div
                    key={i}
                    onClick={() => cellAppointments.length === 0 && setModalState({ date: day, hour })}
                    className="min-h-[64px] border-b border-r border-slate-100 p-1 last:border-r-0 hover:bg-slate-50"
                  >
                    {cellAppointments.map((a) => (
                      <button
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalState({ appointment: a });
                        }}
                        className={`mb-1 w-full rounded border px-2 py-1 text-left text-xs ${statusColors[a.status]}`}
                      >
                        <div className="font-medium">{a.patient_name}</div>
                        <div>{formatTimeRange(a.start_time, a.end_time)}</div>
                        {isAdmin && <div className="text-[10px] opacity-75">{a.therapist_name}</div>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {modalState && (
        <AppointmentModal
          appointment={modalState.appointment}
          initialDate={modalState.date}
          initialHour={modalState.hour}
          patients={patients}
          therapists={therapists}
          onClose={() => closeModal(false)}
          onSaved={() => closeModal(true)}
        />
      )}
    </div>
  );
}
