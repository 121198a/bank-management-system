import React, { useEffect, useMemo, useState } from 'react';
import { Umbrella, Eye, FileText, Clock3, CheckCircle, XCircle } from 'lucide-react';
import { insuranceAPI, accountsAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const CustomerInsurance = () => {
  const [tab, setTab] = useState('policies');
  const [products, setProducts] = useState([]), [policies, setPolicies] = useState([]), [claims, setClaims] = useState([]);
  const [accounts, setAccounts] = useState([]), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null), [selectedType, setSelectedType] = useState(null);
  const [showApply, setShowApply] = useState(false), [showClaim, setShowClaim] = useState(false), [submitting, setSubmitting] = useState(false);
  const [applyForm, setApplyForm] = useState({ productId: '', accountId: '', sumInsured: '', termMonths: 12, premiumFrequency: 'annually' });
  const [claimForm, setClaimForm] = useState({ policyId: '', incidentDate: '', description: '', claimAmount: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, pol, cl, acc] = await Promise.all([
        insuranceAPI.listProducts(), insuranceAPI.getMyPolicies(), insuranceAPI.getMyClaims(), accountsAPI.getMyAccounts()
      ]);
      setProducts(p.data.products || []);
      setPolicies(pol.data.policies || []);
      setClaims(cl.data.claims || []);
      const activeAccounts = (acc.data.accounts || []).filter((a) => a.status === 'active');
      setAccounts(activeAccounts);
      setApplyForm((f) => ({ ...f, accountId: f.accountId || activeAccounts[0]?._id || '' }));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  const selectedProduct = useMemo(() => products.find((p) => p._id === applyForm.productId), [products, applyForm.productId]);
  const activePolicies = useMemo(() => policies.filter((p) => p.status === 'active'), [policies]);

  const submitApply = async (e) => {
    e.preventDefault();
    if (!applyForm.productId || !applyForm.accountId || !applyForm.sumInsured) return toast.error('Fill in all required fields');
    setSubmitting(true);
    try {
      await insuranceAPI.applyForPolicy({ ...applyForm, termMonths: Number(applyForm.termMonths) });
      toast.success('Policy application submitted');
      setShowApply(false);
      fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  const submitClaim = async (e) => {
    e.preventDefault();
    if (!claimForm.policyId || !claimForm.incidentDate || !claimForm.description || !claimForm.claimAmount) return toast.error('Fill in all required fields');
    setSubmitting(true);
    try {
      await insuranceAPI.fileClaim(claimForm);
      toast.success('Claim filed successfully');
      setShowClaim(false);
      setClaimForm({ policyId: '', incidentDate: '', description: '', claimAmount: '' });
      fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  const openPolicy = async (p) => { try { const d = await insuranceAPI.getPolicyById(p._id); setSelected(d.data.policy); setSelectedType('policy'); } catch (err) { toast.error(getErrorMessage(err)); } };
  const openClaim = async (c) => { try { const d = await insuranceAPI.getClaimById(c._id); setSelected(d.data.claim); setSelectedType('claim'); } catch (err) { toast.error(getErrorMessage(err)); } };

  const statusIcon = { submitted: Clock3, under_review: Clock3, manager_review: Clock3, active: CheckCircle, approved: CheckCircle, settled: CheckCircle, rejected: XCircle };
  const Icon = statusIcon[selected?.status] || Clock3;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insurance</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Browse products, manage policies and claims</p></div>
        <div className="flex gap-2"><Button icon={Umbrella} onClick={() => setShowApply(true)}>Apply for Policy</Button><Button variant="secondary" icon={FileText} onClick={() => setShowClaim(true)} disabled={!activePolicies.length}>File a Claim</Button></div>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Insurance sections">
        {[{ key: 'policies', label: 'My Policies' }, { key: 'claims', label: 'My Claims' }, { key: 'products', label: 'Products' }].map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-banking-darker text-gray-600 dark:text-gray-300'}`}>{t.label}</button>
        ))}
      </div>

      <div className="card p-5">
        {loading ? <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</p> : (
          <>
            {tab === 'products' && (products.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No products available.</p> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{products.map((p) => (
                <div key={p._id} className="card p-4"><p className="font-bold text-sm">{p.name}</p><p className="text-xs text-gray-500 capitalize mt-1">{p.type} insurance</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{p.description}</p><p className="text-sm font-semibold mt-3">{p.annualPremiumRatePercent}% / year</p><p className="text-xs text-gray-500 dark:text-gray-400">Sum insured {formatCurrency(p.minSumInsured)} – {formatCurrency(p.maxSumInsured)}</p></div>
              ))}</div>
            ))}
            {tab === 'policies' && (policies.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No policies yet.</p> : (
              <div className="table-container"><table className="table"><thead><tr>{['Policy No.', 'Product', 'Sum Insured', 'Premium', 'Status', ''].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-banking-border">{policies.map((p) => (
                  <tr className="table-row" key={p._id}><td className="table-td font-mono text-xs">{p.policyNumber}</td><td className="table-td text-sm">{p.product?.name}</td><td className="table-td font-semibold">{formatCurrency(p.sumInsured)}</td><td className="table-td text-sm">{formatCurrency(p.annualPremium)}</td><td className="table-td"><Badge value={p.status} /></td><td className="table-td"><button type="button" aria-label={`View policy ${p.policyNumber}`} onClick={() => openPolicy(p)} className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-700 dark:text-primary-400"><Eye className="w-4 h-4" /></button></td></tr>
                ))}</tbody></table></div>
            ))}
            {tab === 'claims' && (claims.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No claims filed yet.</p> : (
              <div className="table-container"><table className="table"><thead><tr>{['Claim No.', 'Amount', 'Status', 'Filed', ''].map((h) => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-banking-border">{claims.map((c) => (
                  <tr className="table-row" key={c._id}><td className="table-td font-mono text-xs">{c.claimNumber}</td><td className="table-td font-semibold">{formatCurrency(c.claimAmount)}</td><td className="table-td"><Badge value={c.status} /></td><td className="table-td text-xs text-gray-500 dark:text-gray-400">{formatDate(c.createdAt)}</td><td className="table-td"><button type="button" aria-label={`View claim ${c.claimNumber}`} onClick={() => openClaim(c)} className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-700 dark:text-primary-400"><Eye className="w-4 h-4" /></button></td></tr>
                ))}</tbody></table></div>
            ))}
          </>
        )}
      </div>

      <Modal isOpen={showApply} onClose={() => setShowApply(false)} title="Apply for Insurance Policy" size="lg">
        <form onSubmit={submitApply} className="space-y-4">
          <Select label="Product" value={applyForm.productId} onChange={(e) => setApplyForm((f) => ({ ...f, productId: e.target.value }))} options={[{ value: '', label: 'Select a product' }, ...products.map((p) => ({ value: p._id, label: `${p.name} (${p.type})` }))]} required />
          {selectedProduct && <p className="text-xs text-gray-500 dark:text-gray-400">Sum insured range: {formatCurrency(selectedProduct.minSumInsured)} – {formatCurrency(selectedProduct.maxSumInsured)}. Term: {selectedProduct.minTermMonths}-{selectedProduct.maxTermMonths} months.</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Destination Account" value={applyForm.accountId} onChange={(e) => setApplyForm((f) => ({ ...f, accountId: e.target.value }))} options={accounts.map((a) => ({ value: a._id, label: `${a.accountNumber} · ${a.accountType}` }))} required />
            <Input label="Sum Insured (INR)" type="number" min="0.01" step="0.01" required value={applyForm.sumInsured} onChange={(e) => setApplyForm((f) => ({ ...f, sumInsured: e.target.value }))} />
            <Input label="Term (months)" type="number" min="1" required value={applyForm.termMonths} onChange={(e) => setApplyForm((f) => ({ ...f, termMonths: e.target.value }))} />
            <Select label="Premium Frequency" value={applyForm.premiumFrequency} onChange={(e) => setApplyForm((f) => ({ ...f, premiumFrequency: e.target.value }))} options={['monthly', 'quarterly', 'annually'].map((v) => ({ value: v, label: v }))} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Premium is calculated by the bank based on the product rate — you&apos;ll see the exact figure once your policy is issued.</p>
          <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowApply(false)}>Cancel</Button><Button type="submit" className="flex-1" loading={submitting}>Submit Application</Button></div>
        </form>
      </Modal>

      <Modal isOpen={showClaim} onClose={() => setShowClaim(false)} title="File Insurance Claim" size="lg">
        <form onSubmit={submitClaim} className="space-y-4">
          <Select label="Policy" value={claimForm.policyId} onChange={(e) => setClaimForm((f) => ({ ...f, policyId: e.target.value }))} options={[{ value: '', label: 'Select an active policy' }, ...activePolicies.map((p) => ({ value: p._id, label: `${p.policyNumber} (${formatCurrency(p.sumInsured)})` }))]} required />
          <Input label="Incident Date" type="date" required value={claimForm.incidentDate} onChange={(e) => setClaimForm((f) => ({ ...f, incidentDate: e.target.value }))} />
          <Input label="Claim Amount (INR)" type="number" min="0.01" step="0.01" required value={claimForm.claimAmount} onChange={(e) => setClaimForm((f) => ({ ...f, claimAmount: e.target.value }))} />
          <Input label="Description" required value={claimForm.description} onChange={(e) => setClaimForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowClaim(false)}>Cancel</Button><Button type="submit" className="flex-1" loading={submitting}>File Claim</Button></div>
        </form>
      </Modal>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? (selectedType === 'policy' ? `Policy ${selected.policyNumber}` : `Claim ${selected.claimNumber}`) : ''} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-banking-darker">
              <div><p className="text-xs text-gray-500">Current status</p><div className="flex items-center gap-2 mt-1"><Icon className="w-4 h-4 text-primary-700 dark:text-primary-400" /><Badge value={selected.status} /></div></div>
              <div className="text-right"><p className="text-xs text-gray-500">{selectedType === 'policy' ? 'Sum Insured' : 'Claim Amount'}</p><p className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedType === 'policy' ? selected.sumInsured : selected.claimAmount)}</p></div>
            </div>
            {selectedType === 'policy' && <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-gray-500">Annual Premium:</span> {formatCurrency(selected.annualPremium)}</p>
              <p><span className="text-gray-500">Term:</span> {selected.termMonths} months</p>
              {selected.startDate && <p><span className="text-gray-500">Valid until:</span> {formatDate(selected.endDate)}</p>}
            </div>}
            {selectedType === 'claim' && <p className="text-sm"><span className="text-gray-500">Description:</span> {selected.description}</p>}
            {selectedType === 'claim' && selected.approvedAmount && <p className="text-sm"><span className="text-gray-500">Approved amount:</span> {formatCurrency(selected.approvedAmount)}</p>}
            {(selected.remarks || []).length > 0 && <div><h4 className="font-semibold text-sm mb-2">Remarks</h4><div className="space-y-2">{selected.remarks.map((r, i) => <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-banking-darker text-sm"><p>{r.text}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(r.at)}</p></div>)}</div></div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerInsurance;
