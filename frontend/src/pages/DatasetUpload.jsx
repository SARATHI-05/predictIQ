import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  Database, 
  Calendar, 
  BarChart2,
  RefreshCw,
  AlertTriangle,
  FileDown,
  ShieldCheck,
  UserCheck,
  Trash2,
  Cloud
} from 'lucide-react';

import api from '../services/api';
import DashboardCard from '../components/DashboardCard';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const DatasetUpload = () => {
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Admin Deletion State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, type: '', item: null });
  const [deletingLog, setDeletingLog] = useState(false);

  const fetchStatsAndLogs = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.get('/api/dataset/statistics'),
        api.get('/api/dataset/logs')
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch dataset stats:', err);
    }
  };

  const handleExecuteDeleteLog = async () => {
    if (!isAdmin) {
      toast.error('Access Denied: Only Admin users can delete dataset upload history trail');
      return;
    }

    setDeletingLog(true);
    try {
      if (deleteConfirmModal.type === 'single') {
        const id = deleteConfirmModal.item.id;
        await api.delete(`/api/dataset/logs/${id}`);
        toast.success(`Dataset log #${id} deleted successfully`);
      } else if (deleteConfirmModal.type === 'clear-all') {
        const res = await api.delete('/api/dataset/logs/clear-all');
        toast.success(res.data.message || 'Dataset upload history cleared');
      }
      setDeleteConfirmModal({ open: false, type: '', item: null });
      fetchStatsAndLogs();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete dataset upload log';
      toast.error(msg);
    } finally {
      setDeletingLog(false);
    }
  };

  useEffect(() => {
    fetchStatsAndLogs();
  }, []);


  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const response = await api.post('/api/dataset/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(response.data);
      setFile(null);
      toast.success(response.data.message || 'Dataset uploaded successfully');
      fetchStatsAndLogs();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object' && detail !== null) {
        setUploadError(detail.message || 'Validation failed');
        setUploadResult({
          total_rows: detail.total_rows || 0,
          valid_rows: detail.valid_rows || 0,
          invalid_rows: detail.invalid_rows || 0,
          duplicate_rows: detail.duplicate_rows || 0,
          successfully_imported_rows: 0,
          has_error_report: true,
          validation_warnings: (detail.errors || []).map((e, idx) => `Row issue: ${Array.isArray(e) ? e.join(', ') : e}`)
        });
      } else {
        setUploadError(detail || 'Upload failed. Please check file format.');
      }
      toast.error('Dataset validation found errors');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    try {
      const response = await api.get('/api/dataset/error-report', { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'PredictIQ_Validation_Error_Report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded validation error report');
    } catch (err) {
      toast.error('Failed to download error report');
    }
  };

  const handleDownloadDatasetCSV = async () => {
    try {
      setDownloadingCSV(true);
      const response = await api.get('/api/dataset/download/csv', { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'PredictIQ_Food_Dataset.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded full historical dataset (.CSV)');
    } catch (err) {
      toast.error('Failed to download dataset CSV');
    } finally {
      setDownloadingCSV(false);
    }
  };

  const handleDownloadDatasetExcel = async () => {
    try {
      setDownloadingExcel(true);
      const response = await api.get('/api/dataset/download/excel', { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'PredictIQ_Food_Dataset.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded full historical dataset (.XLSX)');
    } catch (err) {
      toast.error('Failed to download dataset Excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadSampleTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const response = await api.get('/api/dataset/download/template', { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'PredictIQ_Sample_Template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded sample CSV template');
    } catch (err) {
      toast.error('Failed to download sample template');
    } finally {
      setDownloadingTemplate(false);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dataset Ingestion & Quality Hub</h1>
            <span className={`badge ${user?.role === 'Admin' ? 'badge-cyan' : 'badge-emerald'}`} style={{ fontSize: '0.75rem' }}>
              {user?.role === 'Admin' ? <ShieldCheck size={12} style={{ marginRight: '3px' }} /> : <UserCheck size={12} style={{ marginRight: '3px' }} />}
              {user?.role || 'Staff'} (Upload & Download Enabled)
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Upload raw operations data, perform instant quality validation, and export comprehensive datasets for both Admin and Staff.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={handleDownloadSampleTemplate} 
            disabled={downloadingTemplate}
            className="btn btn-secondary" 
            style={{ fontSize: '0.8125rem' }}
          >
            <Download size={14} />
            <span>{downloadingTemplate ? 'Downloading...' : 'Sample Template (.CSV)'}</span>
          </button>
          <button 
            onClick={handleDownloadDatasetCSV} 
            disabled={downloadingCSV}
            className="btn btn-secondary" 
            style={{ fontSize: '0.8125rem' }}
          >
            <FileText size={14} />
            <span>{downloadingCSV ? 'Exporting...' : 'Export Dataset (.CSV)'}</span>
          </button>
          <button 
            onClick={handleDownloadDatasetExcel} 
            disabled={downloadingExcel}
            className="btn btn-primary" 
            style={{ fontSize: '0.8125rem' }}
          >
            <FileSpreadsheet size={14} />
            <span>{downloadingExcel ? 'Exporting...' : 'Export Dataset (.XLSX)'}</span>
          </button>
        </div>
      </div>

      {/* Dataset Statistics KPI */}
      <div className="grid-cols-4" style={{ marginBottom: '1.75rem' }}>
        <DashboardCard
          title="Total Historical Logs"
          value={`${stats?.total_records || 0} rows`}
          subtitle="Trained Dataset Size"
          icon={Database}
          accentColor="emerald"
        />
        <DashboardCard
          title="Cumulative Prep Volume"
          value={`${stats?.total_food_prepared?.toLocaleString() || 0} meals`}
          subtitle={`Consumed: ${stats?.total_food_consumed?.toLocaleString() || 0}`}
          icon={BarChart2}
          accentColor="cyan"
        />
        <DashboardCard
          title="Average Daily Demand"
          value={`${stats?.average_daily_demand || 0} meals`}
          subtitle={`Avg Customers: ${stats?.average_customers || 0}`}
          icon={Calendar}
          accentColor="purple"
        />
        <DashboardCard
          title="Historical Wastage"
          value={`${stats?.total_leftover?.toLocaleString() || 0} meals`}
          subtitle={`Avg leftover: ${stats?.average_wastage || 0} meals/log`}
          icon={AlertCircle}
          accentColor="amber"
        />
      </div>

      {/* Upload Zone & Instructions */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Drag & Drop Zone */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Upload CSV or Excel File
          </h3>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              flex: 1,
              minHeight: '200px',
              border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: '1rem',
              background: isDragging ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => document.getElementById('dataset-file-input').click()}
          >
            <input
              id="dataset-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(56, 189, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#38BDF8'
            }}>
              <UploadCloud size={28} />
            </div>

            {file ? (
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {(file.size / 1024).toFixed(1)} KB &bull; Click 'Validate & Ingest' below
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drag and drop your file here, or <span style={{ color: 'var(--accent-primary)' }}>Browse</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Supports .CSV, .XLSX, and .XLS files (up to 20MB)
                </div>
              </div>
            )}
          </div>

          {/* Validation Result Box (Feature 5) */}
          {uploadResult && (
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              background: uploadResult.invalid_rows === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${uploadResult.invalid_rows === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: uploadResult.invalid_rows === 0 ? '#10B981' : '#F59E0B' }}>
                  Upload Quality Breakdown:
                </span>
                {uploadResult.has_error_report && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleDownloadErrorReport}
                    style={{ padding: '3px 8px', fontSize: '11.5px', color: '#F43F5E', borderColor: '#F43F5E' }}
                  >
                    <FileDown size={13} /> Download Error Report
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '12px' }}>
                <div><b>Total Rows:</b> {uploadResult.total_rows}</div>
                <div style={{ color: '#10B981' }}><b>Valid Rows:</b> {uploadResult.valid_rows}</div>
                <div style={{ color: '#F43F5E' }}><b>Invalid Rows:</b> {uploadResult.invalid_rows}</div>
                <div style={{ color: '#F59E0B' }}><b>Duplicates:</b> {uploadResult.duplicate_rows}</div>
                <div style={{ color: '#38BDF8' }}><b>Imported:</b> {uploadResult.successfully_imported_rows || uploadResult.valid_rows}</div>
              </div>

              {uploadResult.validation_warnings?.length > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <b>Warning Snippets:</b>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '4px' }}>
                    {uploadResult.validation_warnings.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {uploadError && !uploadResult && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '0.5rem',
              color: '#FB7185',
              fontSize: '0.825rem'
            }}>
              {uploadError}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', opacity: (!file || uploading) ? 0.5 : 1 }}
            >
              {uploading ? 'Running Data Quality Validation...' : 'Validate & Ingest Dataset'}
            </button>
          </div>
        </div>

        {/* Feature 6: Category Distribution Chart */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Historical Category Distribution
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            Volume of training records ingested per food category
          </p>

          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.category_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: '#131B2A', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#F8FAFC' }} />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} name="Records Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upload History Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            Dataset Upload History Trail
          </h3>
          {isAdmin && logs.length > 0 && (
            <button
              onClick={() => setDeleteConfirmModal({ open: true, type: 'clear-all', item: null })}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#FDA4AF', borderColor: 'rgba(244, 63, 94, 0.4)' }}
            >
              <Trash2 size={13} /> Clear History
            </button>
          )}
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>File Name</th>
                <th>Rows Ingested</th>
                <th>Uploaded By</th>
                <th>Status</th>
                <th>Timestamp</th>
                {isAdmin && <th style={{ textAlign: 'right', width: '80px' }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>#{l.id}</td>
                  <td style={{ fontWeight: 600 }}>
                    <div>{l.filename}</div>
                    {l.storage_url ? (
                      <a
                        href={l.storage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
                        title="Download original file from Supabase Storage bucket"
                      >
                        <Cloud size={10} /> Supabase Cloud Copy
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                        <Cloud size={10} /> Supabase Storage Integrated
                      </span>
                    )}
                  </td>

                  <td><span className="badge badge-emerald">{l.rows_count} rows</span></td>
                  <td>{l.uploaded_by}</td>
                  <td>
                    <span className={`badge ${l.status.includes('Success') ? 'badge-emerald' : 'badge-amber'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {l.created_at?.slice(0, 19).replace('T', ' ')}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setDeleteConfirmModal({ open: true, type: 'single', item: l })}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.5rem', color: '#FDA4AF' }}
                        title="Delete upload log record (Admin Only)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No upload logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal (Admin Only) */}
      <Modal
        isOpen={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, type: '', item: null })}
        title="Confirm Log Deletion (Admin Only)"
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
            Delete {deleteConfirmModal.type === 'clear-all' ? 'All Dataset Upload History' : `Upload Log #${deleteConfirmModal.item?.id}`}?
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete {deleteConfirmModal.type === 'clear-all' ? 'all dataset upload history records' : `dataset upload log #${deleteConfirmModal.item?.id} ('${deleteConfirmModal.item?.filename}')`}? This action is restricted to System Administrators.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmModal({ open: false, type: '', item: null })}
              disabled={deletingLog}
              style={{ padding: '0.6rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExecuteDeleteLog}
              disabled={deletingLog}
              style={{ background: '#F43F5E', borderColor: '#F43F5E', padding: '0.6rem 1.25rem' }}
            >
              {deletingLog ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


export default DatasetUpload;
