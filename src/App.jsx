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

const PASTEURIZER_TYPES = [
  'Unknown',
  'Circulating Water Bath',
  'Holder Pasteurizer',
  'Flash Heating',
  'Other'
];

const BOTTLE_SIZES = ['120ml', '240ml', '1oz', '2oz', '4oz'];

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const actionDate = new Date(dateStr);
  return actionDate < today;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function App() {
  const [milkBanks, setMilkBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('nextAction');

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
    overdue: milkBanks.filter(b => isOverdue(b.nextAction)).length,
  };

  // Filter and sort
  let filteredBanks = filter === 'all' 
    ? milkBanks 
    : filter === 'overdue'
    ? milkBanks.filter(b => isOverdue(b.nextAction))
    : milkBanks.filter(b => b.stage === filter);

  // Search
  if (search) {
    const s = search.toLowerCase();
    filteredBanks = filteredBanks.filter(b => 
      b.name?.toLowerCase().includes(s) ||
      b.location?.toLowerCase().includes(s) ||
      b.contact?.toLowerCase().includes(s)
    );
  }

  // Sort
  filteredBanks = [...filteredBanks].sort((a, b) => {
    if (sortBy === 'nextAction') {
      // Overdue first, then by date, then no date last
      const aOverdue = isOverdue(a.nextAction);
      const bOverdue = isOverdue(b.nextAction);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (!a.nextAction && b.nextAction) return 1;
      if (a.nextAction && !b.nextAction) return -1;
      return new Date(a.nextAction || '9999') - new Date(b.nextAction || '9999');
    }
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'volume') {
      return (b.volumePotential || 0) - (a.volumePotential || 0);
    }
    return 0;
  });

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
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🥛 HMBANA Milk Bank Pipeline</h1>
              <p className="text-sm text-gray-500">Howard Medical + Holder Partnership</p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="🔍 Search banks..."
                className="border rounded-lg px-3 py-2 w-48"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
              >
                + Add Bank
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} color="bg-gray-600" onClick={() => setFilter('all')} active={filter === 'all'} />
          <StatCard label="Overdue" value={stats.overdue} color="bg-red-500" onClick={() => setFilter('overdue')} active={filter === 'overdue'} />
          <StatCard label="Unknown" value={stats.unknown} color="bg-gray-400" onClick={() => setFilter('unknown')} active={filter === 'unknown'} />
          <StatCard label="Compatible" value={stats.compatible} color="bg-blue-500" onClick={() => setFilter('compatible')} active={filter === 'compatible'} />
          <StatCard label="Sampled" value={stats.sampled} color="bg-yellow-500" onClick={() => setFilter('sampled')} active={filter === 'sampled'} />
          <StatCard label="Converted" value={stats.converted} color="bg-green-500" onClick={() => setFilter('converted')} active={filter === 'converted'} />
        </div>

        {/* Pipeline Progress */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-500">Pipeline Progress</h3>
            <select 
              className="text-sm border rounded px-2 py-1"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="nextAction">Sort: Next Action (Overdue First)</option>
              <option value="name">Sort: Name A-Z</option>
              <option value="volume">Sort: Volume (High to Low)</option>
            </select>
          </div>
          <div className="flex h-6 rounded-full overflow-hidden bg-gray-200">
            {stats.converted > 0 && (
              <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium" style={{width: `${(stats.converted/28)*100}%`}}>
                {stats.converted}
              </div>
            )}
            {stats.sampled > 0 && (
              <div className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium" style={{width: `${(stats.sampled/28)*100}%`}}>
                {stats.sampled}
              </div>
            )}
            {stats.compatible > 0 && (
              <div className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium" style={{width: `${(stats.compatible/28)*100}%`}}>
                {stats.compatible}
              </div>
            )}
            {stats.unknown > 0 && (
              <div className="bg-gray-400 flex items-center justify-center text-white text-xs font-medium" style={{width: `${(stats.unknown/28)*100}%`}}>
                {stats.unknown}
              </div>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{milkBanks.length} / 28 HMBANA Banks Tracked</span>
            <span>{stats.converted} Converted • {stats.sampled} Sampled • {stats.compatible} Compatible</span>
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
              {search ? 'No milk banks match your search.' : 'No milk banks in this stage yet.'}
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
      className={`p-3 rounded-lg text-white transition ${color} ${active ? 'ring-4 ring-offset-2 ring-blue-300 scale-105' : 'opacity-80 hover:opacity-100'}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-90">{label}</div>
    </button>
  );
}

function MilkBankCard({ bank, isEditing, onEdit, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(bank);
  const overdue = isOverdue(bank.nextAction);

  useEffect(() => {
    setForm(bank);
  }, [bank]);

  const toggleBottleSize = (size) => {
    const current = form.bottleSizes || [];
    if (current.includes(size)) {
      setForm({...form, bottleSizes: current.filter(s => s !== size)});
    } else {
      setForm({...form, bottleSizes: [...current, size]});
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Milk Bank Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Milk Bank Name"
              value={form.name || ''}
              onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="City, State"
              value={form.location || ''}
              onChange={e => setForm({...form, location: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Contact Name"
              value={form.contact || ''}
              onChange={e => setForm({...form, contact: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Email"
              value={form.email || ''}
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Phone"
              value={form.phone || ''}
              onChange={e => setForm({...form, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stage</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.stage || 'unknown'}
              onChange={e => setForm({...form, stage: e.target.value})}
            >
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pasteurizer Type</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.pasteurizerType || 'Unknown'}
              onChange={e => setForm({...form, pasteurizerType: e.target.value})}
            >
              {PASTEURIZER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Volume Potential (bottles/month)</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="number"
              placeholder="e.g. 15000"
              value={form.volumePotential || ''}
              onChange={e => setForm({...form, volumePotential: parseInt(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Next Action Date</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="date"
              value={form.nextAction || ''}
              onChange={e => setForm({...form, nextAction: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Last Contact Date</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="date"
              value={form.lastContact || ''}
              onChange={e => setForm({...form, lastContact: e.target.value})}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Bottle Sizes Needed</label>
          <div className="flex flex-wrap gap-2">
            {BOTTLE_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => toggleBottleSize(size)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  (form.bottleSizes || []).includes(size) 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            placeholder="Notes..."
            value={form.notes || ''}
            onChange={e => setForm({...form, notes: e.target.value})}
          />
        </div>
        
        <div className="flex justify-between">
          <button onClick={onDelete} className="text-red-600 hover:text-red-800 text-sm">🗑 Delete</button>
          <div className="space-x-2">
            <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-lg shadow p-4 border-2 cursor-pointer hover:shadow-md transition ${
        overdue ? 'border-red-400 bg-red-50' : STAGE_COLORS[bank.stage || 'unknown']
      }`} 
      onClick={onEdit}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">{bank.name}</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-white border whitespace-nowrap">
              {STAGE_LABELS[bank.stage || 'unknown']}
            </span>
            {overdue && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-500 text-white whitespace-nowrap">
                ⚠️ Overdue
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{bank.location}</p>
          {bank.contact && (
            <p className="text-sm text-gray-500">
              👤 {bank.contact} 
              {bank.email && <span className="text-blue-600 ml-1">({bank.email})</span>}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
            {bank.pasteurizerType && bank.pasteurizerType !== 'Unknown' && (
              <span className="bg-gray-100 px-2 py-0.5 rounded">🔧 {bank.pasteurizerType}</span>
            )}
            {bank.volumePotential > 0 && (
              <span className="bg-gray-100 px-2 py-0.5 rounded">📦 {bank.volumePotential.toLocaleString()}/mo</span>
            )}
            {bank.bottleSizes?.length > 0 && (
              <span className="bg-gray-100 px-2 py-0.5 rounded">🍼 {bank.bottleSizes.join(', ')}</span>
            )}
            {bank.lastContact && (
              <span className="bg-gray-100 px-2 py-0.5 rounded">📅 Last: {formatDate(bank.lastContact)}</span>
            )}
          </div>
        </div>
        {bank.nextAction && (
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">Next Action</div>
            <div className={`text-sm font-medium ${overdue ? 'text-red-600' : ''}`}>
              {formatDate(bank.nextAction)}
            </div>
          </div>
        )}
      </div>
      {bank.notes && (
        <p className="mt-2 text-sm text-gray-600 border-t pt-2 line-clamp-2">{bank.notes}</p>
      )}
    </div>
  );
}

function AddMilkBankModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ stage: 'unknown', bottleSizes: [] });

  const toggleBottleSize = (size) => {
    const current = form.bottleSizes || [];
    if (current.includes(size)) {
      setForm({...form, bottleSizes: current.filter(s => s !== size)});
    } else {
      setForm({...form, bottleSizes: [...current, size]});
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg my-8">
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
          <div className="grid grid-cols-2 gap-4">
            <select
              className="border rounded px-3 py-2"
              value={form.stage}
              onChange={e => setForm({...form, stage: e.target.value})}
            >
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <select
              className="border rounded px-3 py-2"
              value={form.pasteurizerType || 'Unknown'}
              onChange={e => setForm({...form, pasteurizerType: e.target.value})}
            >
              {PASTEURIZER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bottle Sizes Needed</label>
            <div className="flex flex-wrap gap-2">
              {BOTTLE_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleBottleSize(size)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    (form.bottleSizes || []).includes(size) 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <input
            className="border rounded px-3 py-2 w-full"
            type="number"
            placeholder="Volume Potential (bottles/month)"
            value={form.volumePotential || ''}
            onChange={e => setForm({...form, volumePotential: parseInt(e.target.value) || 0})}
          />
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
