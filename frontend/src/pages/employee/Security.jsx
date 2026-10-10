import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { securityAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import { useEmployee } from '../../context/EmployeeContext';
import toast from 'react-hot-toast';

const TABS = [{ key: 'events', label: 'Security Events' }, { key: 'incidents', label: 'Incidents' }, { key: 'alerts', label: 'Fraud Alerts' }];

const EmployeeSecurity = () => {
  const { hasPermission } = useEmployee();
  const [tab, setTab] = useState('events');
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null), [actionLoading, setActionLoading] = useState(false);
  const [resolution, setResolution] = useState(''), [resStatus, setResStatus] = useState('resolved');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium' });

  const load = useCallback(() => {
    setLoading(true);
    const call = tab === 'events' ? securityAPI.listEvents() : tab === 'incidents' ? securityAPI.listIncidents() : securityAPI.listFraudAlerts();
    call.then((d) => setItems(d.data.events || d.data.incidents || d.data.alerts || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const createIncident = async () => {
    if (!form.title || !form.description) return toast.error('Title and description are required');
    setActionLoading(true);
    try { await securityAPI.createIncident(form); toast.success('Incident created'); setShowCreate(false); setForm({ title: '', description: '', severity: 'medium' }); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const resolveIncident = async () => {
    if (!resolution.trim()) return toast.error('Enter a resolution note');
    setActionLoading(true);
    try { await securityAPI.resolveIncident(selected._id, resStatus, resolution.trim()); toast.success('Incident updated'); setSelected(null); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const reviewAlert = async (newStatus) => {
    setActionLoading(true);
    try { await securityAPI.reviewFraudAlert(selected._id, newStatus, resolution); toast.success('Fraud alert updated'); setSelected(null); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Monitor security events, incidents and fraud alerts</p></div>
        {tab === 'incidents' && hasPermission('security.incident.create') && <Button icon={Plus} onClick={() => setShowCreate(true)}>New Incident</Button>}
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Security sections">
        {TABS.map((t) => <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setSelected(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-banking-darker text-gray-600 dark:text-gray-300'}`}>{t.label}</button>)}
      </div>

      <div className="card p-5">
        {loading ? <TableSkeleton rows={6} cols={5} /> : items.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No {tab === 'alerts' ? 'fraud alerts' : tab} found.</p> : (
          <div className="table-container"><table className="table"><thead><tr>
            {(tab === 'events' ? ['Type','Email','IP','Severity','When'] : tab === 'incidents' ? ['Incident','Severity','Status','Created',''] : ['Alert','Rule','Severity','Status','']).map(h => <th key={h} className="table-th">{h}</th>)}
          </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-banking-border">
              {tab === 'events' && items.map(e => <tr key={e._id} className="table-row"><td className="table-td text-sm">{e.type.replaceAll('_',' ')}</td><td className="table-td text-sm">{e.email || '—'}</td><td className="table-td text-xs font-mono">{e.ip || '—'}</td><td className="table-td"><Badge value={e.severity} /></td><td className="table-td text-xs text-gray-500 dark:text-gray-400">{formatDate(e.createdAt)}</td></tr>)}
              {tab === 'incidents' && items.map(i => <tr key={i._id} className="table-row"><td className="table-td"><p className="font-medium text-sm">{i.title}</p><p className="text-xs text-gray-500 dark:text-gray-400">{i.incidentId}</p></td><td className="table-td"><Badge value={i.severity} /></td><td className="table-td"><Badge value={i.status} /></td><td className="table-td text-xs text-gray-500 dark:text-gray-400">{formatDate(i.createdAt)}</td><td className="table-td">{!['resolved','false_positive'].includes(i.status) && hasPermission('security.incident.resolve') && <Button size="sm" icon={CheckCircle2} onClick={() => { setSelected(i); setResolution(''); }}>Resolve</Button>}</td></tr>)}
              {tab === 'alerts' && items.map(a => <tr key={a._id} className="table-row"><td className="table-td"><p className="font-medium text-sm">{a.alertId}</p><p className="text-xs text-gray-500 dark:text-gray-400">{a.reason}</p></td><td className="table-td text-sm capitalize">{a.rule.replaceAll('_',' ')}</td><td className="table-td"><Badge value={a.severity} /></td><td className="table-td"><Badge value={a.status} /></td><td className="table-td">{!['resolved','false_positive'].includes(a.status) && hasPermission('security.alert.investigate') && <Button size="sm" icon={ShieldAlert} onClick={() => { setSelected(a); setResolution(''); }}>Review</Button>}</td></tr>)}
            </tbody></table></div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Security Incident">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          <Select label="Severity" value={form.severity} onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))} options={['low','medium','high','critical'].map(s => ({ value: s, label: s }))} />
          <Button loading={actionLoading} onClick={createIncident}>Create Incident</Button>
        </div>
      </Modal>

      <Modal isOpen={!!selected && tab === 'incidents'} onClose={() => setSelected(null)} title={selected ? `Resolve ${selected.incidentId}` : ''}>
        {selected && <div className="space-y-3">
          <Select label="Outcome" value={resStatus} onChange={(e) => setResStatus(e.target.value)} options={[{ value: 'resolved', label: 'Resolved' }, { value: 'false_positive', label: 'False Positive' }]} />
          <Input label="Resolution notes" value={resolution} onChange={(e) => setResolution(e.target.value)} />
          <Button loading={actionLoading} onClick={resolveIncident}>Save</Button>
        </div>}
      </Modal>

      <Modal isOpen={!!selected && tab === 'alerts'} onClose={() => setSelected(null)} title={selected ? selected.alertId : ''}>
        {selected && <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{selected.reason}</p>
          <Input label="Resolution notes" value={resolution} onChange={(e) => setResolution(e.target.value)} />
          <div className="flex flex-wrap gap-3">
            <Button loading={actionLoading} onClick={() => reviewAlert('confirmed')}>Confirm Fraud</Button>
            <Button variant="secondary" loading={actionLoading} onClick={() => reviewAlert('false_positive')}>False Positive</Button>
            <Button variant="secondary" loading={actionLoading} onClick={() => reviewAlert('resolved')}>Resolve</Button>
          </div>
        </div>}
      </Modal>
    </div>
  );
};
export default EmployeeSecurity;
