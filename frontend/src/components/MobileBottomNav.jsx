import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, BrainCircuit, Package, Menu } from 'lucide-react';
import { useNav } from '../context/NavContext';

const MobileBottomNav = () => {
  const { toggleMobileNav, isMobileNavOpen } = useNav();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/food-records', label: 'Food Log', icon: UtensilsCrossed },
    { to: '/predictions', label: 'Forecast', icon: BrainCircuit },
    { to: '/inventory', label: 'Inventory', icon: Package },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <div className="nav-icon-wrapper">
                  <Icon size={20} color={isActive ? 'var(--accent-primary)' : '#94A3B8'} />
                  {isActive && <span className="active-dot" />}
                </div>
                <span className="nav-label">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}

      {/* Menu / Drawer Toggle */}
      <button
        type="button"
        onClick={toggleMobileNav}
        className={`mobile-nav-item ${isMobileNavOpen ? 'active' : ''}`}
        aria-label="Toggle full menu drawer"
      >
        <div className="nav-icon-wrapper">
          <Menu size={20} color={isMobileNavOpen ? 'var(--accent-secondary)' : '#94A3B8'} />
        </div>
        <span className="nav-label">Menu</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
