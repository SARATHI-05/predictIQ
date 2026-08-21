import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  UploadCloud, 
  BrainCircuit, 
  Boxes, 
  Package,
  Trash2, 
  BarChart3, 
  Cpu,
  Target,
  FileSpreadsheet, 
  Bell,
  BellRing, 
  Shield,
  Users,
  Settings, 
  Sparkles,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const operationalNav = [
    { to: '/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { to: '/food-records', label: 'Food Log Records', icon: UtensilsCrossed },
    { to: '/dataset-upload', label: 'Dataset Ingestion', icon: UploadCloud },
    { to: '/inventory', label: 'Inventory & Stock', icon: Package },
    { to: '/alerts', label: 'Surplus Alerts', icon: BellRing },
  ];

  const intelligenceNav = [
    { to: '/predictions', label: 'AI Demand Forecast', icon: BrainCircuit },
    { to: '/resource-planning', label: 'Resource Planning', icon: Boxes },
    { to: '/wastage', label: 'Wastage Analysis', icon: Trash2 },
    { to: '/analytics', label: 'Operational Analytics', icon: BarChart3 },
  ];

  const managementNav = [
    { to: '/reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { to: '/notifications', label: 'Notification Center', icon: Bell },
  ];

  const adminNav = [
    { to: '/prediction-accuracy', label: 'Accuracy Tracking', icon: Target },
    { to: '/model-performance', label: 'ML Model Metrics', icon: Cpu },
    { to: '/settings', label: 'Settings & Operations', icon: Settings },
    { to: '/user-management', label: 'User Management', icon: Users },
    { to: '/audit-logs', label: 'Audit Security Log', icon: Shield },
  ];

  const renderNavSection = (title, items) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        fontSize: '0.68rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 700,
        color: 'var(--text-muted)',
        padding: '0.4rem 0.85rem 0.35rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.55rem',
                fontSize: '0.84rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={17} color={isActive ? 'var(--accent-primary)' : '#94A3B8'} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            transition: 'opacity 0.25s ease'
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      {/* Sidebar Container (Responsive Drawer on Mobile) */}
      <aside className={`sidebar-responsive ${isOpen ? 'mobile-open' : ''}`} style={{
        width: '265px',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0
      }}>
        <style>{`
          @media (max-width: 768px) {
            .sidebar-responsive {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              bottom: 0 !important;
              height: 100vh !important;
              transform: translateX(-100%);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 10px 0 30px rgba(0, 0, 0, 0.6);
            }
            .sidebar-responsive.mobile-open {
              transform: translateX(0) !important;
            }
          }
        `}</style>

        {/* Brand Header */}
        <div style={{
          padding: '1.15rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0B1120'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #0284C7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <Sparkles size={20} color="#FFFFFF" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
                Predict<span style={{ color: 'var(--accent-primary)' }}>IQ</span>
              </h1>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                AI Food Planning System
              </div>
            </div>
          </div>

          {/* Close Cross Button for Mobile View */}
          <button
            onClick={onClose}
            className="mobile-close-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
          <style>{`
            @media (max-width: 768px) {
              .mobile-close-btn { display: flex !important; }
            }
          `}</style>
        </div>

        {/* Navigation Groups */}
        <nav style={{
          flex: 1,
          padding: '0.85rem 0.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {renderNavSection('Operations', operationalNav)}
          {renderNavSection('AI & Intelligence', intelligenceNav)}
          {renderNavSection('Reports & Center', managementNav)}
          {isAdmin && renderNavSection('Administration & ML Control', adminNav)}
        </nav>

        {/* User Role Card */}
        <div style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border-color)',
          background: '#0B1120'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: user?.role === 'Admin' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${user?.role === 'Admin' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: user?.role === 'Admin' ? '#38BDF8' : '#34D399',
              fontWeight: 700,
              fontSize: '0.875rem'
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                {user?.role === 'Admin' ? (
                  <ShieldCheck size={13} color="#38BDF8" />
                ) : (
                  <UserCheck size={13} color="#34D399" />
                )}
                <span className={`badge ${user?.role === 'Admin' ? 'badge-cyan' : 'badge-emerald'}`} style={{ padding: '0.1rem 0.45rem', fontSize: '0.65rem' }}>
                  {user?.role || 'Staff'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
