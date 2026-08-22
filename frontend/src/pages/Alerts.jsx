import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  AlertTriangle, 
  CheckCircle2, 
  HeartHandshake, 
  Trash2, 
  Filter, 
  Plus, 
  Check,
  Send,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import AlertCard from '../components/AlertCard';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Alerts = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'surplus', 'shortage', 'resolved'
  const [loading, setLoading] = useState(true);

  // Donation Modal
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [donationPartner, setDonationPartner] = useState('City Harvest Food Bank');
  const [donationNotes, setDonationNotes] = useState('Freshly prepared food surplus. Insulated containers ready for immediate pickup.');
  const [donationSuccess, setDonationSuccess] = useState(false);

  // Manual Alert Creation Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    alert_type: 'Surplus',
    message: '',
    severity: 'Medium'
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/alerts');
      setAlerts(response.data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      toast.error('Failed to load alerts feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const notifyUpdate = () => {
    window.dispatchEvent(new CustomEvent('predictiq-notification-update'));
  };

  const handleMarkRead = async (id) => {
    try {
      setAlerts((prev) => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      await api.put(`/api/alerts/${id}/read`);
      toast.success('Alert marked as resolved');
      notifyUpdate();
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to update alert');
      fetchAlerts();
    }
  };

  const handleMarkUnread = async (id) => {
    try {
      await api.put(`/api/alerts/${id}/unread`);
      toast.info('Alert re-opened');
      notifyUpdate();
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  const handleDelete = async (id) => {
    // Optimistically remove from screen immediately
    setAlerts((prev) => prev.filter(a => a.id !== id));
    setDeleteConfirmId(null);
    notifyUpdate();

    try {
      await api.delete(`/api/alerts/${id}`);
      toast.success('Alert dismissed and removed');
    } catch (err) {
      console.error('Failed to delete alert:', err);
      toast.error('Failed to dismiss alert');
      fetchAlerts();
    }
  };


  const handleClearResolved = async () => {
    try {
      const res = await api.post('/api/alerts/clear-read');
      toast.success(res.data.message || 'Cleared resolved alerts');
      notifyUpdate();
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to clear resolved alerts');
    }
  };

  const handleOpenDonation = (alert) => {
    setSelectedAlert(alert);
    setDonationSuccess(false);
    setDonationNotes(`Freshly prepared surplus from ${alert.alert_type} alert. Insulated packaging ready for collection.`);
    setIsDonationModalOpen(true);
  };

  const handleDispatchDonation = async () => {
    setDonationSuccess(true);
    if (selectedAlert) {
      try {
        await api.post(`/api/alerts/${selectedAlert.id}/donate`, {
          partner_name: donationPartner,
          notes: donationNotes
        });
        notifyUpdate();
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`Donation pickup request dispatched to ${donationPartner}!`);
    setTimeout(() => {
      setIsDonationModalOpen(false);
      fetchAlerts();
    }, 1500);
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!createForm.message.trim()) {
      toast.error('Please enter an alert description');
      return;
    }

    try {
      setCreateSubmitting(true);
      await api.post('/api/alerts', createForm);
      toast.success('New operational alert published successfully!');
      setIsCreateModalOpen(false);
      setCreateForm({ alert_type: 'Surplus', message: '', severity: 'Medium' });
      notifyUpdate();
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to create alert');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'unread') return !a.is_read;
    if (filter === 'surplus') return a.alert_type?.toLowerCase().includes('surplus');
    if (filter === 'shortage') return a.alert_type?.toLowerCase().includes('shortage');
    if (filter === 'resolved') return a.is_read;
    return true;
  });

  const surplusCount = alerts.filter(a => a.alert_type?.toLowerCase().includes('surplus')).length;
  const shortageCount = alerts.filter(a => a.alert_type?.toLowerCase().includes('shortage')).length;
  const unreadCount = alerts.filter(a => !a.is_read).length;


  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Surplus & Operational Alert Center</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Real-time excess food surplus warnings, shortage thresholds, and direct NGO donation recovery dispatch.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button onClick={fetchAlerts} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            <RefreshCw size={14} className={loading ? 'pulse-indicator' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
            <Plus size={15} />
            <span>Create Alert</span>
          </button>
          {isAdmin && alerts.some(a => a.is_read) && (
            <button onClick={handleClearResolved} className="btn btn-secondary" style={{ fontSize: '0.8125rem', color: '#FDA4AF' }}>
              <Trash2 size={14} />
              <span>Clear Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          Active Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('surplus')}
          className={`btn ${filter === 'surplus' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', color: filter === 'surplus' ? '#FFF' : '#FB7185' }}
        >
          <AlertTriangle size={13} style={{ marginRight: '4px' }} />
          Surplus Warnings ({surplusCount})
        </button>
        <button
          onClick={() => setFilter('shortage')}
          className={`btn ${filter === 'shortage' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          Shortages ({alerts.filter(a => a.alert_type?.toLowerCase() === 'shortage').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`btn ${filter === 'resolved' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
        >
          Resolved ({alerts.filter(a => a.is_read).length})
        </button>
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            onDelete={handleDelete}

            onRouteDonation={handleOpenDonation}
          />
        ))}

        {filteredAlerts.length === 0 && !loading && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            <BellRing size={48} strokeWidth={1.5} color="#334155" style={{ marginBottom: '1rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No alerts found for this filter
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
              All kitchen inventory and food preparation flows are running smoothly.
            </p>
          </div>
        )}
      </div>

      {/* Donation Routing Modal */}
      <Modal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        title="Food Surplus Donation Routing"
      >
        {donationSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle2 size={48} color="#10B981" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Donation Dispatched!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Pickup notification sent to <b>{donationPartner}</b>. Alert marked as resolved.
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '1rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '0.5rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <b>Selected Alert:</b> {selectedAlert?.message}
            </div>

            <div className="form-group">
              <label className="form-label">Verified NGO / Food Recovery Partner</label>
              <select
                className="form-control"
                value={donationPartner}
                onChange={(e) => setDonationPartner(e.target.value)}
              >
                <option value="City Harvest Food Bank">City Harvest Food Bank (Verified)</option>
                <option value="Robin Hood Food Army">Robin Hood Food Army (Verified)</option>
                <option value="Feeding India Network">Feeding India Network (Verified)</option>
                <option value="Shelter Home Care Alliance">Shelter Home Care Alliance</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pickup Time & Temperature Control Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={donationNotes}
                onChange={(e) => setDonationNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setIsDonationModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchDonation}
                className="btn btn-primary"
              >
                <Send size={15} />
                <span>Confirm & Dispatch Pickup</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Create Alert Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Publish Operational / Surplus Alert"
      >
        <form onSubmit={handleCreateAlert}>
          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Alert Type</label>
              <select
                className="form-control"
                value={createForm.alert_type}
                onChange={(e) => setCreateForm({ ...createForm, alert_type: e.target.value })}
              >
                <option value="Surplus">Surplus Food Warning</option>
                <option value="Shortage">Inventory Shortage</option>
                <option value="Storage">Cold Storage / Temperature</option>
                <option value="System">System Operational</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Severity Level</label>
              <select
                className="form-control"
                value={createForm.severity}
                onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
              >
                <option value="Low">Low / Informational</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Severity</option>
                <option value="Critical">Critical Immediate</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alert Description & Action Recommendation</label>
            <textarea
              required
              rows="3"
              className="form-control"
              placeholder="e.g. Expected ~40 excess meals for Lunch service. Stored in hot-holding units at 65°C."
              value={createForm.message}
              onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="btn btn-primary"
            >
              <Check size={16} />
              <span>{createSubmitting ? 'Publishing...' : 'Publish Alert'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Dismiss & Delete Alert"
        maxWidth="450px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Are you sure you want to permanently dismiss and delete this alert from the active logs?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setDeleteConfirmId(null)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleDelete(deleteConfirmId)}
            className="btn btn-primary"
            style={{ background: 'var(--accent-rose)' }}
          >
            <Trash2 size={15} />
            <span>Delete Alert</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Alerts;
