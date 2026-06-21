import React, { useEffect, useState, useCallback } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { kycAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const EmployeeKyc = () => {
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', remarks: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchKyc = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 10, ...(search && { search }), ...(statusFilter && { status: statusFilter }) };
    kycAPI.listAll(params)
      .then((d) => { setRequests(d.data.kycRequests); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

  const openReview = (kyc, defaultStatus) => { setSelectedKyc(kyc); setReviewForm({ status: defaultStatus || 'approved', remarks: '' }); };

  const handleReview = async () => {
    setActionLoading(true);
    try {
      await kycAPI.review(selectedKyc._id, reviewForm.status, reviewForm.remarks);
      toast.success('KYC ' + reviewForm.status + ' successfully');
      setSelectedKyc(null);
      fetchKyc();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const docTypeLabel = { aadhaar: 'Aadhaar', pan: 'PAN', passport: 'Passport', driving_license: 'Driving License', voter_id: 'Voter ID' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">KYC Review</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Verify customer identity documents</p>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-10" placeholder="Search customers or documents..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: '', label: 'All' }]}
            containerClass="w-36" />
        </div>

        {loading ? <TableSkeleton rows={8} cols={5} /> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {['Customer', 'Document', 'Number', 'Status', 'Submitted', 'Actions'].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-banking-border bg-white dark:bg-banking-card">
                  {requests.length === 0 ? (
                    <tr><td colSpan={6} className="table-td text-center py-10 text-gray-400">No KYC requests found</td></tr>
                  ) : requests.map((kyc) => (
                    <tr key={kyc._id} className="table-row">
                      <td className="table-td">
                        <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{kyc.user?.fullName}</p>
                        <p className="text-xs text-gray-400">{kyc.user?.email}</p>
                      </td>
                      <td className="table-td text-sm">{docTypeLabel[kyc.documentType] || kyc.documentType}</td>
                      <td className="table-td font-mono text-xs">{kyc.documentNumber}</td>
                      <td className="table-td"><Badge value={kyc.status} /></td>
                      <td className="table-td text-xs text-gray-400">{formatDate(kyc.createdAt, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="table-td">
                        {kyc.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => openReview(kyc, 'approved')}
                              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => openReview(kyc, 'rejected')}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {kyc.status !== 'pending' && (
                          <p className="text-xs text-gray-400">{kyc.reviewedBy?.fullName || 'Reviewed'}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal isOpen={!!selectedKyc} onClose={() => setSelectedKyc(null)} title="Review KYC Request" size="sm">
        {selectedKyc && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-banking-darker text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-medium text-gray-800 dark:text-gray-200">{selectedKyc.user?.fullName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Document:</span><span className="text-gray-700 dark:text-gray-300">{docTypeLabel[selectedKyc.documentType]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Number:</span><span className="font-mono text-gray-700 dark:text-gray-300">{selectedKyc.documentNumber}</span></div>
            </div>
            <Select label="Decision" value={reviewForm.status}
              onChange={(e) => setReviewForm(f => ({ ...f, status: e.target.value }))}
              options={[{ value: 'approved', label: 'Approve KYC' }, { value: 'rejected', label: 'Reject KYC' }]} />
            <Input label="Remarks" placeholder="Optional note for customer"
              value={reviewForm.remarks} onChange={(e) => setReviewForm(f => ({ ...f, remarks: e.target.value }))} />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setSelectedKyc(null)}>Cancel</Button>
              <Button variant={reviewForm.status === 'approved' ? 'primary' : 'danger'} className="flex-1"
                loading={actionLoading} onClick={handleReview}>
                {reviewForm.status === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeKyc;
