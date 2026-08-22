import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Download, 
  RefreshCw, 
  Search, 
  Trash2, 
  CheckSquare, 
  Square, 
  AlertTriangle 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatIST } from '../utils/timeUtils';
import Modal from '../components/Modal';

const MODULES = ['All', 'Authentication', 'FoodRecords', 'Dataset', 'Predictions', 'ResourcePlanning', 'Inventory', 'MachineLearning', 'UserManagement', 'System', 'Backup'];
const ACTIONS = ['All', 'LOGIN_SUCCESS', 'FOOD_RECORD_CREATED', 'FOOD_RECORD_UPDATED', 'FOOD_RECORD_DELETED', 'DATASET_UPLOAD', 'PREDICTION_GENERATED', 'RESOURCE_PLAN_GENERATED', 'INVENTORY_STOCK_IN', 'INVENTORY_STOCK_OUT', 'ML_MODEL_TRAINED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'DATABASE_BACKUP_CREATED'];

const AuditLogs = () => {
  const { token, isAdmin } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk Selection & Deletion State (Admin Only)
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, type: '', item: null });
  const [deleting, setDeleting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/audit-logs?page=${page}&page_size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedModule && selectedModule !== 'All') url += `&module=${encodeURIComponent(selectedModule)}`;
      if (selectedAction && selectedAction !== 'All') url += `&action=${encodeURIComponent(selectedAction)}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const res = await api.get(url);
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to retrieve audit trail logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, selectedModule, selectedAction, startDate, endDate, search]);

  const handleExportCsv = async () => {
    try {
      let url = `/api/audit-logs/export/csv?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedModule && selectedModule !== 'All') url += `module=${encodeURIComponent(selectedModule)}&`;
      if (selectedAction && selectedAction !== 'All') url += `action=${encodeURIComponent(selectedAction)}&`;
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}&`;

      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `PredictIQ_Audit_Trail_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit trail exported successfully!');
    } catch (err) {
      toast.error('Failed to export audit logs');
    }
  };

  // Selection Logic
  const handleToggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(logs.map(l => l.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Deletion Actions (Admin Only)
  const executeDelete = async () => {
    if (!isAdmin) {
      toast.error('Access Denied: Only Admin users can delete audit records');
      return;
    }

    setDeleting(true);
    try {
      if (deleteConfirmModal.type === 'single') {
        const id = deleteConfirmModal.item.id;
        await api.delete(`/api/audit-logs/${id}`);
        toast.success(`Audit record #${id} deleted successfully`);
      } else if (deleteConfirmModal.type === 'bulk') {
        await api.delete('/api/audit-logs/bulk', {
          data: { ids: selectedIds }
        });
        toast.success(`Successfully deleted ${selectedIds.length} audit record(s)`);
      }
      setDeleteConfirmModal({ open: false, type: '', item: null });
      fetchLogs();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete audit records';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (

    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', color: 'var(--accent-secondary)' }}>
              <Shield size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>System Audit Trail & Compliance</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Immutable enterprise audit logging for user operations, dataset modifications, ML training, and security events
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isAdmin && selectedIds.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmModal({ open: true, type: 'bulk', item: null })}
              style={{ color: '#FDA4AF', borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)' }}
            >
              <Trash2 size={16} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={fetchLogs}>
            <RefreshCw size={16} className={loading ? 'pulse-indicator' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleExportCsv}>
            <Download size={16} /> Export CSV Trail
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Search */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Search Logs</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search user, action, description..."
                className="input-field"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: '32px', height: '38px', width: '100%' }}
              />
            </div>
          </div>

          {/* Module */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Module</label>
            <select
              className="input-field"
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setPage(1); }}
              style={{ height: '38px' }}
            >
              {MODULES.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>)}
            </select>
          </div>

          {/* Action */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Action Type</label>
            <select
              className="input-field"
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
              style={{ height: '38px' }}
            >
              {ACTIONS.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actions' : a}</option>)}
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Date</label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              style={{ height: '38px' }}
            />
          </div>

          {/* Date Range End */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>End Date</label>
            <input
              type="date"
              className="input-field"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              style={{ height: '38px' }}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {isAdmin && (
                  <th style={{ width: '40px' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      onClick={handleToggleSelectAll}
                      title="Select / Deselect All Logs (Admin Only)"
                    >
                      {logs.length > 0 && selectedIds.length === logs.length ? (
                        <CheckSquare size={16} color="var(--accent-primary)" />
                      ) : (
                        <Square size={16} color="var(--text-muted)" />
                      )}
                    </div>
                  </th>
                )}
                <th>Timestamp</th>
                <th>User Account</th>
                <th>Module</th>
                <th>Action</th>
                <th>Description</th>
                <th>Record Ref</th>
                <th>IP Address</th>
                {isAdmin && <th style={{ textAlign: 'right', width: '80px' }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading audit trail entries...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No audit records found for the selected filter parameters.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const isSelected = selectedIds.includes(l.id);
                  return (
                    <tr 
                      key={l.id}
                      style={{
                        background: isSelected ? 'rgba(244, 63, 94, 0.08)' : undefined,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {isAdmin && (
                        <td>
                          <div 
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => handleToggleSelectOne(l.id)}
                          >
                            {isSelected ? (
                              <CheckSquare size={16} color="var(--accent-primary)" />
                            ) : (
                              <Square size={16} color="var(--text-muted)" />
                            )}
                          </div>
                        </td>
                      )}
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {formatIST(l.timestamp)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.user_email || 'System'}</td>
                      <td>
                        <span className="badge badge-secondary">{l.module}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            l.action.includes('DELETED') || l.action.includes('DEACTIVATED') || l.action.includes('FAILED')
                              ? 'badge-danger'
                              : l.action.includes('CREATED') || l.action.includes('SUCCESS') || l.action.includes('TRAINED')
                              ? 'badge-success'
                              : 'badge-primary'
                          }`}
                        >
                          {l.action}
                        </span>
                      </td>
                      <td style={{ maxWidth: '350px', fontSize: '0.85rem' }}>{l.description}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{l.record_id || 'N/A'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{l.ip_address || '—'}</td>


                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setDeleteConfirmModal({ open: true, type: 'single', item: l })}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.5rem', color: '#FDA4AF' }}
                            title="Delete audit record (Admin Only)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Showing {logs.length} of {total} audit records (Page {page} of {totalPages})
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Admin Only) */}
      <Modal
        isOpen={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, type: '', item: null })}
        title="Confirm Deletion (Admin Only)"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FB7185',
            marginBottom: '1rem'
          }}>
            <AlertTriangle size={24} />
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Delete {deleteConfirmModal.type === 'bulk' ? `${selectedIds.length} Selected Records` : `Audit Record #${deleteConfirmModal.item?.id}`}?
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete {deleteConfirmModal.type === 'bulk' ? `these ${selectedIds.length} audit records` : `audit record #${deleteConfirmModal.item?.id}`}? This action is restricted to System Administrators.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmModal({ open: false, type: '', item: null })}
              disabled={deleting}
              style={{ padding: '0.6rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={executeDelete}
              disabled={deleting}
              style={{ background: '#F43F5E', borderColor: '#F43F5E', padding: '0.6rem 1.25rem' }}
            >
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLogs;
