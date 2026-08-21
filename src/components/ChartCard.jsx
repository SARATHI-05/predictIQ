import React from 'react';

const ChartCard = ({ title, subtitle, children, headerAction }) => {
  return (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        flexWrap: 'wrap',
        minWidth: 0
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflowWrap: 'break-word' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.25rem', overflowWrap: 'break-word' }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
      </div>
      <div style={{ flex: 1, minHeight: '260px', width: '100%', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
