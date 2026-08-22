import React, { useCallback, useEffect, useState } from 'react';
import { Eye, PlayCircle, Send, Users2, BadgeCheck, CheckCircle2, MessageSquare } from 'lucide-react';
import { insuranceAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import ManagementFilterBar from '../../components/ui/ManagementFilterBar';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters';
import { useEmployee } from '../../context/EmployeeContext';
import toast from 'react-hot-toast';

const TABS = [{ key: 'policies', label: 'Policies' }, { key: 'claims', label: 'Claims' }, { key: 'products', label: 'Products' }];
const POLICY_STATUSES = ['submitted','under_review','documents_required','manager_review','approved','active','rejected','lapsed','expired','cancelled'];
const CLAIM_STATUSES = ['submitted','under_review','manager_review','approved','rejected','settled','cancelled'];

const EmployeeInsurance = () => {
  const { isManager, isDepartmentHead, isBankHead, hasPermission } = useEmployee();
  const canManagerReview = isManager() || isDepartmentHead() || isBankHead();
  const canApprove = hasPermission('insurance.approve');
  const [tab, setTab] = useState('policies');
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(''), [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [amount, setAmount] = useState(''), [reason, setReason] = useState('');

  const load = useCallback(() => {
    setLoading(true); setSelected(null);
    const params = status ? { status } : {};
    const call = tab === 'policies' ? insuranceAPI.listPolicies(params) : tab === 'claims' ? insuranceAPI.listClaims(params) : insuranceAPI.listProducts(params);
    call.then((d) => setItems(d.data.policies || d.data.claims || d.data.products || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [tab, status]);
  useEffect(() => { setStatus(''); }, [tab]);
  useEffect(() => { load(); }, [load]);

  const openPolicy = async (id) => { try { const d = await insuranceAPI.getPolicyById(id); setSelected({ type: 'policy', ...d.data.policy }); setAmount(''); setReason(''); } catch (err) { toast.error(getErrorMessage(err)); } };
  const openClaim = async (id) => { try { const d = await insuranceAPI.getClaimById(id); setSelected({ type: 'claim', ...d.data.claim }); setAmount(d.data.claim.claimAmount || ''); setReason(''); } catch (err) { toast.error(getErrorMessage(err)); } };

  const act = async (fn, msg) => {
    setActionLoading(true);
    try { await fn(); toast.success(msg); await load(); if (selected) selected.type === 'policy' ? openPolicy(selected._id) : openClaim(selected._id); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const isPolicy = selected?.type === 'policy';

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Insurance</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review policy applications and claims</p></div>

      <div className="flex gap-2" role="tablist" aria-label="Insurance sections">
        {TABS.map((t) => <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-banking-darker text-gray-600 dark:text-gray-300'}`}>{t.label}</button>)}
      </div>

      {tab !== 'products' && <ManagementFilterBar search="" onSearch={() => {}} placeholder="">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}
          options={[{ value: '', label: 'All Status' }, ...(tab === 'policies' ? POLICY_STATUSES : CLAIM_STATUSES).map(v => ({ value: v, label: v.replaceAll('_',' ') }))]}
          containerClass="w-full sm:w-52" />
      </ManagementFilterBar>}

      <div className="card p-5">
        {loading ? <TableSkeleton rows={6} cols={6} /> : items.length === 0 ? <p className="text-sm text-gray-400 py-8 text-center">No {tab} found.</p> : (
          <div className="table-container"><table className="table"><thead><tr>{(tab === 'products' ? ['Code','Name','Type','Rate','Term','Status'] : tab === 'policies' ? ['Customer','Policy No.','Sum Insured','Premium','Status','Applied',''] : ['Customer','Claim No.','Amount','Status','Filed','']).map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-banking-border">
              {tab === 'products' && items.map(p => <tr key={p._id} className="table-row"><td className="table-td font-mono text-xs">{p.code}</td><td className="table-td font-medium text-sm">{p.name}</td><td className="table-td capitalize text-sm">{p.type}</td><td className="table-td text-sm">{p.annualPremiumRatePercent}%/yr</td><td className="table-td text-sm">{p.minTermMonths}-{p.maxTermMonths}mo</td><td className="table-td"><Badge value={p.status} /></td></tr>)}
              {tab === 'policies' && items.map(p => <tr key={p._id} className="table-row"><td className="table-td"><p className="font-medium text-sm">{p.customer?.fullName}</p></td><td className="table-td font-mono text-xs">{p.policyNumber}</td><td className="table-td font-semibold">{formatCurrency(p.sumInsured)}</td><td className="table-td text-sm">{formatCurrency(p.annualPremium)}</td><td className="table-td"><Badge value={p.status} /></td><td className="table-td text-xs text-gray-400">{formatDate(p.createdAt)}</td><td className="table-td"><button type="button" aria-label={`View policy ${p.policyNumber}`} onClick={() => openPolicy(p._id)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Eye className="w-4 h-4" /></button></td></tr>)}
              {tab === 'claims' && items.map(c => <tr key={c._id} className="table-row"><td className="table-td"><p className="font-medium text-sm">{c.customer?.fullName}</p></td><td className="table-td font-mono text-xs">{c.claimNumber}</td><td className="table-td font-semibold">{formatCurrency(c.claimAmount)}</td><td className="table-td"><Badge value={c.status} /></td><td className="table-td text-xs text-gray-400">{formatDate(c.createdAt)}</td><td className="table-td"><button type="button" aria-label={`View claim ${c.claimNumber}`} onClick={() => openClaim(c._id)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Eye className="w-4 h-4" /></button></td></tr>)}
            </tbody></table></div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? (isPolicy ? `Policy ${selected.policyNumber}` : `Claim ${selected.claimNumber}`) : ''} size="lg">
        {selected && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-3"><p className="text-xs text-gray-500">Customer</p><p className="font-semibold text-sm">{selected.customer?.fullName}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-500">{isPolicy ? 'Sum Insured' : 'Claim Amount'}</p><p className="font-semibold">{formatCurrency(isPolicy ? selected.sumInsured : selected.claimAmount)}</p></div>
            <div className="card p-3"><p className="text-xs text-gray-500">Status</p><Badge value={selected.status} /></div>
          </div>

          {isPolicy && <p className="text-sm"><span className="text-gray-500">Annual premium (server-calculated):</span> <span className="font-semibold">{formatCurrency(selected.annualPremium)}</span></p>}
          {!isPolicy && <p className="text-sm"><span className="text-gray-500">Description:</span> {selected.description}</p>}

          {isPolicy && selected.status === 'submitted' && <Button icon={PlayCircle} loading={actionLoading} onClick={() => act(() => insuranceAPI.startPolicyReview(selected._id), 'Review started')}>Start Review</Button>}
          {!isPolicy && selected.status === 'submitted' && <Button icon={PlayCircle} loading={actionLoading} onClick={() => act(() => insuranceAPI.startClaimReview(selected._id), 'Review started')}>Start Review</Button>}

          {selected.status === 'under_review' && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a review remark" />
            <Button variant="secondary" icon={MessageSquare} loading={actionLoading} onClick={() => act(() => (isPolicy ? insuranceAPI.addPolicyRemark(selected._id, reason) : Promise.resolve()), 'Remark added')} disabled={!isPolicy}>Add Remark</Button>
            <Button icon={Send} loading={actionLoading} onClick={() => act(() => (isPolicy ? insuranceAPI.forwardPolicyToManager(selected._id) : insuranceAPI.forwardClaimToManager(selected._id)), 'Forwarded to manager')}>Forward to Manager</Button>
          </div>}

          {selected.status === 'manager_review' && canManagerReview && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Users2 className="w-4 h-4" /> Manager Review</h4>
            <div className="flex flex-wrap gap-3">
              <Button icon={CheckCircle2} loading={actionLoading} onClick={() => act(() => (isPolicy ? insuranceAPI.managerReviewPolicy(selected._id, 'forward') : insuranceAPI.managerReviewClaim(selected._id, 'forward')), 'Recommended forward')}>Recommend Forward</Button>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" containerClass="flex-1 min-w-[180px]" />
              <Button variant="danger" loading={actionLoading} onClick={() => act(() => (isPolicy ? insuranceAPI.managerReviewPolicy(selected._id, 'reject', { reason }) : insuranceAPI.managerReviewClaim(selected._id, 'reject', { reason })), 'Rejected')}>Reject</Button>
            </div>
          </div>}

          {selected.status === 'manager_review' && canApprove && <div className="border-t border-gray-100 dark:border-banking-border pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Final Approval</h4>
            {!isPolicy && <Input label="Approved Amount (INR)" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />}
            <div className="flex flex-wrap gap-3">
              <Button icon={BadgeCheck} loading={actionLoading} onClick={() => act(() => (isPolicy ? insuranceAPI.approvePolicy(selected._id) : insuranceAPI.approveClaim(selected._id, amount)), isPolicy ? 'Policy issued' : 'Claim approved')}>{isPolicy ? 'Issue Policy' : 'Approve Claim'}</Button>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" containerClass="flex-1 min-w-[180px]" />
              <Button variant="danger" loading={actionLoading} onClick={() => act(() => (isPolicy ? insuranceAPI.rejectPolicy(selected._id, reason) : insuranceAPI.rejectClaim(selected._id, reason)), 'Rejected')}>Reject</Button>
            </div>
          </div>}

          {!isPolicy && selected.status === 'approved' && <div className="border-t border-gray-100 dark:border-banking-border pt-4"><Button icon={CheckCircle2} loading={actionLoading} onClick={() => act(() => insuranceAPI.settleClaim(selected._id), 'Claim settled — account credited')}>Settle Claim</Button></div>}
        </div>}
      </Modal>
    </div>
  );
};
export default EmployeeInsurance;
