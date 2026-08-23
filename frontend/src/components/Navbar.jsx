import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Bell, 
  LogOut, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Check,
  CheckCheck,
  Clock,
  X,
  Menu
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import SystemHealthBadge from './SystemHealthBadge';
import api from '../services/api';
import { useISTClock } from '../utils/timeUtils';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleMobileNav } = useNav();
  const location = useLocation();
  const navigate = useNavigate();
  const { time12, dateStr } = useISTClock();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // Derive title from pathname
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard': return 'Dashboard';
      case '/food-records': return 'Food Log Records';
      case '/dataset-upload': return 'Dataset Ingestion';
      case '/predictions': return 'Demand Forecasting';
      case '/resource-planning': return 'Resource Planning';
      case '/inventory': return 'Inventory & Stock';
      case '/wastage': return 'Wastage Analysis';
      case '/analytics': return 'Demand Analytics';
      case '/model-performance': return 'ML Performance';
      case '/prediction-accuracy': return 'Accuracy Tracking';
      case '/reports': return 'Audit Reports';
      case '/notifications': return 'Notification Center';
      case '/alerts': return 'Surplus Alerts';
      case '/audit-logs': return 'Security Audit Trail';
      case '/user-management': return 'User Management';
      case '/settings': return 'System Settings';
      default: return 'PredictIQ System';
    }
  };

  const fetchNotificationStats = async () => {
    try {
      const [unreadRes, notifRes] = await Promise.all([
        api.get('/api/notifications/unread-count'),
        api.get('/api/notifications?filter_type=unread&limit=4')
      ]);
      setUnreadCount(unreadRes.data.unread_count || 0);
      setRecentNotifications(notifRes.data || []);
    } catch {
      // Silent catch for background polling
    }
  };

  useEffect(() => {
    fetchNotificationStats();
    
    const handleUpdate = () => fetchNotificationStats();
    window.addEventListener('predictiq-notification-update', handleUpdate);
    
    const interval = setInterval(fetchNotificationStats, 15000);
    return () => {
      window.removeEventListener('predictiq-notification-update', handleUpdate);
      clearInterval(interval);
    };
  }, [location.pathname]);

  const handleQuickMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await api.put(`/api/notifications/${id}/read`);
      window.dispatchEvent(new CustomEvent('predictiq-notification-update'));
    } catch {
      fetchNotificationStats();
    }
  };

  const handleQuickMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      setRecentNotifications([]);
      setUnreadCount(0);
      await api.put('/api/notifications/read-all');
      window.dispatchEvent(new CustomEvent('predictiq-notification-update'));
    } catch {
      fetchNotificationStats();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-navbar">
      {/* Left Section: Mobile Hamburger Toggle + Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={toggleMobileNav}
          className="navbar-hamburger-btn"
          aria-label="Open sidebar navigation"
        >
          <Menu size={22} color="var(--text-primary)" />
        </button>

        {/* Page Title & Status */}
        <div style={{ minWidth: 0 }}>
          <h2 className="navbar-page-title">
            {getPageTitle(location.pathname)}
          </h2>
          <div className="navbar-breadcrumb">
            PredictIQ &bull; <span style={{ color: 'var(--accent-primary)' }}>Live Operational</span>
          </div>
        </div>
      </div>

      {/* Right Section: System Indicators & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* IST Clock Badge (Visible on desktop & wide tablets) */}
        {!(location.pathname === '/dashboard' || location.pathname === '/predictions' || location.pathname === '/alerts') && (
          <div className="navbar-clock-badge" title="India Standard Time (IST)">
            <Clock size={13} color="#34D399" />
            <span>{time12}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ color: 'var(--text-secondary)' }}>{dateStr}</span>
          </div>
        )}

        {/* Real-Time System Health Indicator */}
        <SystemHealthBadge />

        {/* Notifications Bell with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="navbar-icon-btn"
            aria-label="Notification bell"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="navbar-notif-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {showNotificationMenu && (
            <div className="navbar-dropdown glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Notifications</span>
                  {unreadCount > 0 && <span className="badge badge-rose">{unreadCount}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleQuickMarkAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-secondary)',
                        fontSize: '0.725rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0
                      }}
                    >
                      <CheckCheck size={13} /> Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotificationMenu(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      color: 'var(--text-muted)',
                      borderRadius: '6px',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {recentNotifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: '260px', overflowY: 'auto' }}>
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '0.65rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38BDF8', fontSize: '0.725rem', fontWeight: 600 }}>
                          <AlertTriangle size={12} color={notif.severity === 'High' ? '#F43F5E' : '#F59E0B'} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.title}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                          {notif.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleQuickMarkRead(notif.id, e)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 6px', fontSize: '10px', flexShrink: 0, color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                        title="Mark read"
                      >
                        <Check size={11} /> Read
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                  <CheckCircle2 size={22} color="var(--accent-primary)" style={{ margin: '0 auto 4px' }} />
                  <div>No new alerts</div>
                </div>
              )}

              <Link
                to="/notifications"
                onClick={() => setShowNotificationMenu(false)}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.775rem', padding: '0.45rem', justifyContent: 'center' }}
              >
                <span>View Notification Center</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* User Card (Desktop Full, Mobile Avatar Only) */}
        {user && (
          <div className="navbar-user-chip">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'User'}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="navbar-user-details">
              <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                {user.name || user.email || 'PredictIQ User'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {user.role || 'Staff'}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary navbar-logout-btn"
          title="Sign Out"
        >
          <LogOut size={15} />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
