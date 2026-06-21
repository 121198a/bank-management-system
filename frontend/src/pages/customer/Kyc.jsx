import React, { useEffect, useState } from 'react';
import { ShieldCheck, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';
import { kycAPI } from '../../api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const statusIcon = { approved: CheckCircle, rejected: XCircle, pending: Clock };
const statusColor = { approved: 'text-green-600', rejected: 'text-red-500', pending: 'text-yellow-500' };

const CustomerKyc = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ documentType: 'aadhaar', documentNumber: '', documentUrl: '' });
  const [errors, setErrors] = useState({});
  const hasPending = requests.some(r => r.status === 'pending');
  const isVerified = requests.some(r => r.status === 'approved');

  const fetchKyc = () => {
    setLoading(true);
    kycAPI.getMy().then(d => setRequests(d.data.kycRequests)).catch(err => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  };

  useEffect(() => { fetchKyc(); }, []);

  const validate = () => {
    const errs = {};
    if (!form.documentNumber || form.documentNumber.length < 5) errs.documentNumber = 'Enter a valid document number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await kycAPI.submit(form);
      toast.success('KYC submitted successfully!');
      fetchKyc();
      setForm({ documentType: 'aadhaar', documentNumber: '', documentUrl: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">KYC Verification</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Submit your identity documents for verification</p>
      </div>

      {isVerified && (
        <div className="card p-5 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">KYC Verified</p>
              <p className="text-sm text-green-600 dark:text-green-500">Your identity has been verified. You have full account access.</p>
            </div>
          </div>
        </div>
      )}

      {!isVerified && !hasPending && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Submit KYC Documents</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Provide your identity document details below</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Document Type" value={form.documentType}
              onChange={(e) => setForm(f => ({ ...f, documentType: e.target.value }))}
              options={[
                { value: 'aadhaar', label: 'Aadhaar Card' },
                { value: 'pan', label: 'PAN Card' },
                { value: 'passport', label: 'Passport' },
                { value: 'driving_license', label: 'Driving License' },
                { value: 'voter_id', label: 'Voter ID' }
              ]} />
            <Input label="Document Number" placeholder="Enter document number"
              value={form.documentNumber} onChange={(e) => setForm(f => ({ ...f, documentNumber: e.target.value.toUpperCase() }))}
              error={errors.documentNumber} />
            <Input label="Document URL (optional)" placeholder="https://..." type="url"
              value={form.documentUrl} onChange={(e) => setForm(f => ({ ...f, documentUrl: e.target.value }))} />
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-400">
              Your documents will be reviewed by our team within 24-48 hours.
            </div>
            <Button type="submit" loading={submitting} icon={ShieldCheck} className="w-full">Submit for Verification</Button>
          </form>
        </div>
      )}

      {hasPending && (
        <div className="card p-5 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">Review in Progress</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">Your KYC request is under review. We'll notify you once complete.</p>
            </div>
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Submission History</h3>
          <div className="space-y-3">
            {requests.map((req) => {
              const Icon = statusIcon[req.status] || Clock;
              return (
                <div key={req._id} className="flex items-start justify-between p-4 rounded-xl bg-gray-50 dark:bg-banking-darker">
                  <div className="flex items-center gap-3">
                    <Icon className={'w-5 h-5 ' + (statusColor[req.status] || 'text-gray-400')} />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{req.documentType.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{req.documentNumber}</p>
                      {req.remarks && <p className="text-xs text-gray-400 mt-0.5">Remarks: {req.remarks}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge value={req.status} />
                    <p className="text-xs text-gray-400 mt-1">{formatDate(req.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerKyc;
