import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Banknote, Eye } from 'lucide-react';
import { loansAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import ManagementFilterBar from '../../components/ui/ManagementFilterBar';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const AdminLoans = () => {
  const [loans, setLoans] = useState([]), [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true), [page, setPage] = useState(1);
  const [search, setSearch] = useState(''), [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null), [decision, setDecision] = useState(''), [reason, setReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState(''), [actionLoading, setActionLoading] = useState(false);

  const fetchLoans = useCallback(() => {
    setLoading(true);
    loansAPI.listAll({ page, limit: 10, ...(search && { search }), ...(status && { status }) })
      .then((d) => { setLoans(d.data.loans || []); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, status]);
  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const open = async (loan) => {
    try {
      const d = await loansAPI.getById(loan._id); const l = d.data.loan;
      setSelected(l); setApprovedAmount(l.employeeRecommendedAmount || l.requestedAmount || ''); setDecision(''); setReason('');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const approve = async () => {
    if (!approvedAmount) return toast.error('Approved amount is required');
    if (!window.confirm(`Approve this loan for ${formatCurrency(approvedAmount)}?`)) return;
    setActionLoading(true);
    try { const d = await loansAPI.approve(selected._id, approvedAmount); toast.success('Loan approved'); setSelected(d.data.loan); fetchLoans(); }
    catch (err) { toast.error(getErrorMessage(err)); } finally { setActionLoading(false); }
  };
  const reject = async () => {
    if (!reason.trim()) return toast.error('Rejection reason is required');
    if (!window.confirm('Reject this loan application?')) return;
    setActionLoading(true);
    try { const d = await loansAPI.reject(selected._id, reason.trim()); toast.success('Loan rejected'); setSelected(d.data.loan); fetchLoans(); }
    catch (err) { toast.error(getErrorMessage(err)); } finally { setActionLoading(false); }
  };
  const disburse = async () => {
    if (!window.confirm(`Disburse ${formatCurrency(selected.approvedAmount)} to ${selected.account?.accountNumber}?`)) return;
    setActionLoading(true);
    try { const d = await loansAPI.disburse(selected._id); toast.success('Loan disbursed successfully'); setSelected(d.data.loan); fetchLoans(); }
    catch (err) { toast.error(getErrorMessage(err)); } finally { setActionLoading(false); }
  };

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loan Management</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Final approval and controlled loan disbursement</p></div>
    <ManagementFilterBar
      search={search}
      onSearch={e => { setSearch(e.target.value); setPage(1); }}
      placeholder="Search application or customer..."
    >
      <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
        options={[{ value:'', label:'All Status' }, ...['submitted','under_review','documents_required','approved','rejected','disbursed'].map(v => ({value:v,label:v.replaceAll('_',' ')}))]}
        containerClass="w-full sm:w-48 lg:w-48" />
    </ManagementFilterBar>
    <div className="card p-5">
      {loading ? <TableSkeleton rows={8} cols={7} /> : <><div className="table-container"><table className="table"><thead><tr>{['Customer','Application','Type','Requested','Recommendation','Status',''].map(h => <th className="table-th" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-banking-border">{loans.map(l => <tr className="table-row" key={l._id}><td className="table-td"><p className="font-medium text-sm">{l.customer?.fullName}</p><p className="text-xs text-gray-400">{l.customer?.email}</p></td><td className="table-td font-mono text-xs">{l.applicationId}</td><td className="table-td capitalize text-sm">{l.loanType}</td><td className="table-td font-semibold">{formatCurrency(l.requestedAmount)}</td><td className="table-td">{l.employeeRecommendedAmount ? formatCurrency(l.employeeRecommendedAmount) : '—'}</td><td className="table-td"><Badge value={l.status} /></td><td className="table-td"><button onClick={() => open(l)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Eye className="w-4 h-4" /></button></td></tr>)}</tbody></table></div><Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} /></>}
    </div>

    <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `Loan ${selected.applicationId}` : 'Loan'} size="lg">
      {selected && <div className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-3"><div className="card p-3"><p className="text-xs text-gray-500">Customer</p><p className="font-semibold">{selected.customer?.fullName}</p><p className="text-xs text-gray-400">{selected.customer?.email}</p></div><div className="card p-3"><p className="text-xs text-gray-500">Requested</p><p className="font-semibold">{formatCurrency(selected.requestedAmount)}</p></div><div className="card p-3"><p className="text-xs text-gray-500">Status</p><Badge value={selected.status} /></div></div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm"><p><span className="text-gray-500">Account:</span> {selected.account?.accountNumber}</p><p><span className="text-gray-500">Tenure:</span> {selected.tenureMonths} months</p><p><span className="text-gray-500">Employee recommendation:</span> {selected.employeeRecommendedAmount ? formatCurrency(selected.employeeRecommendedAmount) : '—'}</p><p><span className="text-gray-500">Approved amount:</span> {selected.approvedAmount ? formatCurrency(selected.approvedAmount) : '—'}</p></div>
        <div><h4 className="font-semibold text-sm mb-2">Documents & review</h4><div className="space-y-2">{(selected.documents || []).map(d => <div className="flex justify-between p-3 rounded-xl bg-gray-50 dark:bg-banking-darker" key={d._id}><span className="text-sm">{d.fileName}<span className="block text-xs text-gray-500 capitalize">{d.type.replaceAll('_',' ')} · {d.status}</span></span><Badge value={d.status} /></div>)}{selected.documents?.length === 0 && <p className="text-xs text-gray-400">No documents.</p>}</div></div>
        {['under_review','documents_required'].includes(selected.status) && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3"><h4 className="font-semibold text-sm">Final Decision</h4><Input label="Approved Amount (INR)" type="number" min="0.01" step="0.01" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} /><div className="flex flex-wrap gap-2"><Button icon={CheckCircle} loading={actionLoading} onClick={approve}>Approve</Button><Button variant="danger" icon={XCircle} loading={actionLoading} onClick={() => setDecision(decision === 'reject' ? '' : 'reject')}>Reject</Button></div>{decision === 'reject' && <div className="space-y-2"><Input label="Rejection reason" value={reason} onChange={e => setReason(e.target.value)} /><Button variant="danger" loading={actionLoading} onClick={reject}>Confirm Rejection</Button></div>}</div>}
        {selected.status === 'approved' && <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><p className="text-sm text-emerald-800 dark:text-emerald-300 mb-3">Approved for {formatCurrency(selected.approvedAmount)}. Destination account: {selected.account?.accountNumber}.</p><Button icon={Banknote} loading={actionLoading} onClick={disburse}>Confirm Disbursement</Button></div>}
        {selected.status === 'disbursed' && <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-800 dark:text-emerald-300">Disbursed on {formatDate(selected.disbursedAt)}.</div>}
      </div>}
    </Modal>
  </div>;
};
export default AdminLoans;
