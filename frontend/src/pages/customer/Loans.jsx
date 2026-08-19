import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle, FileUp, Eye, Clock3, XCircle } from 'lucide-react';
import { loansAPI, accountsAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const loanTypes = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'vehicle', label: 'Vehicle Loan' },
  { value: 'business', label: 'Business Loan' }
];
const employmentTypes = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'other', label: 'Other' }
];
const documentTypes = [
  { value: 'identity_proof', label: 'Identity Proof' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'pan', label: 'PAN' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'salary_slip', label: 'Salary Slip' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'employment_proof', label: 'Employment Proof' },
  { value: 'other', label: 'Other' }
];

const statusTone = (status) => status;
const CustomerLoans = () => {
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('identity_proof');
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    accountId: '', employmentType: 'salaried', employerName: '', designation: '',
    monthlyIncome: '', workExperienceYears: '', loanType: 'personal',
    requestedAmount: '', tenureMonths: 12, purpose: '', existingEmi: '', hasExistingLoans: false
  });

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const [loanData, accountData] = await Promise.all([loansAPI.getMy({ limit: 100 }), accountsAPI.getMyAccounts()]);
      setLoans(loanData.data.loans || []);
      const activeAccounts = (accountData.data.accounts || []).filter((a) => a.status === 'active');
      setAccounts(activeAccounts);
      setForm((f) => ({ ...f, accountId: f.accountId || activeAccounts[0]?._id || '' }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const counts = useMemo(() => ({
    total: loans.length,
    pending: loans.filter((l) => ['submitted', 'under_review'].includes(l.status)).length,
    documents: loans.filter((l) => l.status === 'documents_required').length,
    approved: loans.filter((l) => l.status === 'approved').length,
    disbursed: loans.filter((l) => l.status === 'disbursed').length,
    rejected: loans.filter((l) => l.status === 'rejected').length
  }), [loans]);

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!form.accountId) return toast.error('Select an active destination account');
    setApplying(true);
    try {
      await loansAPI.create({
        ...form,
        monthlyIncome: form.monthlyIncome || '0.00',
        existingEmi: form.existingEmi || '0.00',
        workExperienceYears: form.workExperienceYears || 0,
        tenureMonths: Number(form.tenureMonths)
      });
      toast.success('Loan application submitted successfully');
      setShowApply(false);
      setForm((f) => ({ ...f, requestedAmount: '', purpose: '', monthlyIncome: '', existingEmi: '', employerName: '', designation: '' }));
      fetchLoans();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  const openLoan = async (loan) => {
    try {
      const data = await loansAPI.getById(loan._id);
      setSelected(data.data.loan);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const upload = async () => {
    if (!file || !selected) return toast.error('Choose a document first');
    if (file.size > 5 * 1024 * 1024) return toast.error('Maximum document size is 5MB');
    setUploading(true);
    try {
      await loansAPI.uploadDocument(selected._id, file, uploadType);
      toast.success('Document uploaded');
      setFile(null);
      const data = await loansAPI.getById(selected._id);
      setSelected(data.data.loan);
      fetchLoans();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const statusIcon = { submitted: Clock3, under_review: Clock3, documents_required: FileUp, approved: CheckCircle, disbursed: CheckCircle, rejected: XCircle };
  const Icon = statusIcon[selected?.status] || Clock3;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loans</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Apply for and track your loan applications</p>
        </div>
        <Button icon={Banknote} onClick={() => setShowApply(true)}>Apply for Loan</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Total', counts.total], ['Pending', counts.pending], ['Documents', counts.documents],
          ['Approved', counts.approved], ['Disbursed', counts.disbursed], ['Rejected', counts.rejected]
        ].map(([label, value]) => (
          <div className="card p-4" key={label}><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p></div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">My Applications</h3>
        {loading ? <p className="text-sm text-gray-400 py-8 text-center">Loading loans…</p> : loans.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No loan applications yet.</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr>{['Application', 'Type', 'Amount', 'Tenure', 'Status', 'Created', ''].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-banking-border">
                {loans.map((loan) => (
                  <tr className="table-row" key={loan._id}>
                    <td className="table-td font-mono text-xs">{loan.applicationId}</td>
                    <td className="table-td text-sm capitalize">{loan.loanType}</td>
                    <td className="table-td font-semibold">{formatCurrency(loan.requestedAmount)}</td>
                    <td className="table-td text-sm">{loan.tenureMonths} mo.</td>
                    <td className="table-td"><Badge value={statusTone(loan.status)} /></td>
                    <td className="table-td text-xs text-gray-400">{formatDate(loan.createdAt, { year: 'numeric', month: 'short', day: '2-digit' })}</td>
                    <td className="table-td"><button onClick={() => openLoan(loan)} className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600" title="View"><Eye className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showApply} onClose={() => setShowApply(false)} title="Apply for Loan" size="lg">
        <form onSubmit={submitApplication} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Loan Type" value={form.loanType} onChange={(e) => setForm(f => ({ ...f, loanType: e.target.value }))} options={loanTypes} />
            <Select label="Destination Account" value={form.accountId} onChange={(e) => setForm(f => ({ ...f, accountId: e.target.value }))} options={accounts.map(a => ({ value: a._id, label: `${a.accountNumber} · ${a.accountType}` }))} />
            <Input label="Requested Amount (INR)" type="number" min="0.01" step="0.01" required value={form.requestedAmount} onChange={(e) => setForm(f => ({ ...f, requestedAmount: e.target.value }))} />
            <Input label="Tenure (months)" type="number" min="3" max="360" required value={form.tenureMonths} onChange={(e) => setForm(f => ({ ...f, tenureMonths: e.target.value }))} />
            <Select label="Employment Type" value={form.employmentType} onChange={(e) => setForm(f => ({ ...f, employmentType: e.target.value }))} options={employmentTypes} />
            <Input label="Monthly Income (INR)" type="number" min="0" step="0.01" value={form.monthlyIncome} onChange={(e) => setForm(f => ({ ...f, monthlyIncome: e.target.value }))} />
            <Input label="Employer / Business Name" value={form.employerName} onChange={(e) => setForm(f => ({ ...f, employerName: e.target.value }))} />
            <Input label="Designation" value={form.designation} onChange={(e) => setForm(f => ({ ...f, designation: e.target.value }))} />
            <Input label="Work Experience (years)" type="number" min="0" step="0.1" value={form.workExperienceYears} onChange={(e) => setForm(f => ({ ...f, workExperienceYears: e.target.value }))} />
            <Input label="Existing EMI (INR)" type="number" min="0" step="0.01" value={form.existingEmi} onChange={(e) => setForm(f => ({ ...f, existingEmi: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={form.hasExistingLoans} onChange={(e) => setForm(f => ({ ...f, hasExistingLoans: e.target.checked }))} /> I have existing loans</label>
          <Input label="Loan Purpose" required value={form.purpose} onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))} />
          <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowApply(false)}>Cancel</Button><Button type="submit" className="flex-1" loading={applying}>Submit Application</Button></div>
        </form>
      </Modal>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `Loan ${selected.applicationId}` : 'Loan'} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-banking-darker">
              <div><p className="text-xs text-gray-500">Current status</p><div className="flex items-center gap-2 mt-1"><Icon className="w-4 h-4 text-primary-600" /><Badge value={selected.status} /></div></div>
              <div className="text-right"><p className="text-xs text-gray-500">Requested</p><p className="font-bold text-gray-900 dark:text-white">{formatCurrency(selected.requestedAmount)}</p></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-gray-500">Loan type:</span> <span className="capitalize">{selected.loanType}</span></p>
              <p><span className="text-gray-500">Tenure:</span> {selected.tenureMonths} months</p>
              <p><span className="text-gray-500">Account:</span> {selected.account?.accountNumber || '—'}</p>
              <p><span className="text-gray-500">Purpose:</span> {selected.purpose}</p>
              <p><span className="text-gray-500">Recommendation:</span> {selected.employeeRecommendedAmount ? formatCurrency(selected.employeeRecommendedAmount) : 'Pending'}</p>
              <p><span className="text-gray-500">Approved:</span> {selected.approvedAmount ? formatCurrency(selected.approvedAmount) : 'Pending'}</p>
            </div>

            {selected.documentsRequested?.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20"><p className="font-semibold text-sm text-amber-800 dark:text-amber-300">Documents requested</p><p className="text-xs mt-1 text-amber-700 dark:text-amber-400">{selected.documentsRequested.join(', ')}</p></div>
            )}

            <div>
              <h4 className="font-semibold text-sm mb-2">Documents</h4>
              <div className="space-y-2">
                {(selected.documents || []).map((doc) => <div key={doc._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-banking-darker"><div><p className="text-sm">{doc.fileName}</p><p className="text-xs text-gray-500 capitalize">{doc.type.replaceAll('_', ' ')} · {doc.status}</p></div><Badge value={doc.status} /></div>)}
                {selected.documents?.length === 0 && <p className="text-xs text-gray-400">No documents submitted yet.</p>}
              </div>
            </div>

            {selected.status === 'documents_required' && (
              <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
                <h4 className="font-semibold text-sm">Upload requested document</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select value={uploadType} onChange={(e) => setUploadType(e.target.value)} options={documentTypes} />
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input-field pt-2" />
                </div>
                <Button icon={FileUp} loading={uploading} onClick={upload}>Upload Document</Button>
              </div>
            )}

            {(selected.remarks || []).length > 0 && <div><h4 className="font-semibold text-sm mb-2">Remarks</h4><div className="space-y-2">{selected.remarks.map((r, i) => <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-banking-darker text-sm"><p>{r.text}</p><p className="text-xs text-gray-400 mt-1">{r.by?.fullName || 'Bank'} · {formatDate(r.at)}</p></div>)}</div></div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerLoans;
