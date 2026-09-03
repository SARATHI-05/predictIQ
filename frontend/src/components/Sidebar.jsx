import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Radio,
  UtensilsCrossed, 
  TrendingUp,
  Trash2, 
  Boxes,
  Bell, 
  FileSpreadsheet, 
  Settings,
  Target,
  Cpu,
  Users,
  Shield,
  UploadCloud,
  Package,
  Layers,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import api from '../services/api';

const Sidebar = () => {
  const { user } = useAuth();
  const { isMobileNavOpen, closeMobileNav } = useNav();
  const isAdmin = user?.role === 'Admin';
  const [alertCount, setAlertCount] = useState(4);
  const [showAdminSubmenu, setShowAdminSubmenu] = useState(true);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/api/notifications/unread-count');
        if (typeof res.data?.unread_count === 'number') {
          setAlertCount(res.data.unread_count);
        }
      } catch {
        // Keep fallback 4 from screenshot
      }
    };
    fetchUnreadCount();

    const handleUpdate = () => fetchUnreadCount();
    window.addEventListener('predictiq-notification-update', handleUpdate);
    return () => window.removeEventListener('predictiq-notification-update', handleUpdate);
  }, []);

  // Primary Operations Navigation matching reference screenshot
  const operationsNav = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/predictions', label: 'AI Demand Prediction', icon: Radio },
    { to: '/food-records', label: 'Food Records', icon: UtensilsCrossed },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/wastage', label: 'Wastage Management', icon: Trash2 },
    { to: '/resource-planning', label: 'Resource Management', icon: Boxes },
  ];

  // Administration Navigation matching reference screenshot
  const adminNav = [
    { to: '/alerts', label: 'Alerts & Notifications', icon: Bell, badge: alertCount },
    { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  // Advanced / System Tools (Preserved for full admin management)
  const advancedSystemNav = [
    { to: '/inventory', label: 'Inventory & Stock', icon: Package },
    { to: '/dataset-upload', label: 'Dataset Ingestion', icon: UploadCloud },
    { to: '/prediction-accuracy', label: 'Accuracy Tracking', icon: Target },
    { to: '/model-performance', label: 'ML Performance', icon: Cpu },
    { to: '/user-management', label: 'User Management', icon: Users },
    { to: '/audit-logs', label: 'Security Audit Logs', icon: Shield },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-backdrop ${isMobileNavOpen ? 'visible' : ''}`}
        onClick={closeMobileNav}
        aria-hidden="true"
      />

      {/* Main Sidebar Drawer */}
      <aside className={`app-sidebar ${isMobileNavOpen ? 'open' : ''}`}>
        {/* Brand Header with Exact Screenshot Logo & Toggle */}
        <div className="sidebar-brand-header">
          <NavLink to="/dashboard" className="sidebar-brand-logo" onClick={closeMobileNav}>
            <div className="brand-icon-box">
              {/* Custom squiggly waveform IQ icon matching reference */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h3l3-7 4 14 3-7h5" />
              </svg>
            </div>
            <span className="brand-title-text">PredictIQ</span>
          </NavLink>

          {/* Desktop Toggle Visual & Mobile Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="sidebar-collapse-btn"
              title="Toggle sidebar"
              aria-label="Toggle navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="14" y2="12" />
                <line x1="4" y1="18" x2="18" y2="18" />
              </svg>
            </button>

            <button
              type="button"
              onClick={closeMobileNav}
              className="sidebar-close-btn"
              aria-label="Close navigation drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Scroll Area */}
        <nav className="sidebar-nav-scroll">
          {/* Section 1: OPERATIONS HUB */}
          <div>
            <div className="sidebar-nav-heading">
              OPERATIONS HUB
            </div>
            <div className="sidebar-nav-group">
              {operationsNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileNav}
                    className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    {({ isActive }) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Icon size={18} color={isActive ? '#FFFFFF' : '#6B7280'} />
                        <span>{item.label}</span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Section 2: ADMINISTRATION */}
          <div>
            <div className="sidebar-nav-heading">
              ADMINISTRATION
            </div>
            <div className="sidebar-nav-group">
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileNav}
                    className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    {({ isActive }) => (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Icon size={18} color={isActive ? '#FFFFFF' : '#6B7280'} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span style={{
                            background: isActive ? '#FFFFFF' : '#FEE2E2',
                            color: isActive ? '#0D7F54' : '#EF4444',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '9999px',
                            minWidth: '18px',
                            textAlign: 'center'
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}

              {/* Advanced System Management for Admins */}
              {isAdmin && (
                <div style={{ marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdminSubmenu(!showAdminSubmenu)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      background: 'none',
                      border: 'none',
                      color: '#9CA3AF',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <span>System Tools</span>
                    {showAdminSubmenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {showAdminSubmenu && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.2rem', paddingLeft: '0.35rem' }}>
                      {advancedSystemNav.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={closeMobileNav}
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            style={{ fontSize: '0.8rem', padding: '0.5rem 0.65rem' }}
                          >
                            {({ isActive }) => (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <Icon size={16} color={isActive ? '#FFFFFF' : '#6B7280'} />
                                <span>{item.label}</span>
                              </div>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Bottom System Status Card matching reference screenshot */}
        <div className="sidebar-status-card">
          <div>
            <div className="sidebar-status-label">System Status</div>
            <div className="sidebar-status-value">Precision Engine 4.2</div>
          </div>
          <div className="status-dot-pulse" title="System Status: Optimal Demand Engine Operational" />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
