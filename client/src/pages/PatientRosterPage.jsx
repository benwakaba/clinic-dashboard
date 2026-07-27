import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  insurance_provider: '',
  insurance_id: '',
  condition: '',
  status: 'lead',
  assigned_therapist_id: '',
};

const statusStyles = {
  lead: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  discharged: 'bg-slate-200 text-slate-700',
};

export function PatientRosterPage() {
  const { isAdmin } = useAuth();
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/patients');
    setPatients(data.patients);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPatients();
    if (isAdmin) {
      api.get('/users', { params: { role: 'therapist' } }).then(({ data }) => setTherapists(data.users));
    }
  }, [loadPatients, isAdmin]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(patient) {
    setForm({
      name: patient.name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      insurance_provider: patient.insurance_provider || '',
      insurance_id: patient.insurance_id || '',
      condition: patient.condition || '',
      status: patient.status,
      assigned_therapist_id: patient.assigned_therapist_id || '',
    });
    setEditingId(patient.id);
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      assigned_therapist_id: form.assigned_therapist_id || null,
    };
    try {
      if (editingId) {
        await api.put(`/patients/${editingId}`, payload);
      } else {
        await api.post('/patients', payload);
      }
      setShowForm(false);
      await loadPatients();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this patient from the roster?')) return;
    await api.delete(`/patients/${id}`);
    await loadPatients();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patient Roster</h1>
          <p className="text-sm text-slate-500">{patients.length} patients</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New Patient
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Insurance</th>
              <th className="px-4 py-3">Therapist</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && patients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No patients yet.
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.condition || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{p.insurance_provider || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{p.therapist_name || 'Unassigned'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    Edit
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="ml-3 text-sm font-medium text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? 'Edit Patient' : 'New Patient Intake'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Full name" required className="col-span-2">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Insurance provider">
                <input
                  value={form.insurance_provider}
                  onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Insurance ID">
                <input
                  value={form.insurance_id}
                  onChange={(e) => setForm({ ...form, insurance_id: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Condition" className="col-span-2">
                <input
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input"
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="discharged">Discharged</option>
                </select>
              </Field>
              {isAdmin && (
                <Field label="Assigned therapist">
                  <select
                    value={form.assigned_therapist_id}
                    onChange={(e) => setForm({ ...form, assigned_therapist_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Unassigned</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

              <div className="col-span-2 mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
