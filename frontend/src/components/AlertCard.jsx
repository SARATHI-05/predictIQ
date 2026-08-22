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
      return <AlertTriangle size={20} color="#FB7185" />;
    } else if (typeStr.includes('shortage')) {
      return <ShieldAlert size={20} color="#FBBF24" />;
    } else {
      return <Info size={20} color="#22D3EE" />;
    }
  };

  const isSurplus = alert.alert_type?.toLowerCase().includes('surplus');

  return (
    <div className="glass-card" style={{
      padding: '1.25rem',
      borderLeft: isSurplus ? '4px solid #F43F5E' : (alert.severity === 'High' ? '4px solid #F43F5E' : '4px solid #06B6D4'),
      opacity: alert.is_read ? 0.75 : 1,
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: isSurplus ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {getIcon()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {alert.alert_type} Alert
              </span>
              {getSeverityBadge()}
              {alert.is_read ? (
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Check size={10} /> Resolved
                </span>
              ) : (
                <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>Active</span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
              {alert.message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
          {isSurplus && onRouteDonation && (
            <button
              onClick={() => onRouteDonation(alert)}
              className="btn btn-primary"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
              }}
              title="Dispatch food donation to partner NGO"
            >
              <HeartHandshake size={14} />
              <span>Route Donation</span>
            </button>
          )}

          {!alert.is_read && onMarkRead && (
            <button
              onClick={() => onMarkRead(alert.id)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem' }}
              title="Acknowledge & Mark Resolved"
            >
              <CheckCircle2 size={14} color="#10B981" />
              <span>Acknowledge</span>
            </button>
          )}

          {alert.is_read && onMarkUnread && (
            <button
              onClick={() => onMarkUnread(alert.id)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
              title="Re-open alert"
            >
              <RotateCcw size={13} />
              <span>Re-open</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(alert.id)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: '#FDA4AF' }}
              title="Dismiss and delete alert"
            >
              <Trash2 size={13} />
              <span>Dismiss</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
