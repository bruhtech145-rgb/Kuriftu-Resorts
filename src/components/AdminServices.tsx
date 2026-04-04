import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Search, RefreshCw, X, Package, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

interface Service {
  id: string;
  name: string;
  category_id: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  max_capacity: number;
  is_bookable: boolean;
  status: string;
  tags: string[];
  images: string[];
  created_at: string;
}

const CATEGORIES = ['Rooms', 'Activities', 'Dining', 'Wellness', 'Packages'];

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', category_id: 'Activities', description: '', base_price: 0,
    duration_minutes: 60, max_capacity: 10, tags: '',
  });

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    setServices(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category_id: 'Activities', description: '', base_price: 0, duration_minutes: 60, max_capacity: 10, tags: '' });
    setShowForm(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name, category_id: s.category_id, description: s.description || '',
      base_price: s.base_price, duration_minutes: s.duration_minutes,
      max_capacity: s.max_capacity, tags: (s.tags || []).join(', '),
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      name: form.name,
      category_id: form.category_id,
      description: form.description,
      base_price: form.base_price,
      duration_minutes: form.duration_minutes,
      max_capacity: form.max_capacity,
      is_bookable: true,
      status: 'Active',
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      images: [],
    };

    if (editing) {
      await supabase.from('services').update(data).eq('id', editing.id);
    } else {
      await supabase.from('services').insert(data);
    }
    setSaving(false);
    setShowForm(false);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this service? It will no longer be bookable.')) return;
    await supabase.from('services').update({ status: 'Archived' }).eq('id', id);
    fetchServices();
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Draft' : 'Active';
    await supabase.from('services').update({ status: newStatus }).eq('id', id);
    fetchServices();
  };

  const filtered = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || s.category_id === filterCategory;
    return matchesSearch && matchesCategory && s.status !== 'Archived';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Services & Experiences</h2>
          <p className="text-sm text-slate-400">{filtered.length} active services</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchServices} className="p-2 text-slate-400 hover:text-[#0066ff] rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={18} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#0066ff] text-white rounded-xl font-bold text-sm hover:bg-[#0052cc] transition-all shadow-lg shadow-blue-500/20">
            <Plus size={16} />
            Add Service
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066ff] text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={clsx("px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                filterCategory === cat ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">{editing ? 'Edit Service' : 'New Service'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-900"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] text-sm" placeholder="Ethiopian Coffee Spa" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] bg-white text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Price (ETB)</label>
              <input required type="number" min="0" value={form.base_price} onChange={e => setForm({ ...form, base_price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Duration (min)</label>
              <input required type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Max Capacity</label>
              <input required type="number" min="1" value={form.max_capacity} onChange={e => setForm({ ...form, max_capacity: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tags (comma separated)</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] text-sm" placeholder="Spa, Wellness, Organic" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] text-sm" rows={3} placeholder="Describe the experience..." />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2.5 font-bold text-white bg-[#0066ff] hover:bg-blue-600 rounded-xl transition-colors text-sm flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {editing ? 'Update' : 'Create'} Service
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading services...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="font-bold text-slate-900">No services found</p>
            <p className="text-sm text-slate-400">Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Price</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Capacity</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Tags</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{s.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">{s.category_id}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">ETB {s.base_price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{s.max_capacity}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggleStatus(s.id, s.status)}
                        className={clsx("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider cursor-pointer transition-colors",
                          s.status === 'Active' ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}>
                        {s.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {(s.tags || []).slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-[#0066ff] hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
