import React, { useCallback, useEffect, useState } from 'react';
import { Eye, PhoneCall, HandCoins, AlertTriangle, XCircle } from 'lucide-react';
import { collectionAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import ManagementFilterBar from '../../components/ui/ManagementFilterBar';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const CASE_STATUSES = ['assigned','contact_pending','customer_contacted','promise_to_pay','payment_received','follow_up_required','escalated','recovered','closed'];
const CONTACT_METHODS = ['call','email','sms','visit','other'];

const EmployeeCollections = () => {
  const [cases, setCases] = useState([]), [loading, setLoading] = useState(true), [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null), [actionLoading, setActionLoading] = useState(false);
  const [method, setMethod] = useState('call'), [outcome, setOutcome] = useState('');
  const [ptpAmount, setPtpAmount] = useState(''), [ptpDate, setPtpDate] = useState('');
  const [escalateReason, setEscalateReason] = useState(''), [closeReason, setCloseReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    collectionAPI.listCases(status ? { status } : {})
      .then((d) => setCases(d.data.cases || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const open = async (c) => { try { const d = await collectionAPI.getCaseById(c._id); setSelected(d.data.case); setOutcome(''); setPtpAmount(''); setPtpDate(''); setEscalateReason(''); setCloseReason(''); } catch (err) { toast.error(getErrorMessage(err)); } };
  const act = async (fn, msg) => {
    setActionLoading(true);
    try { const d = await fn(); toast.success(msg); setSelected(d.data.case); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const closed = selected && ['recovered', 'closed'].includes(selected.status);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Collections</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage overdue loan collection cases assigned to you</p></div>

      <ManagementFilterBar search="" onSearch={() => {}} placeholder="">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}
          options={[{ value: '', label: 'All Status' }, ...CASE_STATUSES.map(v => ({ value: v, label: v.replaceAll('_',' ') }))]}
          containerClass="w-full sm:w-56" />
      </ManagementFilterBar>

      <div className="card p-5">
        {loading ? <TableSkeleton rows={6} cols={6} /> : cases.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No collection cases found.</p> : (
          <div className="table-container"><table className="table"><thead><tr>{['Customer','Case No.','Overdue','Priority','Status','Due Since',''].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-banking-border">
              {cases.map(c => <tr key={c._id} className="table-row">
                <td className="table-td"><p className="font-medium text-sm">{c.customer?.fullName}</p></td>
                <td className="table-td font-mono text-xs">{c.caseNumber}</td>
                <td className="table-td font-semibold">{formatCurrency(c.overdueAmount)}</td>
                <td className="table-td"><Badge value={c.priority} /></td>
                <td className="table-td"><Badge value={c.status} /></td>
                <td className="table-td text-xs text-gray-500 dark:text-gray-400">{formatDate(c.dueSince)}</td>
                <td className="table-td"><button type="button" aria-label={`View case ${c.caseNumber}`} onClick={() => open(c)} className="p-2 text-primary-700 dark:text-primary-400 hover:bg-primary-50 rounded-lg"><Eye className="w-4 h-4" /></button></td>
              </tr>)}
            </tbody></table></div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `Case ${selected.caseNumber}` : ''} size="lg">
        {selected && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Customer</p><p className="font-semibold text-sm">{selected.customer?.fullName}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Overdue Amount</p><p className="font-semibold">{formatCurrency(selected.overdueAmount)}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-500 dark:text-gray-400">Status</p><Badge value={selected.status} /></div>
          </div>

          <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Recovered so far:</span> <span className="font-semibold">{formatCurrency(selected.recoveredAmount)}</span></p>

          <div><h4 className="font-semibold text-sm mb-2">Contact Log</h4><div className="space-y-2">{(selected.contactLog || []).map((c, i) => <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-banking-darker text-sm"><span className="capitalize font-medium">{c.method}</span>: {c.outcome} <span className="text-xs text-gray-500 dark:text-gray-400 block">{formatDate(c.contactedAt)}</span></div>)}{!selected.contactLog?.length && <p className="text-xs text-gray-500 dark:text-gray-400">No contact logged yet.</p>}</div></div>

          {!closed && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Log Contact</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <Select value={method} onChange={(e) => setMethod(e.target.value)} options={CONTACT_METHODS.map(m => ({ value: m, label: m }))} />
              <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Outcome / notes" />
            </div>
            <Button icon={PhoneCall} loading={actionLoading} onClick={() => act(() => collectionAPI.addContact(selected._id, method, outcome), 'Contact logged')}>Log Contact</Button>
          </div>}

          {!closed && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Promise to Pay</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Amount (INR)" type="number" min="0.01" step="0.01" value={ptpAmount} onChange={(e) => setPtpAmount(e.target.value)} />
              <Input label="Promised Date" type="date" value={ptpDate} onChange={(e) => setPtpDate(e.target.value)} />
            </div>
            <Button icon={HandCoins} loading={actionLoading} onClick={() => act(() => collectionAPI.recordPromiseToPay(selected._id, ptpAmount, ptpDate), 'Promise-to-pay recorded')}>Record Promise</Button>
          </div>}

          {!closed && <div className="border-t border-gray-100 dark:border-banking-border pt-4 flex flex-wrap gap-3">
            <Input value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} placeholder="Escalation reason" containerClass="flex-1 min-w-[200px]" />
            <Button variant="secondary" icon={AlertTriangle} loading={actionLoading} onClick={() => act(() => collectionAPI.escalate(selected._id, escalateReason), 'Case escalated')}>Escalate</Button>
          </div>}

          {!closed && <div className="border-t border-gray-100 dark:border-banking-border pt-4 flex flex-wrap gap-3">
            <Input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Closure reason" containerClass="flex-1 min-w-[200px]" />
            <Button variant="danger" icon={XCircle} loading={actionLoading} onClick={() => act(() => collectionAPI.closeCase(selected._id, closeReason), 'Case closed')}>Close Case</Button>
          </div>}
        </div>}
      </Modal>
    </div>
  );
};
export default EmployeeCollections;
