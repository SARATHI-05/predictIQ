import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  Calendar, 
  FileText, 
  Printer, 
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileDown,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [reportType, setReportType] = useState('food_demand');
  const [category, setCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Single Item Delete Confirmation State
  const [singleDeleteConfirmItem, setSingleDeleteConfirmItem] = useState(null);

  const categories = ['All', 'Meals', 'Biryani', 'Breakfast', 'Snacks', 'Dinner', 'Desserts', 'Grains', 'Pulses', 'Oils', 'Protein', 'Vegetables', 'Dairy'];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: reportType,
        food_category: category !== 'All' ? category : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      };
      const response = await api.get('/api/reports', { params });
      setReportData(response.data);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to generate report:', err);
      toast.error('Failed to generate report preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, category, startDate, endDate]);

  const handleDownloadCSV = async () => {
    try {
      setDownloadingCSV(true);
      const params = {
        report_type: reportType,
        food_category: category !== 'All' ? category : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      };

      const response = await api.get('/api/reports/export/csv', {
        params,
        responseType: 'blob'
      });

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `PredictIQ_${reportType}_Report_${todayStr}.csv`;

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error('Failed to download CSV report');
    } finally {
      setDownloadingCSV(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const params = {
        report_type: reportType,
        food_category: category !== 'All' ? category : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      };

      const response = await api.get('/api/reports/export/excel', {
        params,
        responseType: 'blob'
      });

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `PredictIQ_${reportType}_Report_${todayStr}.xlsx`;

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error('Failed to download Excel spreadsheet');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const params = {
        report_type: reportType,
        food_category: category !== 'All' ? category : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      };

      const response = await api.get('/api/reports/export/pdf', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/html;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const newWin = window.open(url, '_blank');
      if (newWin) {
        newWin.focus();
      }
      toast.success('Generated printable HTML/PDF report view');
    } catch (err) {
      toast.error('Failed to export printable report');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Bulk Selection Handlers
  const items = reportData?.items || [];

  const handleToggleSelectAll = () => {
    if (selectedIds.length === items.length && items.length > 0) {
      setSelectedIds([]);
    } else {
      const validIds = items.map(item => item.id).filter(Boolean);
      setSelectedIds(validIds);
    }
  };

  const handleToggleSelectOne = (id) => {
    if (!id) return;
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (!selectedIds.length) return;
    setIsBulkDeleting(true);
    try {
      const res = await api.post('/api/reports/bulk-delete', {
        report_type: reportType,
        ids: selectedIds
      });
      toast.success(res.data.message || `Deleted ${selectedIds.length} records`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      fetchReport();
    } catch (err) {
      toast.error('Failed to execute bulk deletion on report items');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteConfirmItem || !singleDeleteConfirmItem.id) return;
    try {
      await api.delete(`/api/reports/${reportType}/${singleDeleteConfirmItem.id}`);
      toast.success(`Deleted record #${singleDeleteConfirmItem.id}`);
      setSelectedIds(prev => prev.filter(id => id !== singleDeleteConfirmItem.id));
      setSingleDeleteConfirmItem(null);
      fetchReport();
    } catch (err) {
      toast.error('Failed to delete report item');
    }
  };

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Audit Reports & Multi-Format Export</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Filter, preview, bulk delete records, and generate compliance reports with CSV, Excel, and printable PDF exports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin && selectedIds.length > 0 && (
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="btn btn-primary"
              style={{ background: 'var(--accent-rose)', fontSize: '0.8125rem' }}
            >
              <Trash2 size={15} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <button onClick={fetchReport} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            <RefreshCw size={15} className={loading ? 'pulse-indicator' : ''} />
            <span>Refresh</span>
          </button>

          <button onClick={handleDownloadPDF} disabled={downloadingPDF} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            <Printer size={15} />
            <span>{downloadingPDF ? 'Preparing...' : 'Print / PDF'}</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={downloadingCSV}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem' }}
          >
            <Download size={15} />
            <span>{downloadingCSV ? 'CSV...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="btn btn-primary"
            style={{ fontSize: '0.8125rem' }}
          >
            <FileSpreadsheet size={15} />
            <span>{downloadingExcel ? 'Excel...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
        <div className="grid-cols-4" style={{ gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Report Module / Type</label>
            <select
              className="form-control"
              value={reportType}
              onChange={(e) => { setReportType(e.target.value); setSelectedIds([]); }}
            >
              <option value="food_demand">Food Demand & Preparation</option>
              <option value="wastage">Wastage & Leftover Audit</option>
              <option value="predictions">ML Predictions History</option>
              <option value="inventory">Inventory Valuation & Low Stock</option>
              <option value="audit_logs">System Security Audit Trail</option>
              <option value="accuracy">Prediction Accuracy Evaluation</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Food Category Filter</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Report Summary Cards */}
      {reportData?.summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {Object.entries(reportData.summary).map(([key, val], idx) => (
            <div key={idx} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {key.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {typeof val === 'number' && key.includes('percent') ? `${val}%` : typeof val === 'number' ? (key.includes('cost') || key.includes('val') ? `₹${val.toLocaleString()}` : val.toLocaleString()) : val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Preview Table with Bulk Delete Checkboxes */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Report Preview & Data Management</h3>
            {isAdmin && selectedIds.length > 0 && (
              <span className="badge badge-rose" style={{ fontSize: '0.75rem' }}>
                {selectedIds.length} Selected
              </span>
            )}
            {!isAdmin && (
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                Staff View (Export Mode)
              </span>
            )}
          </div>
          <span className="badge badge-emerald">
            {reportData?.total_records || 0} Records Found
          </span>
        </div>

        <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          {items.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: '40px' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={handleToggleSelectAll}
                        title="Select / Deselect All (Admin Only)"
                      >
                        {items.length > 0 && selectedIds.length === items.length ? (
                          <CheckSquare size={16} color="var(--accent-primary)" />
                        ) : (
                          <Square size={16} color="var(--text-muted)" />
                        )}
                      </div>
                    </th>
                  )}
                  {Object.keys(items[0]).filter(k => k !== 'id').map((colKey, idx) => (
                    <th key={idx}>{colKey.replace(/_/g, ' ').toUpperCase()}</th>
                  ))}
                  {isAdmin && <th style={{ textAlign: 'right', width: '80px' }}>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((row, rowIdx) => {
                  const isSelected = row.id && selectedIds.includes(row.id);
                  return (
                    <tr 
                      key={row.id || rowIdx}
                      style={{
                        background: isSelected ? 'rgba(244, 63, 94, 0.08)' : undefined,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {isAdmin && (
                        <td>
                          {row.id ? (
                            <div 
                              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                              onClick={() => handleToggleSelectOne(row.id)}
                            >
                              {isSelected ? (
                                <CheckSquare size={16} color="var(--accent-primary)" />
                              ) : (
                                <Square size={16} color="var(--text-muted)" />
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                      )}
                      {Object.entries(row).filter(([k]) => k !== 'id').map(([k, v], cellIdx) => (
                        <td key={cellIdx}>
                          {k === 'food_category' || k === 'category' ? (
                            <span className="badge badge-cyan">{v}</span>
                          ) : k === 'status' ? (
                            <span className={`badge ${v === 'Low Stock' ? 'badge-rose' : 'badge-emerald'}`}>
                              {v}
                            </span>
                          ) : typeof v === 'number' ? (
                            v.toLocaleString()
                          ) : (
                            String(v)
                          )}
                        </td>
                      ))}
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          {row.id && (
                            <button
                              onClick={() => setSingleDeleteConfirmItem(row)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', color: '#FDA4AF' }}
                              title="Delete this record (Admin Only)"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              {loading ? 'Loading report data...' : 'No records match the selected report criteria.'}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Confirm Bulk Deletion"
        maxWidth="460px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Are you sure you want to delete <b>{selectedIds.length}</b> selected records from the <b>{reportType.replace(/_/g, ' ')}</b> module? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setIsBulkDeleteModalOpen(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBulkDeleting}
            onClick={handleConfirmBulkDelete}
            className="btn btn-primary"
            style={{ background: 'var(--accent-rose)' }}
          >
            <Trash2 size={15} />
            <span>{isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Records`}</span>
          </button>
        </div>
      </Modal>

      {/* Single Record Delete Modal */}
      <Modal
        isOpen={!!singleDeleteConfirmItem}
        onClose={() => setSingleDeleteConfirmItem(null)}
        title="Confirm Record Deletion"
        maxWidth="460px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Are you sure you want to delete record #{singleDeleteConfirmItem?.id} from <b>{reportType.replace(/_/g, ' ')}</b>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setSingleDeleteConfirmItem(null)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSingleDelete}
            className="btn btn-primary"
            style={{ background: 'var(--accent-rose)' }}
          >
            <Trash2 size={15} />
            <span>Delete Record</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;
