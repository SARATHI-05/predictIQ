import React from 'react';

const ChartCard = ({ title, subtitle, children, headerAction }) => {
  return (
    <div className="card" style={{ padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem',
        paddingBottom: '0.65rem',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem', lineHeight: 1.4 }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
      </div>
      <div style={{ flex: 1, minHeight: '280px', width: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
