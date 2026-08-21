import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DashboardCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'positive', // 'positive' or 'negative'
  accentColor = 'emerald', // 'emerald', 'cyan', 'amber', 'rose', 'purple'
}) => {
  const getAccentStyles = () => {
    switch (accentColor) {
      case 'cyan':
        return {
          bg: 'rgba(6, 182, 212, 0.12)',
          border: 'rgba(6, 182, 212, 0.25)',
          color: '#22D3EE',
        };
      case 'amber':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.25)',
          color: '#FBBF24',
        };
      case 'rose':
        return {
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.25)',
          color: '#FB7185',
        };
      case 'purple':
        return {
          bg: 'rgba(139, 92, 246, 0.12)',
          border: 'rgba(139, 92, 246, 0.25)',
          color: '#A78BFA',
        };
      case 'emerald':
      default:
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.25)',
          color: '#34D399',
        };
    }
  };

  const accent = getAccentStyles();

  return (
    <div className="glass-card glass-card-interactive" style={{ padding: '1.25rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', width: '100%', minWidth: 0 }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1, minWidth: 0, overflowWrap: 'break-word' }}>
          {title}
        </div>
        {Icon && (
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: accent.bg,
            border: `1px solid ${accent.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent.color,
            flexShrink: 0
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', minWidth: 0, wordBreak: 'break-word' }}>
          {value}
        </div>
        {trend && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: trendType === 'positive' ? '#34D399' : '#FB7185',
            flexShrink: 0
          }}>
            {trendType === 'positive' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{trend}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', overflowWrap: 'break-word' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default DashboardCard;
