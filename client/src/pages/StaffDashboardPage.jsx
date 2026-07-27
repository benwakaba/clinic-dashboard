import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toDateInputValue, formatTimeRange } from '../lib/dates.js';

const statusColors = {
  scheduled: 'bg-sky-100 text-sky-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-500',
  no_show: 'bg-red-100 text-red-700',
};

export function StaffDashboardPage() {
  const { user, isAdmin } = useAuth();
  const today = new Date();
  const todayStr = toDateInputValue(today);

  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskTherapist, setNewTaskTherapist] = useState('');

  const load = useCallback(async () => {
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setHours(23, 59, 59, 999);

    const [apptRes, taskRes] = await Promise.all([
      api.get('/appointments', { params: { start: dayStart.toISOString(), end: dayEnd.toISOString() } }),
      api.get('/tasks', { params: { date: todayStr } }),
    ]);
    setAppointments(apptRes.data.appointments);
    setTasks(taskRes.data.tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  useEffect(() => {
    load();
    if (isAdmin) {
      api.get('/users', { params: { role: 'therapist' } }).then(({ data }) => {
        setTherapists(data.users);
        setNewTaskTherapist(data.users[0]?.id || '');
      });
    }
  }, [load, isAdmin]);

  async function toggleTask(task) {
    await api.put(`/tasks/${task.id}`, { completed: !task.completed });
    load();
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;
    await api.post('/tasks', {
      description: newTask.trim(),
      therapist_id: isAdmin ? Number(newTaskTherapist) : undefined,
      due_date: todayStr,
    });
    setNewTask('');
    load();
  }

  async function deleteTask(id) {
    await api.delete(`/tasks/${id}`);
    load();
  }

  const loadByTherapist = appointments.reduce((acc, a) => {
    acc[a.therapist_name] = (acc[a.therapist_name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">
        {isAdmin ? "Today's Clinic Overview" : `Welcome back, ${user.name.split(' ')[0]}`}
      </h1>
      <p className="text-sm text-slate-500">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>

      {isAdmin && (
        <div className="mt-6 flex flex-wrap gap-3">
          {Object.entries(loadByTherapist).length === 0 && (
            <p className="text-sm text-slate-400">No appointments scheduled today.</p>
          )}
          {Object.entries(loadByTherapist).map(([name, count]) => (
            <div key={name} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-2xl font-semibold text-slate-900">{count}</div>
              <div className="text-xs text-slate-500">{name}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {isAdmin ? "Today's Appointments" : 'Your Patient Load Today'}
          </h2>
          <ul className="mt-3 space-y-2">
            {appointments.length === 0 && <p className="text-sm text-slate-400">Nothing scheduled today.</p>}
            {appointments.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-800">{a.patient_name}</div>
                  <div className="text-xs text-slate-500">
                    {formatTimeRange(a.start_time, a.end_time)}
                    {isAdmin && ` - ${a.therapist_name}`}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status]}`}>{a.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Task Checklist</h2>
          <ul className="mt-3 space-y-2">
            {tasks.length === 0 && <p className="text-sm text-slate-400">No tasks for today.</p>}
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm">
                <input type="checkbox" checked={t.completed} onChange={() => toggleTask(t)} className="h-4 w-4" />
                <span className={`flex-1 ${t.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {t.description}
                  {isAdmin && <span className="ml-2 text-xs text-slate-400">({t.therapist_name})</span>}
                  {t.patient_name && <span className="ml-2 text-xs text-slate-400">- {t.patient_name}</span>}
                </span>
                <button onClick={() => deleteTask(t.id)} className="text-xs text-red-400 hover:text-red-600">
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={addTask} className="mt-4 flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task..."
              className="input"
            />
            {isAdmin && (
              <select value={newTaskTherapist} onChange={(e) => setNewTaskTherapist(e.target.value)} className="input w-36">
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <button type="submit" className="btn-secondary whitespace-nowrap">
              Add
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
