import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Plus, MessageSquare, TrendingUp } from 'lucide-react';
import { salesAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import ManagementFilterBar from '../../components/ui/ManagementFilterBar';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import { useEmployee } from '../../context/EmployeeContext';
import toast from 'react-hot-toast';

const LEAD_STATUSES = ['new','assigned','contacted','interested','documents_required','application_started','converted','lost','closed'];
const PRODUCTS = ['account','loan','insurance','card','fixed_deposit','other'];

// Mirrors backend VALID_TRANSITIONS — frontend hides invalid next-steps as
// UX, backend remains authoritative and re-validates regardless.
const NEXT_STATUSES = {
  new: ['assigned','contacted','lost'], assigned: ['contacted','lost'], contacted: ['interested','lost'],
  interested: ['documents_required','application_started','lost'], documents_required: ['application_started','lost'],
  application_started: ['converted','lost'], converted: [], lost: [], closed: []
};

const EmployeeSales = () => {
  const { hasPermission } = useEmployee();
  const [leads, setLeads] = useState([]), [loading, setLoading] = useState(true), [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null), [actionLoading, setActionLoading] = useState(false);
  const [remark, setRemark] = useState(''), [nextStatus, setNextStatus] = useState(''), [lostReason, setLostReason] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', productInterest: 'account', source: 'other' });
  const [performance, setPerformance] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    salesAPI.listLeads(status ? { status } : {})
      .then((d) => setLeads(d.data.leads || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (hasPermission('sales.performance.view')) salesAPI.getPerformance().then((d) => setPerformance(d.data.performance || [])).catch(() => {}); }, [hasPermission]);

  const open = (l) => { setSelected(l); setRemark(''); setNextStatus(''); setLostReason(''); };
  const act = async (fn, msg) => {
    setActionLoading(true);
    try { const d = await fn(); toast.success(msg); setSelected(d.data.lead); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const createLead = async () => {
    if (!form.fullName || !form.phone) return toast.error('Name and phone are required');
    setActionLoading(true);
    try { await salesAPI.createLead(form); toast.success('Lead created'); setShowCreate(false); setForm({ fullName: '', email: '', phone: '', productInterest: 'account', source: 'other' }); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const updateStatus = () => {
    if (!nextStatus) return toast.error('Select a status');
    if (nextStatus === 'lost' && !lostReason.trim()) return toast.error('Enter a reason for marking this lead lost');
    return act(() => salesAPI.updateStatus(selected._id, nextStatus, nextStatus === 'lost' ? { lostReason: lostReason.trim() } : {}), 'Lead status updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage leads and track conversions</p></div>
        {hasPermission('sales.lead.create') && <Button icon={Plus} onClick={() => setShowCreate(true)}>New Lead</Button>}
      </div>

      {performance.length > 0 && <div className="card p-5">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Team Performance</h3>
        <div className="table-container"><table className="table"><thead><tr>{['Employee','Total Leads','Converted','Lost','Conversion Rate'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-banking-border">{performance.map((p) => <tr key={p.employeeId || 'unassigned'} className="table-row"><td className="table-td text-sm">{p.employeeName || 'Unassigned'}</td><td className="table-td">{p.totalLeads}</td><td className="table-td">{p.converted}</td><td className="table-td">{p.lost}</td><td className="table-td font-semibold">{p.conversionRate}%</td></tr>)}</tbody></table></div>
      </div>}

      <ManagementFilterBar search="" onSearch={() => {}} placeholder="">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}
          options={[{ value: '', label: 'All Status' }, ...LEAD_STATUSES.map(v => ({ value: v, label: v.replaceAll('_',' ') }))]}
          containerClass="w-full sm:w-56" />
      </ManagementFilterBar>

      <div className="card p-5">
        {loading ? <TableSkeleton rows={6} cols={6} /> : leads.length === 0 ? <p className="text-sm text-gray-400 py-8 text-center">No leads found.</p> : (
          <div className="table-container"><table className="table"><thead><tr>{['Name','Phone','Interest','Assigned To','Status','',].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-banking-border">
              {leads.map(l => <tr key={l._id} className="table-row">
                <td className="table-td font-medium text-sm">{l.fullName}</td>
                <td className="table-td text-sm">{l.phone}</td>
                <td className="table-td capitalize text-sm">{l.productInterest?.replaceAll('_',' ')}</td>
                <td className="table-td text-sm">{l.assignedEmployee?.fullName || '—'}</td>
                <td className="table-td"><Badge value={l.status} /></td>
                <td className="table-td"><button type="button" aria-label={`View lead ${l.fullName}`} onClick={() => open(l)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Eye className="w-4 h-4" /></button></td>
              </tr>)}
            </tbody></table></div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Lead">
        <div className="space-y-3">
          <Input label="Full Name" value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Product Interest" value={form.productInterest} onChange={(e) => setForm(f => ({ ...f, productInterest: e.target.value }))} options={PRODUCTS.map(p => ({ value: p, label: p.replaceAll('_',' ') }))} />
          <Button loading={actionLoading} onClick={createLead}>Create Lead</Button>
        </div>
      </Modal>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? selected.leadId : ''} size="lg">
        {selected && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-3"><p className="text-xs text-gray-500">Name</p><p className="font-semibold text-sm">{selected.fullName}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-500">Phone</p><p className="font-semibold text-sm">{selected.phone}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-500">Status</p><Badge value={selected.status} /></div>
          </div>

          <div><h4 className="font-semibold text-sm mb-2">Remarks</h4><div className="space-y-2">{(selected.remarks || []).map((r, i) => <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-banking-darker text-sm">{r.text}<span className="text-xs text-gray-400 block">{formatDate(r.at)}</span></div>)}{!selected.remarks?.length && <p className="text-xs text-gray-400">No remarks yet.</p>}</div></div>

          {NEXT_STATUSES[selected.status]?.length > 0 && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Update Status</h4>
            <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} options={[{ value: '', label: 'Select next status' }, ...NEXT_STATUSES[selected.status].map(s => ({ value: s, label: s.replaceAll('_',' ') }))]} />
            {nextStatus === 'lost' && <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Reason lead was lost" />}
            <Button loading={actionLoading} onClick={updateStatus}>Update Status</Button>
          </div>}

          <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a remark" />
            <Button variant="secondary" icon={MessageSquare} loading={actionLoading} onClick={() => { if (!remark.trim()) return toast.error('Enter a remark'); act(() => salesAPI.addRemark(selected._id, remark.trim()), 'Remark added'); }}>Add Remark</Button>
          </div>
        </div>}
      </Modal>
    </div>
  );
};
export default EmployeeSales;
