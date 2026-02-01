import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from './firebase';

const STAGES = ['unknown', 'compatible', 'sampled', 'converted'];
const STAGE_LABELS = {
  unknown: '❓ Unknown',
  compatible: '✅ Compatible',
  sampled: '📦 Sampled',
  converted: '🏆 Converted'
};
const STAGE_COLORS = {
  unknown: 'bg-gray-100 border-gray-300',
  compatible: 'bg-blue-50 border-blue-300',
  sampled: 'bg-yellow-50 border-yellow-300',
  converted: 'bg-green-50 border-green-300'
};

function App() {
  const [milkBanks, setMilkBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'milkbanks'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const banks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMilkBanks(banks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const stats = {
    total: milkBanks.length,
    unknown: milkBanks.filter(b => b.stage === 'unknown').length,
    compatible: milkBanks.filter(b => b.stage === 'compatible').length,
    sampled: milkBanks.filter(b => b.stage === 'sampled').length,
    converted: milkBanks.filter(b => b.stage === 'converted').length,
  };

  const filteredBanks = filter === 'all' 
    ? milkBanks 
    : milkBanks.filter(b => b.stage === filter);

  const updateBank = async (id, data) => {
    await updateDoc(doc(db, 'milkbanks', id), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    setEditingId(null);
  };

  const addBank = async (data) => {
    await addDoc(collection(db, 'milkbanks'), {
      ...data,
      stage: data.stage || 'unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setShowAddForm(false);
  };

  const deleteBank = async (id) => {
    if (window.confirm('Delete this milk bank?')) {
      await deleteDoc(doc(db, 'milkbanks', id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🥛 HMBANA Milk Bank Pipeline</h1>
              <p className="text-sm text-gray-500">Howard Medical + Holder Partnership</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Add Milk Bank
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Banks" value={stats.total} color="bg-gray-600" onClick={() => setFilter('all')} active={filter === 'all'} />
          <StatCard label="Unknown" value={stats.unknown} color="bg-gray-400" onClick={() => setFilter('unknown')} active={filter === 'unknown'} />
          <StatCard label="Compatible" value={stats.compatible} color="bg-blue-500" onClick={() => setFilter('compatible')} active={filter === 'compatible'} />
          <StatCard label="Sampled" value={stats.sampled} color="bg-yellow-500" onClick={() => setFilter('sampled')} active={filter === 'sampled'} />
          <StatCard label="Converted" value={stats.converted} color="bg-green-500" onClick={() => setFilter('converted')} active={filter === 'converted'} />
        </div>

        {/* Pipeline Progress */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pipeline Progress</h3>
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
            {stats.converted > 0 && <div className="bg-green-500" style={{width: `${(stats.converted/28)*100}%`}} />}
            {stats.sampled > 0 && <div className="bg-yellow-500" style={{width: `${(stats.sampled/28)*100}%`}} />}
            {stats.compatible > 0 && <div className="bg-blue-500" style={{width: `${(stats.compatible/28)*100}%`}} />}
            {stats.unknown > 0 && <div className="bg-gray-400" style={{width: `${(stats.unknown/28)*100}%`}} />}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 / 28 HMBANA Banks</span>
            <span>{stats.converted} Converted</span>
          </div>
        </div>

        {/* Milk Bank List */}
        <div className="space-y-3">
          {filteredBanks.map(bank => (
            <MilkBankCard 
              key={bank.id} 
              bank={bank} 
              isEditing={editingId === bank.id}
              onEdit={() => setEditingId(bank.id)}
              onSave={(data) => updateBank(bank.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => deleteBank(bank.id)}
            />
          ))}
          {filteredBanks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No milk banks in this stage yet.
            </div>
          )}
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <AddMilkBankModal onAdd={addBank} onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}

function StatCard({ label, value, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg text-white transition ${color} ${active ? 'ring-4 ring-offset-2 ring-blue-300' : 'opacity-80 hover:opacity-100'}`}
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-90">{label}</div>
    </button>
  );
}

function MilkBankCard({ bank, isEditing, onEdit, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(bank);

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-400">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            className="border rounded px-3 py-2"
            placeholder="Milk Bank Name"
            value={form.name || ''}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Location (City, State)"
            value={form.location || ''}
            onChange={e => setForm({...form, location: e.target.value})}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Contact Name"
            value={form.contact || ''}
            onChange={e => setForm({...form, contact: e.target.value})}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Email"
            value={form.email || ''}
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Phone"
            value={form.phone || ''}
            onChange={e => setForm({...form, phone: e.target.value})}
          />
          <select
            className="border rounded px-3 py-2"
            value={form.stage || 'unknown'}
            onChange={e => setForm({...form, stage: e.target.value})}
          >
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <input
            className="border rounded px-3 py-2"
            type="date"
            placeholder="Next Action Date"
            value={form.nextAction || ''}
            onChange={e => setForm({...form, nextAction: e.target.value})}
          />
          <input
            className="border rounded px-3 py-2"
            type="date"
            placeholder="Last Contact"
            value={form.lastContact || ''}
            onChange={e => setForm({...form, lastContact: e.target.value})}
          />
        </div>
        <textarea
          className="border rounded px-3 py-2 w-full mb-4"
          rows={3}
          placeholder="Notes..."
          value={form.notes || ''}
          onChange={e => setForm({...form, notes: e.target.value})}
        />
        <div className="flex justify-between">
          <button onClick={onDelete} className="text-red-600 hover:text-red-800">Delete</button>
          <div className="space-x-2">
            <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow p-4 border-2 ${STAGE_COLORS[bank.stage || 'unknown']} cursor-pointer hover:shadow-md transition`} onClick={onEdit}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{bank.name}</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-white border">
              {STAGE_LABELS[bank.stage || 'unknown']}
            </span>
          </div>
          <p className="text-sm text-gray-600">{bank.location}</p>
          {bank.contact && <p className="text-sm text-gray-500">Contact: {bank.contact} {bank.email && `(${bank.email})`}</p>}
        </div>
        {bank.nextAction && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Next Action</div>
            <div className="text-sm font-medium">{bank.nextAction}</div>
          </div>
        )}
      </div>
      {bank.notes && <p className="mt-2 text-sm text-gray-600 border-t pt-2">{bank.notes}</p>}
    </div>
  );
}

function AddMilkBankModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ stage: 'unknown' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Add Milk Bank</h2>
        <div className="space-y-4">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Milk Bank Name *"
            value={form.name || ''}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Location (City, State)"
            value={form.location || ''}
            onChange={e => setForm({...form, location: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              className="border rounded px-3 py-2"
              placeholder="Contact Name"
              value={form.contact || ''}
              onChange={e => setForm({...form, contact: e.target.value})}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={form.email || ''}
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>
          <select
            className="border rounded px-3 py-2 w-full"
            value={form.stage}
            onChange={e => setForm({...form, stage: e.target.value})}
          >
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            placeholder="Notes..."
            value={form.notes || ''}
            onChange={e => setForm({...form, notes: e.target.value})}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
          <button 
            onClick={() => form.name && onAdd(form)} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={!form.name}
          >
            Add Milk Bank
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
