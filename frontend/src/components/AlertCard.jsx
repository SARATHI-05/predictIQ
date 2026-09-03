import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, Check, HeartHandshake, RotateCcw, Trash2 } from 'lucide-react';

const AlertCard = ({ alert, onMarkRead, onMarkUnread, onDelete, onRouteDonation }) => {
  const getSeverityBadge = () => {
    switch (alert.severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return <span className="badge badge-rose">High Severity</span>;
      case 'medium':
        return <span className="badge badge-amber">Medium Risk</span>;
      case 'low':
      default:
        return <span className="badge badge-cyan">Info / Low</span>;
    }
  };

  const getIcon = () => {
    const typeStr = alert.alert_type?.toLowerCase() || '';
    if (typeStr.includes('surplus')) {
      return <AlertTriangle size={18} color="#EF4444" />;
    } else if (typeStr.includes('shortage')) {
      return <ShieldAlert size={18} color="#D97706" />;
    } else {
      return <Info size={18} color="#0284C7" />;
    }
  };

  const isSurplus = alert.alert_type?.toLowerCase().includes('surplus');

  return (
    <div className="card" style={{
      padding: '1.1rem 1.25rem',
      borderLeft: isSurplus ? '4px solid #EF4444' : (alert.severity === 'High' ? '4px solid #EF4444' : '4px solid #0284C7'),
      opacity: alert.is_read ? 0.75 : 1,
      background: alert.is_read ? '#FAFAFA' : '#FFFFFF',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: isSurplus ? '#FEF2F2' : '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {getIcon()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#111827' }}>
                {alert.alert_type} Alert
              </span>
              {getSeverityBadge()}
              {alert.is_read ? (
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                  <Check size={10} /> Resolved
                </span>
              ) : (
                <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Active</span>
              )}
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#4B5563', lineHeight: 1.4, margin: 0 }}>
              {alert.message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0, flexWrap: 'wrap' }}>
          {isSurplus && onRouteDonation && (
            <button
              onClick={() => onRouteDonation(alert)}
              className="btn btn-primary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                minHeight: '32px'
              }}
              title="Dispatch food donation to partner NGO"
            >
              <HeartHandshake size={13} />
              <span>Route Donation</span>
            </button>
          )}

          {!alert.is_read && onMarkRead && (
            <button
              onClick={() => onMarkRead(alert.id)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', minHeight: '32px' }}
              title="Acknowledge & Mark Resolved"
            >
              <CheckCircle2 size={13} color="#0D7F54" />
              <span>Acknowledge</span>
            </button>
          )}

          {alert.is_read && onMarkUnread && (
            <button
              onClick={() => onMarkUnread(alert.id)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#6B7280', minHeight: '32px' }}
              title="Re-open alert"
            >
              <RotateCcw size={12} />
              <span>Re-open</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(alert.id)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#DC2626', minHeight: '32px' }}
              title="Dismiss and delete alert"
            >
              <Trash2 size={12} />
              <span>Dismiss</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
