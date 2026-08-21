import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Bell, 
  LogOut, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  User,
  ExternalLink,
  Check,
  CheckCheck,
  Clock,
  X,
  Menu
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import SystemHealthBadge from './SystemHealthBadge';
import api from '../services/api';
import { useISTClock } from '../utils/timeUtils';

const Navbar = ({ onToggleMobileMenu = () => {} }) => {

  const { user, logout, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { time12, dateStr } = useISTClock();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);


  // Derive title from pathname
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard': return 'Dashboard Overview';
      case '/food-records': return 'Food Consumption Records';
      case '/dataset-upload': return 'Dataset Quality & Ingestion';
      case '/predictions': return 'ML Food Demand Forecasting';
      case '/resource-planning': return 'Ingredient Resource Planning';
      case '/inventory': return 'Live Inventory & Procurement';
      case '/wastage': return 'Food Wastage Analysis';
      case '/analytics': return 'AI Demand Analytics & Insights';
      case '/model-performance': return 'ML Model Performance & Benchmarks';
      case '/prediction-accuracy': return 'Prediction Accuracy Tracking';
      case '/reports': return 'Reports & Data Export';
      case '/notifications': return 'Notification Center';
      case '/alerts': return 'Surplus & Shortage Alert Center';
      case '/audit-logs': return 'System Audit Trail & Compliance';
      case '/user-management': return 'User Management & Access Control';
      case '/settings': return 'System Settings & ML Operations';
      default: return 'PredictIQ Enterprise System';
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
    } catch (err) {
      // Silent catch for background polling
    }
  };

  useEffect(() => {
    fetchNotificationStats();
    
    // Listen for instant updates from NotificationCenter or other components
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
      // Optimistically remove from dropdown immediately
      setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      await api.put(`/api/notifications/${id}/read`);
      window.dispatchEvent(new CustomEvent('predictiq-notification-update'));
    } catch (err) {
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
    } catch (err) {
      fetchNotificationStats();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      height: '70px',
      background: 'rgba(11, 15, 23, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Mobile Hamburger & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="mobile-hamburger-btn"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
        <style>{`
          @media (max-width: 768px) {
            .mobile-hamburger-btn { display: flex !important; }
          }
        `}</style>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {getPageTitle(location.pathname)}
          </h2>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
            PredictIQ System &bull; <span style={{ color: 'var(--accent-primary)' }}>Live Operational</span>
          </div>
        </div>
      </div>


      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Live IST 12-Hour Clock Badge (Hidden on Dashboard, ML Predictions, and Alerts pages) */}
        {!(location.pathname === '/dashboard' || location.pathname === '/predictions' || location.pathname === '/alerts') && (

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.65rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#34D399',
            fontFamily: 'monospace',
            letterSpacing: '0.02em',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }} title="India Standard Time (IST, 12-Hour Format)">
            <Clock size={14} color="#34D399" />
            <span>{time12}</span>
            <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>|</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{dateStr}</span>
          </div>
        )}

        {/* Real-Time System Health Indicator */}
        <SystemHealthBadge />



        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative'
            }}
            aria-label="Notification bell"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#F43F5E',
                color: '#FFF',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(244, 63, 94, 0.5)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {showNotificationMenu && (
            <div className="glass-card" style={{
              position: 'absolute',
              top: '48px',
              right: 0,
              width: '360px',
              padding: '1rem',
              zIndex: 50,
              background: 'rgba(19, 27, 42, 0.98)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Active Notifications</span>
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
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0
                      }}
                    >
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                  {/* Close Cross Button */}
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
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title="Close Notification Menu"
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>


              {recentNotifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38BDF8', fontSize: '0.75rem', fontWeight: 600 }}>
                          <AlertTriangle size={13} color={notif.severity === 'High' ? '#F43F5E' : '#F59E0B'} />
                          <span>{notif.title}</span>
                        </div>
                        <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.35 }}>
                          {notif.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleQuickMarkRead(notif.id, e)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', flexShrink: 0, color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                        title="Mark as read (Disappear)"
                      >
                        <Check size={12} /> Read
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={24} color="var(--accent-primary)" style={{ margin: '0 auto 6px' }} />
                  <div>All caught up! No active notifications.</div>
                </div>
              )}

              <Link
                to="/notifications"
                onClick={() => setShowNotificationMenu(false)}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center', marginTop: '0.25rem' }}
              >
                <span>Open Notification Center</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* User Info & Logout Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.65rem'
            }}>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'User'}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.name || 'PredictIQ User'}
                </div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  {user.email || 'Google Account'}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: '#FDA4AF' }}
            title="Sign Out"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>

  );
};

export default Navbar;

