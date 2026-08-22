import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Calendar, 
  Check, 
  X,
  Sparkles,
  CloudSun,
  RefreshCw,
  Copy,
  AlertTriangle,
  CheckSquare,
  Square
} from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AdvancedFilter from '../components/AdvancedFilter';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const FoodRecords = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Advanced Filters (Feature 1)
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minPrepared, setMinPrepared] = useState('');
  const [maxPrepared, setMaxPrepared] = useState('');
  const [minConsumed, setMinConsumed] = useState('');
  const [maxConsumed, setMaxConsumed] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    food_category: 'Meals',
    food_prepared: '',
    food_consumed: '',
    leftover: '',
    expected_customers: '',
    holiday: 'No',
    special_event: 'No',
    weather: 'Sunny'
  });
  const [formError, setFormError] = useState('');

  // Delete Confirmation Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const categories = ['All', 'Meals', 'Biryani', 'Breakfast', 'Snacks', 'Dinner', 'Desserts'];
  const weathers = ['Sunny', 'Rainy', 'Cloudy', 'Windy', 'Cold'];

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
        category: category !== 'All' ? category : undefined,
        search: search || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        min_prepared: minPrepared || undefined,
        max_prepared: maxPrepared || undefined,
        min_consumed: minConsumed || undefined,
        max_consumed: maxConsumed || undefined
      };
      const response = await api.get('/api/food-records', { params });
      setRecords(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch food records:', err);
      toast.error('Failed to load food records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, category, search, startDate, endDate, minPrepared, maxPrepared, minConsumed, maxConsumed]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All');
    setStartDate('');
    setEndDate('');
    setMinPrepared('');
    setMaxPrepared('');
    setMinConsumed('');
    setMaxConsumed('');
    setPage(1);
    setSelectedIds([]);
    toast.info('Filters reset to default');
  };

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      food_category: 'Meals',
      food_prepared: '',
      food_consumed: '',
      leftover: '',
      expected_customers: '',
      holiday: 'No',
      special_event: 'No',
      weather: 'Sunny'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      date: record.date,
      food_category: record.food_category,
      food_prepared: record.food_prepared,
      food_consumed: record.food_consumed,
      leftover: record.leftover,
      expected_customers: record.expected_customers,
      holiday: record.holiday,
      special_event: record.special_event,
      weather: record.weather
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDuplicate = (record) => {
    setEditingRecord(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      food_category: record.food_category,
      food_prepared: record.food_prepared,
      food_consumed: record.food_consumed,
      leftover: record.leftover,
      expected_customers: record.expected_customers,
      holiday: record.holiday,
      special_event: record.special_event,
      weather: record.weather
    });
    setFormError('');
    setIsModalOpen(true);
    toast.info(`Duplicated template for ${record.food_category}`);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'food_prepared' || name === 'food_consumed') {
        const prep = parseInt(name === 'food_prepared' ? value : updated.food_prepared) || 0;
        const cons = parseInt(name === 'food_consumed' ? value : updated.food_consumed) || 0;
        updated.leftover = Math.max(0, prep - cons);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = {
        date: formData.date,
        food_category: formData.food_category,
        food_prepared: parseInt(formData.food_prepared),
        food_consumed: parseInt(formData.food_consumed),
        leftover: parseInt(formData.leftover),
        expected_customers: parseInt(formData.expected_customers),
        holiday: formData.holiday,
        special_event: formData.special_event,
        weather: formData.weather
      };

      if (editingRecord) {
        await api.put(`/api/food-records/${editingRecord.id}`, payload);
        toast.success(`Updated food record #${editingRecord.id} (${formData.food_category})`);
      } else {
        await api.post('/api/food-records', payload);
        toast.success(`New ${formData.food_category} food record created successfully!`);
      }

      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save food record');
    }
  };

  const handleOpenDelete = (record) => {
    setDeleteConfirmId(record.id);
    setDeleteConfirmRecord(record);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/api/food-records/${deleteConfirmId}`);
      toast.success(`Deleted food record #${deleteConfirmId}`);
      setDeleteConfirmId(null);
      setDeleteConfirmRecord(null);
      setSelectedIds(prev => prev.filter(id => id !== deleteConfirmId));
      fetchRecords();
    } catch (err) {
      toast.error('Failed to delete record');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === records.length && records.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map(r => r.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (!selectedIds.length) return;
    setIsBulkDeleting(true);
    try {
      const res = await api.post('/api/food-records/bulk-delete', { ids: selectedIds });
      toast.success(res.data.message || `Deleted ${selectedIds.length} records`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error('Failed to execute bulk deletion');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns = [
    ...(isAdmin ? [{
      header: (
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleToggleSelectAll}>
          {records.length > 0 && selectedIds.length === records.length ? (
            <CheckSquare size={16} color="var(--accent-primary)" />
          ) : (
            <Square size={16} color="var(--text-muted)" />
          )}
        </div>
      ),
      width: '40px',
      render: (r) => (
        <div 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
          onClick={(e) => { e.stopPropagation(); handleToggleSelectOne(r.id); }}
        >
          {selectedIds.includes(r.id) ? (
            <CheckSquare size={16} color="var(--accent-primary)" />
          ) : (
            <Square size={16} color="var(--text-muted)" />
          )}
        </div>
      )
    }] : []),
    {
      header: 'Date',
      accessor: 'date',
      render: (r) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {r.date}
        </span>
      )
    },
    {
      header: 'Category',
      accessor: 'food_category',
      render: (r) => (
        <span className="badge badge-cyan">
          {r.food_category}
        </span>
      )
    },
    {
      header: 'Prepared',
      accessor: 'food_prepared',
      render: (r) => `${r.food_prepared} meals`
    },
    {
      header: 'Consumed',
      accessor: 'food_consumed',
      render: (r) => <span style={{ fontWeight: 700, color: '#34D399' }}>{r.food_consumed} meals</span>
    },
    {
      header: 'Leftover',
      accessor: 'leftover',
      render: (r) => (
        <span style={{ 
          color: r.leftover >= 30 ? '#FB7185' : (r.leftover > 0 ? '#FBBF24' : 'var(--text-secondary)'), 
          fontWeight: r.leftover >= 30 ? 700 : 500 
        }}>
          {r.leftover} meals {r.leftover >= 30 && <span style={{ fontSize: '0.7rem', color: '#FB7185' }}>(Surplus)</span>}
        </span>
      )
    },
    {
      header: 'Customers',
      accessor: 'expected_customers',
      render: (r) => `${r.expected_customers}`
    },
    {
      header: 'Weather',
      accessor: 'weather',
      render: (r) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {r.weather}
        </span>
      )
    },
    {
      header: 'Event / Holiday',
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {r.holiday === 'Yes' && <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Holiday</span>}
          {r.special_event === 'Yes' && <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Event</span>}
          {r.holiday === 'No' && r.special_event === 'No' && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Regular</span>}
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
          <button
            onClick={() => handleDuplicate(r)}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.55rem' }}
            title="Duplicate as new record"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => handleOpenEdit(r)}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.55rem', color: 'var(--accent-cyan)' }}
            title="Edit record"
          >
            <Edit2 size={13} />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleOpenDelete(r)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.55rem', color: '#FDA4AF' }}
              title="Delete record (Admin Only)"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )
    }
  ];

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Food Data Management</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Log, filter, edit, and maintain historical food preparation and consumption records with instant leftover tracking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && selectedIds.length > 0 && (
            <button 
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="btn btn-primary" 
              style={{ background: 'var(--accent-rose)', fontSize: '0.8125rem' }}
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <button onClick={fetchRecords} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            <RefreshCw size={15} className={loading ? 'pulse-indicator' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
            <Plus size={16} />
            <span>Add Food Record</span>
          </button>
        </div>
      </div>

      {/* Feature 1: Advanced Search & Filtering Component */}
      <AdvancedFilter
        searchPlaceholder="Search category, weather, holiday or event..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        categoryValue={category}
        onCategoryChange={(val) => { setCategory(val); setPage(1); }}
        startDate={startDate}
        onStartDateChange={(val) => { setStartDate(val); setPage(1); }}
        endDate={endDate}
        onEndDateChange={(val) => { setEndDate(val); setPage(1); }}
        label1="Prepared Qty"
        minVal1={minPrepared}
        onMinVal1Change={(val) => { setMinPrepared(val); setPage(1); }}
        maxVal1={maxPrepared}
        onMaxVal1Change={(val) => { setMaxPrepared(val); setPage(1); }}
        label2="Consumed Qty"
        minVal2={minConsumed}
        onMinVal2Change={(val) => { setMinConsumed(val); setPage(1); }}
        maxVal2={maxConsumed}
        onMaxVal2Change={(val) => { setMaxConsumed(val); setPage(1); }}
        onReset={handleResetFilters}
      />

      {/* Table Container */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <DataTable
          columns={columns}
          data={records}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loading}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? `Edit Food Record #${editingRecord.id}` : 'Add New Food Record'}
        maxWidth="650px"
      >
        {formError && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '0.5rem',
            color: '#FB7185',
            fontSize: '0.825rem',
            marginBottom: '1rem'
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Service Date</label>
              <input
                type="date"
                required
                className="form-control"
                name="date"
                value={formData.date}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Food Category</label>
              <select
                className="form-control"
                name="food_category"
                value={formData.food_category}
                onChange={handleFormChange}
              >
                {categories.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Food Prepared (Meals)</label>
              <input
                type="number"
                required
                min="0"
                className="form-control"
                name="food_prepared"
                placeholder="e.g. 450"
                value={formData.food_prepared}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Food Consumed (Meals)</label>
              <input
                type="number"
                required
                min="0"
                className="form-control"
                name="food_consumed"
                placeholder="e.g. 420"
                value={formData.food_consumed}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Leftover (Auto-calculated)</label>
              <input
                type="number"
                readOnly
                className="form-control"
                name="leftover"
                value={formData.leftover}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  color: parseInt(formData.leftover) >= 30 ? '#FB7185' : '#38BDF8',
                  fontWeight: 700
                }}
              />
            </div>
          </div>

          {/* Real-time leftover advice banner */}
          {parseInt(formData.leftover) >= 20 && (
            <div style={{
              padding: '0.65rem 0.85rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              color: '#FDA4AF',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertTriangle size={15} color="#FB7185" />
              <span>Surplus Alert will be triggered for {formData.leftover} leftover meals to enable food donation pickup.</span>
            </div>
          )}

          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Expected Customers</label>
              <input
                type="number"
                required
                min="1"
                className="form-control"
                name="expected_customers"
                placeholder="e.g. 410"
                value={formData.expected_customers}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Weather Condition</label>
              <select
                className="form-control"
                name="weather"
                value={formData.weather}
                onChange={handleFormChange}
              >
                {weathers.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Holiday / Special Event</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  className="form-control"
                  name="holiday"
                  value={formData.holiday}
                  onChange={handleFormChange}
                >
                  <option value="No">Holiday: No</option>
                  <option value="Yes">Holiday: Yes</option>
                </select>
                <select
                  className="form-control"
                  name="special_event"
                  value={formData.special_event}
                  onChange={handleFormChange}
                >
                  <option value="No">Event: No</option>
                  <option value="Yes">Event: Yes</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              <span>{editingRecord ? 'Update Record' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Record Deletion"
        maxWidth="460px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Are you sure you want to delete the food record for <b>{deleteConfirmRecord?.food_category}</b> on <b>{deleteConfirmRecord?.date}</b>?
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
            onClick={handleConfirmDelete}
            className="btn btn-primary"
            style={{ background: 'var(--accent-rose)' }}
          >
            <Trash2 size={15} />
            <span>Delete Record</span>
          </button>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Confirm Bulk Deletion"
        maxWidth="460px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Are you sure you want to delete <b>{selectedIds.length}</b> selected food records? This action cannot be undone.
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
    </div>
  );
};

export default FoodRecords;
