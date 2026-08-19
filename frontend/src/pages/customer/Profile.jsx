import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Lock, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ fullName: user?.fullName || '', phone: user?.phone || '', address: user?.address || '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await usersAPI.updateMe(profile);
      updateUser(res.data.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!password.currentPassword) errs.currentPassword = 'Current password required';
    if (!password.newPassword || password.newPassword.length < 12) errs.newPassword = 'Min 12 characters';
    else if (!/[A-Z]/.test(password.newPassword)) errs.newPassword = 'Must contain uppercase letter';
    else if (!/[0-9]/.test(password.newPassword)) errs.newPassword = 'Must contain a number';
    else if (!/[^A-Za-z0-9]/.test(password.newPassword)) errs.newPassword = 'Must contain a special character';
    if (password.newPassword !== password.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingPassword(true);
    try {
      await usersAPI.updateMe({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      toast.success('Password changed successfully! Please log in again on other devices.');
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account details</p>
      </div>

      {/* Avatar card */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          style={{ backgroundColor: user?.avatarColor }}>
          {user?.fullName?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{user?.fullName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge value={user?.role} />
            <Badge value={user?.kycStatus} />
          </div>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-xs text-gray-400">Member since</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDate(user?.createdAt, { year: 'numeric', month: 'short' })}</p>
        </div>
      </div>

      {/* Profile form */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-5">Personal Information</h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input label="Full Name" icon={User} value={profile.fullName}
            onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))} />
          <Input label="Email Address" icon={Mail} value={user?.email} disabled
            className="opacity-60 cursor-not-allowed" />
          <Input label="Phone Number" icon={Phone} placeholder="+91 98765 43210"
            value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Address" icon={MapPin} placeholder="123 Main St, City"
            value={profile.address} onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))} />
          <Button type="submit" loading={savingProfile} icon={Save}>Save Changes</Button>
        </form>
      </div>

      {/* Password form */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-5">Change Password</h3>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <Input label="Current Password" type="password" icon={Lock}
            value={password.currentPassword}
            onChange={(e) => setPassword(p => ({ ...p, currentPassword: e.target.value }))}
            error={pwErrors.currentPassword} />
          <Input label="New Password" type="password" icon={Lock}
            value={password.newPassword}
            onChange={(e) => setPassword(p => ({ ...p, newPassword: e.target.value }))}
            error={pwErrors.newPassword} />
          <Input label="Confirm New Password" type="password" icon={Lock}
            value={password.confirmPassword}
            onChange={(e) => setPassword(p => ({ ...p, confirmPassword: e.target.value }))}
            error={pwErrors.confirmPassword} />
          <Button type="submit" loading={savingPassword} icon={Lock}>Update Password</Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
