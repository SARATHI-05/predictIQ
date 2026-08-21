import React, { useState, useEffect } from 'react';
import { 
  Bell, Check, CheckCheck, Trash2, AlertTriangle, Cpu, UploadCloud, 
  TrendingUp, RefreshCw, Filter, ShieldAlert, Sparkles, Archive, BellOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { formatIST } from '../utils/timeUtils';


const TABS = [
  { key: 'unread', label: 'Active Unread' },
  { key: 'all', label: 'All Notifications' },
  { key: 'SURPLUS', label: 'Surplus Risk' },
  { key: 'SHORTAGE', label: 'Shortages' },
  { key: 'ML_TRAINING', label: 'ML Calibration' },
  { key: 'HIGH_DEMAND', label: 'High Demand' },
  { key: 'UPLOAD', label: 'Data Ingestion' },
  { key: 'SYSTEM', label: 'System' },
  { key: 'read', label: 'Archived / Read' }
];

const NotificationCenter = () => {
  const { token } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('unread');
  const [exitingIds, setExitingIds] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const filterParam = selectedType.toLowerCase();
      const [res, countRes] = await Promise.all([
        api.get(`/api/notifications?filter_type=${filterParam}`),
        api.get('/api/notifications/unread-count')
      ]);
      setNotifications(res.data);
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [selectedType]);

  const handleMarkRead = async (id) => {
    // 1. Immediately trigger smooth disappearing animation
    setExitingIds((prev) => new Set([...prev, id]));

    try {
      await api.put(`/api/notifications/${id}/read`);
      
      // 2. Remove from active list after exit animation completes
      setTimeout(() => {
        setNotifications((prev) => {
          if (selectedType === 'read') {
            return prev.map(n => n.id === id ? { ...n, is_read: true } : n);
          }
          return prev.filter((n) => n.id !== id);
        });
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }, 280);

      // Notify Navbar and other listeners
      window.dispatchEvent(new CustomEvent('predictiq-notification-update'));
      toast.success('Notification marked as read');
    } catch (err) {
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0 && selectedType !== 'read') {
      toast.info('No unread notifications to mark');
      return;
    }

    setExitingIds(new Set(unreadIds));

    try {
      await api.put('/api/notifications/read-all');
      
      setTimeout(() => {
        if (selectedType === 'unread' || selectedType !== 'read' && selectedType !== 'all') {
          setNotifications((prev) => prev.filter((n) => n.is_read));
        } else {
          setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));
        }
        setExitingIds(new Set());
        setUnreadCount(0);
      }, 280);

      window.dispatchEvent(new CustomEvent('predictiq-notification-update'));
      toast.success('All notifications marked as read');
    } catch (err) {
      setExitingIds(new Set());
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    setExitingIds((prev) => new Set([...prev, id]));

    try {
      await api.delete(`/api/notifications/${id}`);
      
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 280);

      window.dispatchEvent(new CustomEvent('predictiq-notification-update'));
      toast.success('Notification deleted');
    } catch (err) {
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SURPLUS':
        return <Sparkles size={18} color="#10B981" />;
      case 'SHORTAGE':
        return <AlertTriangle size={18} color="#F43F5E" />;
      case 'ML_TRAINING':
        return <Cpu size={18} color="#38BDF8" />;
      case 'HIGH_DEMAND':
        return <TrendingUp size={18} color="#F59E0B" />;
      case 'UPLOAD':
        return <UploadCloud size={18} color="#8B5CF6" />;
      default:
        return <Bell size={18} color="#38BDF8" />;
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', color: 'var(--accent-secondary)' }}>
              <Bell size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Notification & Alert Center</h1>
                {unreadCount > 0 && (
                  <span className="badge badge-rose" style={{ fontSize: '0.75rem' }}>
                    {unreadCount} Active
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>
                Real-time operational alerts for food surplus risks, ingredient shortages, peak forecasts, and ML calibration.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={fetchNotifications}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleMarkAllRead}>
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(tab.key)}
            className={`btn ${selectedType === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '12.5px', whiteSpace: 'nowrap', borderRadius: '8px' }}
          >
            {tab.label}
            {tab.key === 'unread' && unreadCount > 0 && (
              <span style={{
                marginLeft: '6px',
                background: selectedType === 'unread' ? '#FFF' : '#F43F5E',
                color: selectedType === 'unread' ? '#0F172A' : '#FFF',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <CheckCheck size={40} color="var(--accent-primary)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>All caught up!</div>
            <div style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
              {selectedType === 'unread' 
                ? 'You have read and resolved all active notifications.' 
                : 'No notifications found matching the selected filter.'}
            </div>
            {selectedType === 'unread' && (
              <button 
                onClick={() => setSelectedType('all')} 
                className="btn btn-secondary" 
                style={{ margin: '1rem auto 0', fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
              >
                <Archive size={14} /> View All Past Notifications
              </button>
            )}
          </div>
        ) : (
          notifications.map((n) => {
            const isExiting = exitingIds.has(n.id);
            return (
              <div
                key={n.id}
                className={`card ${isExiting ? 'animate-fade-out' : ''}`}
                style={{
                  background: n.is_read ? 'var(--bg-card)' : 'rgba(30, 41, 59, 0.95)',
                  border: `1px solid ${!n.is_read ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: !n.is_read ? '0 0 15px -3px rgba(56, 189, 248, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                      flexShrink: 0
                    }}
                  >
                    {getNotificationIcon(n.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      <span
                        className={`badge ${
                          n.severity === 'High' ? 'badge-danger' : n.severity === 'Medium' ? 'badge-warning' : 'badge-primary'
                        }`}
                        style={{ fontSize: '10.5px' }}
                      >
                        {n.severity} Priority
                      </span>
                      {!n.is_read ? (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-secondary)',
                            boxShadow: '0 0 8px var(--accent-secondary)'
                          }}
                          title="Unread"
                        />
                      ) : (
                        <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          <Check size={10} style={{ marginRight: '2px' }} /> Resolved
                        </span>
                      )}
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '6px', lineHeight: 1.45 }}>
                      {n.message}
                    </p>

                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      {formatIST(n.created_at)}
                    </div>

                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  {!n.is_read && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleMarkRead(n.id)}
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '12px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        color: '#10B981',
                        fontWeight: 600
                      }}
                      title="Mark as read (Disappears from active list)"
                    >
                      <Check size={14} /> Read
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDelete(n.id)}
                    style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--accent-rose)' }}
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;

