import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { notificationsAPI } from '../../api';
import Button from '../../components/ui/Button';
import { NotificationSkeleton } from '../../components/skeletons/Skeletons';
import Pagination from '../../components/ui/Pagination';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const typeIcon = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };
const typeBg = { info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600', success: 'bg-green-100 dark:bg-green-900/30 text-green-600', warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600', error: 'bg-red-100 dark:bg-red-900/30 text-red-500' };

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = (p = 1) => {
    setLoading(true);
    notificationsAPI.getAll({ page: p, limit: 15 })
      .then((d) => {
        setNotifications(d.data.notifications);
        setUnreadCount(d.data.unreadCount);
        setTotalPages(d.meta?.totalPages || 1);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(page); }, [page]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(ns => ns.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(ns => ns.filter(n => n._id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {unreadCount > 0 ? unreadCount + ' unread notification(s)' : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" icon={CheckCheck} onClick={handleMarkAll}>Mark all read</Button>
        )}
      </div>

      <div className="card p-5">
        {loading ? <NotificationSkeleton count={6} /> : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = typeIcon[n.type] || Info;
              return (
                <div key={n._id}
                  className={'flex gap-3 p-3.5 rounded-xl transition-colors ' + (n.isRead ? 'bg-white dark:bg-transparent' : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30')}>
                  <div className={'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ' + (typeBg[n.type] || typeBg.info)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={'text-sm font-semibold ' + (n.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white')}>{n.title}</p>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                    {!n.isRead && (
                      <button onClick={() => handleMarkRead(n._id)}
                        className="text-xs text-primary-600 hover:underline mt-1 font-medium">
                        Mark as read
                      </button>
                    )}
                  </div>
                  <button onClick={() => handleDelete(n._id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
};

export default Notifications;
