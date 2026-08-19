import React, { useCallback, useEffect, useState } from 'react';
import { PlayCircle, FileWarning, MessageSquare, BadgeCheck, Eye } from 'lucide-react';
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

const docTypes = [
  { value: 'identity_proof', label: 'Identity Proof' }, { value: 'address_proof', label: 'Address Proof' },
  { value: 'pan', label: 'PAN' }, { value: 'income_proof', label: 'Income Proof' },
  { value: 'salary_slip', label: 'Salary Slip' }, { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'employment_proof', label: 'Employment Proof' }, { value: 'other', label: 'Other' }
];

const EmployeeLoans = () => {
  const [loans, setLoans] = useState([]), [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true), [page, setPage] = useState(1);
  const [search, setSearch] = useState(''), [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null), [actionLoading, setActionLoading] = useState(false);
  const [remark, setRemark] = useState(''), [recommendation, setRecommendation] = useState('');
  const [requestedDocs, setRequestedDocs] = useState(['identity_proof', 'income_proof']);

  const fetchLoans = useCallback(() => {
    setLoading(true);
    loansAPI.listAll({ page, limit: 10, ...(search && { search }), ...(status && { status }) })
      .then((d) => { setLoans(d.data.loans || []); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const open = async (loan) => {
    try { const d = await loansAPI.getById(loan._id); setSelected(d.data.loan); setRemark(''); setRecommendation(d.data.loan.employeeRecommendedAmount || ''); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };
  const act = async (fn, success) => {
    setActionLoading(true);
    try { const d = await fn(); toast.success(success); setSelected(d.data.loan); fetchLoans(); return d; }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const start = () => act(() => loansAPI.startReview(selected._id), 'Review started');
  const request = () => {
    if (!requestedDocs.length) return toast.error('Select at least one document type');
    return act(() => loansAPI.requestDocuments(selected._id, requestedDocs), 'Documents requested');
  };
  const addRemark = () => {
    if (!remark.trim()) return toast.error('Enter a remark');
    return act(() => loansAPI.addRemark(selected._id, remark.trim()), 'Remark added').then(() => setRemark(''));
  };
  const recommend = () => {
    if (!recommendation) return toast.error('Enter a recommended amount');
    return act(() => loansAPI.recommend(selected._id, recommendation), 'Recommendation saved');
  };
  const verify = (doc) => act(() => loansAPI.verifyDocument(selected._id, doc._id), 'Document verified');

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loan Review</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review loan applications within your authorized branch</p></div>
      <ManagementFilterBar
        search={search}
        onSearch={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search application or customer..."
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[{ value: '', label: 'All Status' }, ...['submitted','under_review','documents_required','approved','rejected','disbursed'].map(v => ({ value: v, label: v.replaceAll('_', ' ') }))]}
          containerClass="w-full sm:w-48 lg:w-48" />
      </ManagementFilterBar>
      <div className="card p-5">
        {loading ? <TableSkeleton rows={8} cols={7} /> : <><div className="table-container"><table className="table"><thead><tr>{['Customer','Application','Type','Requested','Status','Submitted',''].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-banking-border">{loans.map(l => <tr className="table-row" key={l._id}><td className="table-td"><p className="font-medium text-sm">{l.customer?.fullName}</p><p className="text-xs text-gray-400">{l.customer?.email}</p></td><td className="table-td font-mono text-xs">{l.applicationId}</td><td className="table-td capitalize text-sm">{l.loanType}</td><td className="table-td font-semibold">{formatCurrency(l.requestedAmount)}</td><td className="table-td"><Badge value={l.status} /></td><td className="table-td text-xs text-gray-400">{formatDate(l.submittedAt || l.createdAt)}</td><td className="table-td"><button onClick={() => open(l)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Eye className="w-4 h-4" /></button></td></tr>)}</tbody></table></div><Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} /></>}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `Review ${selected.applicationId}` : 'Loan'} size="lg">
        {selected && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3"><div className="card p-3"><p className="text-xs text-gray-500">Customer</p><p className="font-semibold text-sm">{selected.customer?.fullName}</p></div><div className="card p-3"><p className="text-xs text-gray-500">Requested</p><p className="font-semibold">{formatCurrency(selected.requestedAmount)}</p></div><div className="card p-3"><p className="text-xs text-gray-500">Status</p><Badge value={selected.status} /></div></div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p><span className="text-gray-500">Employment:</span> {selected.employmentType}</p><p><span className="text-gray-500">Income:</span> {formatCurrency(selected.monthlyIncome)}</p>
            <p><span className="text-gray-500">Tenure:</span> {selected.tenureMonths} months</p><p><span className="text-gray-500">Account:</span> {selected.account?.accountNumber}</p>
            <p className="sm:col-span-2"><span className="text-gray-500">Purpose:</span> {selected.purpose}</p>
          </div>

          <div><h4 className="font-semibold text-sm mb-2">Documents</h4><div className="space-y-2">{(selected.documents || []).map(doc => <div key={doc._id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-banking-darker"><div><p className="text-sm">{doc.fileName}</p><p className="text-xs text-gray-500 capitalize">{doc.type.replaceAll('_',' ')} · {doc.status}</p></div><div className="flex items-center gap-2">{doc.status === 'uploaded' && ['under_review','documents_required'].includes(selected.status) && <Button size="sm" icon={BadgeCheck} loading={actionLoading} onClick={() => verify(doc)}>Verify</Button>}<Badge value={doc.status} /></div></div>)}{selected.documents?.length === 0 && <p className="text-xs text-gray-400">No documents submitted.</p>}</div></div>

          {selected.status === 'submitted' && <Button icon={PlayCircle} loading={actionLoading} onClick={start}>Start Review</Button>}

          {selected.status === 'under_review' && <div className="grid md:grid-cols-2 gap-4 border-t border-gray-100 dark:border-banking-border pt-4">
            <div className="space-y-3"><h4 className="font-semibold text-sm">Request Documents</h4>{docTypes.map(d => <label key={d.value} className="flex gap-2 text-sm"><input type="checkbox" checked={requestedDocs.includes(d.value)} onChange={(e) => setRequestedDocs(v => e.target.checked ? [...new Set([...v,d.value])] : v.filter(x => x !== d.value))} />{d.label}</label>)}<Button variant="secondary" icon={FileWarning} loading={actionLoading} onClick={request}>Request Selected</Button></div>
            <div className="space-y-3"><h4 className="font-semibold text-sm">Employee Recommendation</h4><Input label="Recommended Amount (INR)" type="number" min="0.01" step="0.01" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} /><Button icon={BadgeCheck} loading={actionLoading} onClick={recommend}>Save Recommendation</Button></div>
          </div>}

          {['under_review','documents_required'].includes(selected.status) && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3"><h4 className="font-semibold text-sm">Review Remark</h4><Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a review note" /><Button variant="secondary" icon={MessageSquare} loading={actionLoading} onClick={addRemark}>Add Remark</Button></div>}
        </div>}
      </Modal>
    </div>
  );
};
export default EmployeeLoans;
