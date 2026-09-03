import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Moon, 
  Sun, 
  Bell, 
  ChevronDown, 
  LogOut, 
  Menu, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  X,
  User,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import api from '../services/api';

const DINING_LOCATIONS = [
  'Central Dining Commons',
  'Tech Bistro Hub',
  'North Campus Commons',
  'Science & Engineering Dining',
  'South Quad Refectory'
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleMobileNav } = useNav();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedLocation, setSelectedLocation] = useState('Central Dining Commons');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(4);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const locationRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const fetchNotificationStats = async () => {
    try {
      const [unreadRes, notifRes] = await Promise.all([
        api.get('/api/notifications/unread-count'),
        api.get('/api/notifications?filter_type=unread&limit=4')
      ]);
      setUnreadCount(typeof unreadRes.data?.unread_count === 'number' ? unreadRes.data.unread_count : 4);
      setRecentNotifications(notifRes.data || []);
    } catch {
      // Retain fallback from screenshot
    }
  };

  useEffect(() => {
    fetchNotificationStats();
    const handleUpdate = () => fetchNotificationStats();
    window.addEventListener('predictiq-notification-update', handleUpdate);
    const interval = setInterval(fetchNotificationStats, 20000);
    return () => {
      window.removeEventListener('predictiq-notification-update', handleUpdate);
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setShowLocationDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Derive user display name and title
  const displayName = (() => {
    if (user?.name && user.name !== 'PredictIQ User') return user.name;
    if (user?.email) {
      return user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return 'Dr. Elena Vance';
  })();

  const displayRole = user?.role === 'Admin' ? 'Campus Director' : (user?.role || 'Staff Supervisor');

  return (
    <header className="app-navbar">
      {/* Left Section: Mobile Menu Button + Dining Commons Selector + Search Bar */}
      <div className="navbar-left">
        <button
          type="button"
          onClick={toggleMobileNav}
          className="navbar-hamburger-btn"
          aria-label="Open sidebar"
        >
          <Menu size={20} color="#374151" />
        </button>

        {/* Location Dropdown Pill matching screenshot */}
        <div style={{ position: 'relative' }} ref={locationRef}>
          <button
            type="button"
            className="navbar-location-pill"
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
          >
            <Building2 size={16} color="#0D7F54" />
            <span>{selectedLocation}</span>
            <ChevronDown size={14} color="#6B7280" />
          </button>

          {showLocationDropdown && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '240px',
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 60,
              padding: '0.4rem'
            }}>
              <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Select Campus Location
              </div>
              {DINING_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setSelectedLocation(loc);
                    setShowLocationDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.65rem',
                    background: selectedLocation === loc ? '#EBF7EE' : 'transparent',
                    color: selectedLocation === loc ? '#0D7F54' : '#374151',
                    fontWeight: selectedLocation === loc ? 700 : 500,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{loc}</span>
                  {selectedLocation === loc && <Check size={14} color="#0D7F54" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input matching screenshot */}
        <div className="navbar-search-box">
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search meal plans, ingredients, alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right Section: AI Model Status + Theme Toggle + Notifications + User Profile */}
      <div className="navbar-right">
        {/* AI Model Badge matching screenshot */}
        <div className="navbar-model-badge">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0D7F54' }} />
          <span>AI Model: Optimal Demand</span>
        </div>

        {/* Dark/Light Mode Visual Toggle matching screenshot */}
        <button
          type="button"
          className="navbar-icon-btn"
          title="Toggle color scheme"
          aria-label="Toggle theme"
          onClick={() => setIsDarkMode(!isDarkMode)}
        >
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications Bell with Counter Dot matching screenshot */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="navbar-icon-btn"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="navbar-notif-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {showNotificationMenu && (
            <div className="navbar-dropdown">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>Notifications</span>
                  {unreadCount > 0 && <span className="badge badge-rose">{unreadCount}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleQuickMarkAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--brand-primary)',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <CheckCheck size={13} /> Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotificationMenu(false)}
                    style={{
                      background: '#F3F4F6',
                      border: 'none',
                      color: '#6B7280',
                      borderRadius: '6px',
                      padding: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {recentNotifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '0.65rem',
                        background: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#111827', fontSize: '0.75rem', fontWeight: 700 }}>
                          <AlertTriangle size={13} color={notif.severity === 'High' ? '#EF4444' : '#F59E0B'} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.title}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#4B5563', marginTop: '0.2rem', lineHeight: 1.3 }}>
                          {notif.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleQuickMarkRead(notif.id, e)}
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', fontSize: '10px', minHeight: 'auto', color: 'var(--brand-primary)', borderColor: '#A7F3D0' }}
                        title="Mark read"
                      >
                        <Check size={11} /> Read
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem' }}>
                  No unread notifications
                </div>
              )}

              <Link
                to="/alerts"
                onClick={() => setShowNotificationMenu(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '0.45rem',
                  background: '#F3F4F6',
                  borderRadius: '6px',
                  color: '#374151',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                View all notifications & alerts →
              </Link>
            </div>
          )}
        </div>

        {/* User Profile Card matching reference screenshot */}
        <div style={{ position: 'relative' }} ref={userRef}>
          <div
            className="navbar-user-card"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="navbar-user-avatar">
              {/* Initials or silhouette */}
              <span style={{ color: '#0D7F54', fontWeight: 800 }}>EV</span>
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{displayName}</span>
              <span className="navbar-user-role">{displayRole}</span>
            </div>
          </div>

          {/* User Profile Dropdown Menu */}
          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '210px',
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 60,
              padding: '0.4rem'
            }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.35rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>{displayName}</div>
                <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{user?.email || 'elena.vance@campus.edu'}</div>
              </div>

              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  color: '#374151',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  transition: 'background 0.1s'
                }}
              >
                <Settings size={15} color="#6B7280" />
                <span>Account Settings</span>
              </Link>

              {user?.role === 'Admin' && (
                <Link
                  to="/user-management"
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.75rem',
                    color: '#374151',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    borderRadius: '6px'
                  }}
                >
                  <ShieldCheck size={15} color="#0D7F54" />
                  <span>Admin Controls</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  color: '#EF4444',
                  fontSize: '0.8rem',
                  background: 'none',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginTop: '0.25rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
