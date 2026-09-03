import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DashboardCard = ({
  title,
  value,
  unit = '',
  subtitle,
  icon: Icon,
  trend,
  trendType = 'positive', // 'positive' | 'negative'
  accentColor = 'emerald', // 'emerald' | 'blue' | 'cyan' | 'purple' | 'amber' | 'rose'
  badgeText,
  badgeType = 'green', // 'green' | 'blue' | 'cyan' | 'rose'
  metaText,
}) => {
  // Pastel icon container styles matching reference screenshot
  const getIconStyles = () => {
    switch (accentColor) {
      case 'blue':
        return { bg: '#EFF6FF', color: '#1D4ED8' };
      case 'cyan':
        return { bg: '#ECFEFF', color: '#0891B2' };
      case 'purple':
        return { bg: '#FAF5FF', color: '#7C3AED' };
      case 'amber':
        return { bg: '#FFFBEB', color: '#D97706' };
      case 'rose':
        return { bg: '#FEF2F2', color: '#DC2626' };
      case 'emerald':
      default:
        return { bg: '#EBF7EE', color: '#0D7F54' };
    }
  };

  const iconStyle = getIconStyles();

  // Parse value and unit if provided combined (e.g. "3,850 kg" or "$14,820" or "38.4 %")
  let displayValue = value;
  let displayUnit = unit;

  if (typeof value === 'string' && !unit) {
    const parts = value.trim().split(' ');
    if (parts.length > 1) {
      displayValue = parts[0];
      displayUnit = parts.slice(1).join(' ');
    }
  }

  return (
    <div className="kpi-card">
      {/* Top Row: Uppercase Title & Pastel Icon Pill */}
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {Icon && (
          <div
            className="kpi-icon-pill"
            style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      {/* Metric Figure with Unit */}
      <div className="kpi-value-row">
        <span className="kpi-value">{displayValue}</span>
        {displayUnit && <span className="kpi-unit">{displayUnit}</span>}
      </div>

      {/* Footer: Trend Pill / Status Badge + Comparison Meta Text */}
      <div className="kpi-footer">
        {badgeText ? (
          <span className={`kpi-badge kpi-badge-${badgeType}`}>
            {badgeText}
          </span>
        ) : trend ? (
          <span className={`kpi-badge ${trendType === 'positive' ? 'kpi-badge-green' : 'kpi-badge-rose'}`}>
            {trendType === 'positive' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {trend}
          </span>
        ) : null}

        {metaText && <span className="kpi-meta-text">{metaText}</span>}
        {!metaText && subtitle && <span className="kpi-meta-text">{subtitle}</span>}
      </div>
    </div>
  );
};

export default DashboardCard;
