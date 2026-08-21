import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertCircle, Database, Cpu, Server } from 'lucide-react';
import axios from 'axios';
import { formatISTTime } from '../utils/timeUtils';


const SystemHealthBadge = () => {
  const [health, setHealth] = useState({
    status: 'healthy',
    backend: 'online',
    database: 'connected',
    ml_model: 'available'
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastCheck, setLastCheck] = useState(new Date());

  const checkHealth = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/health');
      setHealth(res.data);
      setLastCheck(new Date());
    } catch {
      setHealth({
        status: 'degraded',
        backend: 'offline',
        database: 'disconnected',
        ml_model: 'unavailable'
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health.backend === 'online' && health.database === 'connected';

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          borderRadius: '999px',
          padding: '5px 12px',
          color: isHealthy ? 'var(--accent-primary)' : 'var(--accent-rose)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        title="PredictIQ System Health"
        aria-label="System health indicator"
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isHealthy ? '#10B981' : '#F43F5E',
            boxShadow: isHealthy ? '0 0 8px #10B981' : '0 0 8px #F43F5E',
            animation: 'pulse 2s infinite'
          }}
        />
        <span>{isHealthy ? 'System Operational' : 'Degraded'}</span>
      </button>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '280px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: 'var(--shadow-subtle)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              System Health Status
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {formatISTTime(lastCheck)}
            </span>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)' }}>
                <Server size={15} color="var(--accent-secondary)" /> FastAPI Backend
              </span>
              <span style={{ color: health.backend === 'online' ? '#10B981' : '#F43F5E', fontWeight: 600 }}>
                {health.backend}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)' }}>
                <Database size={15} color="var(--accent-amber)" /> Database (MySQL/SQLite)
              </span>
              <span style={{ color: health.database === 'connected' ? '#10B981' : '#F43F5E', fontWeight: 600 }}>
                {health.database}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)' }}>
                <Cpu size={15} color="var(--accent-primary)" /> ML Model Pipeline
              </span>
              <span style={{ color: health.ml_model === 'available' ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
                {health.ml_model}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthBadge;
