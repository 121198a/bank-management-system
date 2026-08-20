import React, { useEffect, useState, useCallback } from 'react';
import { UserCog, CheckCircle, XCircle, UserPlus, Pencil, Copy } from 'lucide-react';
import { usersAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import ManagementFilterBar from '../../components/ui/ManagementFilterBar';
import { TableSkeleton } from '../../components/skeletons/Skeletons';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const emptyCreateForm = { fullName: '', email: '', password: '', role: 'customer', phone: '', address: '' };
const emptyEditForm = { fullName: '', email: '', phone: '', address: '' };

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return 'A1' + pwd;
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: '', kycStatus: '' });

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'role' | 'status'
  const [newRole, setNewRole] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [createErrors, setCreateErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 10, ...(search && { search }), ...(filters.role && { role: filters.role }), ...(filters.kycStatus && { kycStatus: filters.kycStatus }) };
    usersAPI.listUsers(params)
      .then((d) => { setUsers(d.data.users); setMeta(d.meta || {}); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setCreateForm(emptyCreateForm);
    setEditForm(emptyEditForm);
    setCreateErrors({});
  };

  const openCreate = () => { setCreateForm({ ...emptyCreateForm, password: generatePassword() }); setModalType('create'); };
  const openEdit = (user) => {
    setSelectedUser(user);
    setEditForm({ fullName: user.fullName, email: user.email, phone: user.phone || '', address: user.address || '' });
    setModalType('edit');
  };
  const openRole = (user) => { setSelectedUser(user); setNewRole(user.role); setModalType('role'); };
  const openStatus = (user) => { setSelectedUser(user); setModalType('status'); };

  const validateCreate = () => {
    const errs = {};
    if (!createForm.fullName || createForm.fullName.trim().length < 2) errs.fullName = 'Full name must be at least 2 characters';
    if (!createForm.email || !/\S+@\S+\.\S+/.test(createForm.email)) errs.email = 'Valid email is required';
    if (!createForm.password || createForm.password.length < 12) errs.password = 'Password must be at least 12 characters';
    else if (!/[A-Z]/.test(createForm.password)) errs.password = 'Must contain an uppercase letter';
    else if (!/[a-z]/.test(createForm.password)) errs.password = 'Must contain a lowercase letter';
    else if (!/[0-9]/.test(createForm.password)) errs.password = 'Must contain a number';
    else if (!/[^A-Za-z0-9]/.test(createForm.password)) errs.password = 'Must contain a special character';
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateCreate()) return;
    setActionLoading(true);
    try {
      await usersAPI.createUser(createForm);
      toast.success(`${createForm.role.charAt(0).toUpperCase() + createForm.role.slice(1)} account created successfully`);
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await usersAPI.editUser(selectedUser.id, editForm);
      toast.success('User details updated successfully');
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleUpdate = async () => {
    setActionLoading(true);
    try {
      await usersAPI.updateRole(selectedUser.id, newRole);
      toast.success('Role updated successfully');
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    setActionLoading(true);
    try {
      await usersAPI.updateStatus(selectedUser.id, !selectedUser.isActive);
      toast.success('User status updated');
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(createForm.password);
    toast.success('Password copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create and manage employees and customers</p>
        </div>
        <Button icon={UserPlus} onClick={openCreate}>Create User</Button>
      </div>

      <ManagementFilterBar
        search={search}
        onSearch={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by name or email..."
      >
        <Select value={filters.role} onChange={(e) => { setFilters(f => ({ ...f, role: e.target.value })); setPage(1); }}
          options={[{ value: '', label: 'All Roles' }, { value: 'admin', label: 'Admin' }, { value: 'employee', label: 'Employee' }, { value: 'customer', label: 'Customer' }]}
          containerClass="w-full sm:w-40 lg:w-40" />
        <Select value={filters.kycStatus} onChange={(e) => { setFilters(f => ({ ...f, kycStatus: e.target.value })); setPage(1); }}
          options={[{ value: '', label: 'All KYC' }, { value: 'pending', label: 'Pending' }, { value: 'verified', label: 'Verified' }, { value: 'rejected', label: 'Rejected' }]}
          containerClass="w-full sm:w-40 lg:w-40" />
      </ManagementFilterBar>

      <div className="card p-5">
        {loading ? <TableSkeleton rows={8} cols={6} /> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {['User', 'Role', 'KYC Status', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-banking-border bg-white dark:bg-banking-card">
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="table-td text-center py-10 text-gray-400">No users found. Click "Create User" to add your first employee or customer.</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="table-row">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: u.avatarColor }}>
                            {u.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{u.fullName}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td"><Badge value={u.role} /></td>
                      <td className="table-td"><Badge value={u.kycStatus} /></td>
                      <td className="table-td">
                        <span className={'badge ' + (u.isActive ? 'badge-success' : 'badge-danger')}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td text-gray-400 text-xs">{formatDate(u.createdAt, { year: 'numeric', month: 'short', day: '2-digit' })}</td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-banking-border text-gray-500 transition-colors" title="Edit Details">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => openRole(u)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors" title="Change Role">
                            <UserCog className="w-4 h-4" />
                          </button>
                          <button onClick={() => openStatus(u)}
                            className={'p-1.5 rounded-lg transition-colors ' + (u.isActive ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500' : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600')}
                            title={u.isActive ? 'Deactivate' : 'Activate'}>
                            {u.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={meta.totalPages || 1} onPageChange={setPage} />
            <p className="text-xs text-gray-400 mt-2 text-center">{meta.total} total users</p>
          </>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={modalType === 'create'} onClose={closeModal} title="Create New User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Account Type" value={createForm.role}
            onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))}
            options={[{ value: 'customer', label: 'Customer' }, { value: 'employee', label: 'Employee' }, { value: 'admin', label: 'Admin' }]} />
          <Input label="Full Name" placeholder="e.g. Priya Patel"
            value={createForm.fullName} onChange={(e) => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
            error={createErrors.fullName} />
          <Input label="Email Address" type="email" placeholder="user@digitalbank.com"
            value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
            error={createErrors.email} />
          <div>
            <label className="input-label">Temporary Password</label>
            <div className="flex gap-2">
              <input className={'input-field flex-1 font-mono' + (createErrors.password ? ' border-red-400' : '')}
                value={createForm.password}
                onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} />
              <Button type="button" variant="secondary" icon={Copy} onClick={copyPassword}>Copy</Button>
            </div>
            {createErrors.password && <p className="mt-1.5 text-xs text-red-500">{createErrors.password}</p>}
            <p className="mt-1.5 text-xs text-gray-400">Share this password with the user securely. They can change it after logging in.</p>
          </div>
          <Input label="Phone (optional)" placeholder="+91 98765 43210"
            value={createForm.phone} onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Address (optional)" placeholder="e.g. MG Road, Bengaluru"
            value={createForm.address} onChange={(e) => setCreateForm(f => ({ ...f, address: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={actionLoading} className="flex-1">Create Account</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={modalType === 'edit'} onClose={closeModal} title="Edit User Details" size="sm">
        {selectedUser && (
          <form onSubmit={handleEdit} className="space-y-4">
            <Input label="Full Name" value={editForm.fullName}
              onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
            <Input label="Email Address" type="email" value={editForm.email}
              onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={editForm.phone}
              onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Address" value={editForm.address}
              onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" loading={actionLoading} className="flex-1">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Role Modal */}
      <Modal isOpen={modalType === 'role'} onClose={closeModal} title="Change User Role" size="sm">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Changing role for <strong>{selectedUser.fullName}</strong>
            </p>
            <Select label="New Role" value={newRole} onChange={(e) => setNewRole(e.target.value)}
              options={[{ value: 'admin', label: 'Admin' }, { value: 'employee', label: 'Employee' }, { value: 'customer', label: 'Customer' }]} />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button className="flex-1" loading={actionLoading} onClick={handleRoleUpdate}>Update Role</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={modalType === 'status'} onClose={closeModal} title={selectedUser?.isActive ? 'Deactivate User' : 'Activate User'} size="sm">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to {selectedUser.isActive ? 'deactivate' : 'activate'} <strong>{selectedUser.fullName}</strong>?
              {selectedUser.isActive && ' This will immediately log them out of all sessions.'}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button variant={selectedUser.isActive ? 'danger' : 'primary'} className="flex-1" loading={actionLoading} onClick={handleStatusToggle}>
                {selectedUser.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
