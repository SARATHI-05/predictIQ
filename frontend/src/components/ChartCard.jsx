import React from 'react';

const ChartCard = ({ title, subtitle, children, headerAction }) => {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.25rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div style={{ flex: 1, minHeight: '280px', width: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
