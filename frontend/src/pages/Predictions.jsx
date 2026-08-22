import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  ChefHat, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Boxes, 
  Calendar, 
  Users, 
  CloudSun,
  Layers,
  ArrowRight,
  TrendingUp,
  Coins,
  Target,
  Filter,
  Edit2,
  Edit3,
  Check,
  HeartHandshake,
  Square,
  CheckSquare,
  RefreshCw,
  Send
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Predictions = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    food_category: 'Meals',
    expected_customers: 450,
    holiday: 'No',
    special_event: 'No',
    weather: 'Sunny',
    planned_preparation: 480
  });

  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [totalHistory, setTotalHistory] = useState(0);
  const [page, setPage] = useState(1);
  const [historyCategory, setHistoryCategory] = useState('All');
  const [error, setError] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Edit Prediction Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPrediction, setEditingPrediction] = useState(null);
  const [editFormData, setEditFormData] = useState({
    prediction_date: '',
    food_category: '',
    expected_customers: '',
    predicted_demand: '',
    recommended_preparation: '',
    demand_level: 'Moderate'
  });

  // Record/Update Actual Modal State
  const [isActualModalOpen, setIsActualModalOpen] = useState(false);
  const [evaluatingPrediction, setEvaluatingPrediction] = useState(null);
  const [actualConsumedInput, setActualConsumedInput] = useState('');
  const [savingActual, setSavingActual] = useState(false);

  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmPred, setDeleteConfirmPred] = useState(null);

  // Donation Routing Modal State from Simulator
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationPartner, setDonationPartner] = useState('City Harvest Food Bank');
  const [donationSuccess, setDonationSuccess] = useState(false);

  const categories = ['Meals', 'Biryani', 'Breakfast', 'Snacks', 'Dinner', 'Desserts'];
  const weathers = ['Sunny', 'Rainy', 'Cloudy', 'Windy', 'Cold'];

  const fetchHistory = async () => {
    try {
      const params = {
        page,
        page_size: 8,
        category: historyCategory !== 'All' ? historyCategory : undefined
      };
      const response = await api.get('/api/predictions', { params });
      setPredictionHistory(response.data.data);
      setTotalHistory(response.data.total);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, historyCategory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        date: formData.date,
        food_category: formData.food_category,
        expected_customers: parseInt(formData.expected_customers),
        holiday: formData.holiday,
        special_event: formData.special_event,
        weather: formData.weather,
        planned_preparation: formData.planned_preparation ? parseInt(formData.planned_preparation) : undefined
      };

      const response = await api.post('/api/predictions', payload);
      setPredictionResult(response.data);
      toast.success(`Generated forecast for ${response.data.food_category}: ${response.data.predicted_demand} meals!`);
      fetchHistory();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Prediction failed. Check backend connection.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Edit Prediction Handlers
  const handleOpenEdit = (pred) => {
    setEditingPrediction(pred);
    setEditFormData({
      prediction_date: pred.prediction_date,
      food_category: pred.food_category,
      expected_customers: pred.expected_customers,
      predicted_demand: pred.predicted_demand,
      recommended_preparation: pred.recommended_preparation,
      demand_level: pred.demand_level
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPrediction) return;

    try {
      await api.put(`/api/predictions/${editingPrediction.id}`, {
        prediction_date: editFormData.prediction_date,
        food_category: editFormData.food_category,
        expected_customers: parseInt(editFormData.expected_customers),
        predicted_demand: parseInt(editFormData.predicted_demand),
        recommended_preparation: parseInt(editFormData.recommended_preparation),
        demand_level: editFormData.demand_level
      });
      toast.success(`Updated prediction log #${editingPrediction.id}`);
      setIsEditModalOpen(false);
      fetchHistory();
    } catch (err) {
      toast.error('Failed to update prediction');
    }
  };

  // Record Actual Consumption Handlers
  const handleOpenActualModal = (pred) => {
    setEvaluatingPrediction(pred);
    setActualConsumedInput(pred.actual_consumed || '');
    setIsActualModalOpen(true);
  };

  const handleSaveActual = async (e) => {
    e.preventDefault();
    if (!evaluatingPrediction) return;

    const val = parseInt(actualConsumedInput);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid consumed meals number');
      return;
    }

    try {
      setSavingActual(true);
      const res = await api.put(`/api/predictions/${evaluatingPrediction.id}/actual`, {
        actual_consumed: val,
        prediction_date: evaluatingPrediction.prediction_date,
        food_category: evaluatingPrediction.food_category
      });
      toast.success(`Recorded ${val} actual meals (Accuracy: ${res.data.accuracy_score}%)`);
      setIsActualModalOpen(false);
      fetchHistory();
    } catch (err) {
      toast.error('Failed to record actual consumption');
    } finally {
      setSavingActual(false);
    }
  };

  // Delete Single Prediction Handlers
  const handleOpenDelete = (pred) => {
    setDeleteConfirmId(pred.id);
    setDeleteConfirmPred(pred);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/api/predictions/${deleteConfirmId}`);
      toast.success(`Deleted prediction log #${deleteConfirmId}`);
      setDeleteConfirmId(null);
      setDeleteConfirmPred(null);
      setSelectedIds(prev => prev.filter(id => id !== deleteConfirmId));
      fetchHistory();
    } catch (err) {
      toast.error('Failed to delete prediction');
    }
  };

  // Bulk Delete Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === predictionHistory.length && predictionHistory.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(predictionHistory.map(p => p.id));
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
      const res = await api.post('/api/predictions/bulk-delete', { ids: selectedIds });
      toast.success(res.data.message || `Deleted ${selectedIds.length} predictions`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      fetchHistory();
    } catch (err) {
      toast.error('Failed to execute bulk deletion');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Dispatch Donation from Simulator Result
  const handleDispatchSimulatorDonation = () => {
    setDonationSuccess(true);
    toast.success(`Donation pickup scheduled with ${donationPartner}! Alert synced.`);
    setTimeout(() => {
      setIsDonationModalOpen(false);
      setDonationSuccess(false);
    }, 1500);
  };

  const historyColumns = [
    ...(isAdmin ? [{
      header: (
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleToggleSelectAll}>
          {predictionHistory.length > 0 && selectedIds.length === predictionHistory.length ? (
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
      header: 'Prediction Date',
      accessor: 'prediction_date',
      render: (r) => (
        <span style={{ fontWeight: 600 }}>{r.prediction_date} ({r.day_of_week})</span>
      )
    },
    {
      header: 'Category',
      accessor: 'food_category',
      render: (r) => <span className="badge badge-cyan">{r.food_category}</span>
    },
    {
      header: 'Customers',
      accessor: 'expected_customers',
      render: (r) => `${r.expected_customers}`
    },
    {
      header: 'Predicted Demand',
      accessor: 'predicted_demand',
      render: (r) => <span style={{ fontWeight: 700, color: '#34D399' }}>{r.predicted_demand} meals</span>
    },
    {
      header: 'Recommended Prep',
      accessor: 'recommended_preparation',
      render: (r) => `${r.recommended_preparation} meals`
    },
    {
      header: 'Actual Consumed',
      render: (r) => (
        <span style={{ fontWeight: 600, color: r.actual_consumed ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
          {r.actual_consumed ? `${r.actual_consumed} meals` : 'Pending Record'}
        </span>
      )
    },
    {
      header: 'Accuracy %',
      render: (r) => (
        <span style={{ fontWeight: 800, color: r.accuracy_percentage ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
          {r.accuracy_percentage ? `${r.accuracy_percentage}%` : 'N/A'}
        </span>
      )
    },
    {
      header: 'Demand Level',
      accessor: 'demand_level',
      render: (r) => (
        <span className={`badge ${r.demand_level === 'Peak' ? 'badge-rose' : r.demand_level === 'High' ? 'badge-amber' : 'badge-cyan'}`}>
          {r.demand_level}
        </span>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
          <button
            onClick={() => handleOpenActualModal(r)}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.55rem', color: 'var(--accent-primary)' }}
            title="Record / Update Actual Consumption & Evaluate Accuracy"
          >
            <Target size={13} />
          </button>
          <button
            onClick={() => handleOpenEdit(r)}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.55rem', color: 'var(--accent-cyan)' }}
            title="Edit Prediction Parameters"
          >
            <Edit2 size={13} />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleOpenDelete(r)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.55rem', color: '#FDA4AF' }}
              title="Delete Historical Forecast (Admin Only)"
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
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>AI Food Demand Forecasting & Management</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Enter operational scenario parameters to run real-time Random Forest ML demand predictions, inventory checks, surplus evaluation, and manage historical predictions.
        </p>
      </div>

      {/* Simulator Form & Results Section */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Left: Interactive Input Form */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <BrainCircuit size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Demand Scenario Simulator</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Powered by Scikit-Learn Random Forest Regressor</p>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '0.5rem',
              color: '#FB7185',
              fontSize: '0.825rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handlePredict}>
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Service Date</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Food Category</label>
                <select
                  className="form-control"
                  name="food_category"
                  value={formData.food_category}
                  onChange={handleChange}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Expected Customers</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="5000"
                  className="form-control"
                  name="expected_customers"
                  value={formData.expected_customers}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Weather Forecast</label>
                <select
                  className="form-control"
                  name="weather"
                  value={formData.weather}
                  onChange={handleChange}
                >
                  {weathers.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Holiday / Special Event</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="form-control"
                    name="holiday"
                    value={formData.holiday}
                    onChange={handleChange}
                  >
                    <option value="No">Holiday: No</option>
                    <option value="Yes">Holiday: Yes</option>
                  </select>
                  <select
                    className="form-control"
                    name="special_event"
                    value={formData.special_event}
                    onChange={handleChange}
                  >
                    <option value="No">Event: No</option>
                    <option value="Yes">Event: Yes</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Planned Preparation (Meals)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  name="planned_preparation"
                  placeholder="e.g. 520 (for surplus detection)"
                  value={formData.planned_preparation}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem' }}
            >
              {loading ? 'Running ML Model Inference...' : 'Calculate Food Demand & Plan Resources'}
              {!loading && <Sparkles size={16} />}
            </button>
          </form>
        </div>

        {/* Right: Real ML Output Card */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChefHat size={20} color="var(--accent-primary)" />
            <span>AI Prediction & Kitchen Action Plan</span>
          </h3>

          {predictionResult ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              {/* Primary Output Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Predicted Demand
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34D399', marginTop: '0.25rem' }}>
                    {predictionResult.predicted_demand} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>meals</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Recommended Prep
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38BDF8', marginTop: '0.25rem' }}>
                    {predictionResult.recommended_preparation} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>meals</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Demand Level
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span className={`badge ${
                      predictionResult.demand_level === 'Peak' ? 'badge-rose' :
                      predictionResult.demand_level === 'High' ? 'badge-amber' :
                      'badge-emerald'
                    }`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                      {predictionResult.demand_level} Demand
                    </span>
                  </div>
                </div>
              </div>

              {/* Surplus Alert Banner if detected */}
              {predictionResult.surplus_detected && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1, minWidth: '220px' }}>
                    <AlertTriangle size={20} color="#FB7185" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FB7185' }}>
                        Surplus Food Alert Triggered (~{predictionResult.surplus_meals} meals excess)
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        {predictionResult.surplus_message}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDonationModalOpen(true)}
                    className="btn btn-primary"
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      background: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
                      alignSelf: 'center'
                    }}
                  >
                    <HeartHandshake size={14} />
                    <span>Route Donation</span>
                  </button>
                </div>
              )}

              {/* Dynamic Recipe Ingredient Requirements */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.65rem'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Boxes size={14} color="var(--accent-secondary)" />
                    Required Ingredients ({predictionResult.food_category})
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Coins size={14} /> Est. Cost: ₹{predictionResult.total_estimated_ingredient_cost?.toLocaleString()}
                  </span>
                </div>

                <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Required Qty</th>
                        <th>In Stock</th>
                        <th>Additional Needed</th>
                        <th>Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictionResult.ingredients?.map((ing, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{ing.ingredient_name}</td>
                          <td>{ing.required_quantity} {ing.unit}</td>
                          <td>{ing.current_inventory} {ing.unit}</td>
                          <td>
                            {ing.additional_required > 0 ? (
                              <span style={{ color: '#FB7185', fontWeight: 700 }}>
                                +{ing.additional_required} {ing.unit}
                              </span>
                            ) : (
                              <span style={{ color: '#34D399' }}>Sufficient</span>
                            )}
                          </td>
                          <td>₹{ing.estimated_cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: 'var(--text-muted)'
            }}>
              <BrainCircuit size={48} strokeWidth={1.5} color="#334155" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                No Prediction Generated Yet
              </div>
              <p style={{ fontSize: '0.8rem', maxWidth: '300px', marginTop: '0.35rem' }}>
                Select your service scenario on the left and click "Calculate Food Demand" to run the ML model.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feature 8: Historical Predictions Log with Actual vs Predicted Tracking */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Historical Prediction Logs & Actual Evaluation
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Easily update parameters, record actual consumption ground-truth, or delete outdated logs.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

            <button onClick={fetchHistory} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="input-field"
                value={historyCategory}
                onChange={(e) => { setHistoryCategory(e.target.value); setPage(1); }}
                style={{ width: '160px', height: '36px' }}
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={historyColumns}
          data={predictionHistory}
          total={totalHistory}
          page={page}
          pageSize={8}
          onPageChange={setPage}
          emptyMessage="No historical predictions found"
        />
      </div>

      {/* Edit Prediction Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Historical Prediction #${editingPrediction?.id}`}
        maxWidth="580px"
      >
        <form onSubmit={handleSaveEdit}>
          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Service Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={editFormData.prediction_date}
                onChange={(e) => setEditFormData({ ...editFormData, prediction_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Food Category</label>
              <select
                className="form-control"
                value={editFormData.food_category}
                onChange={(e) => setEditFormData({ ...editFormData, food_category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Expected Customers</label>
              <input
                type="number"
                required
                min="1"
                className="form-control"
                value={editFormData.expected_customers}
                onChange={(e) => setEditFormData({ ...editFormData, expected_customers: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Predicted Demand</label>
              <input
                type="number"
                required
                min="1"
                className="form-control"
                value={editFormData.predicted_demand}
                onChange={(e) => setEditFormData({ ...editFormData, predicted_demand: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Recommended Prep</label>
              <input
                type="number"
                required
                min="1"
                className="form-control"
                value={editFormData.recommended_preparation}
                onChange={(e) => setEditFormData({ ...editFormData, recommended_preparation: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              <span>Update Prediction</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Actual Consumed Modal */}
      <Modal
        isOpen={isActualModalOpen}
        onClose={() => setIsActualModalOpen(false)}
        title={`Record Actual Consumption - ${evaluatingPrediction?.food_category}`}
        maxWidth="480px"
      >
        <form onSubmit={handleSaveActual}>
          <div style={{
            padding: '0.85rem',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '0.5rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem'
          }}>
            <div><b>Date:</b> {evaluatingPrediction?.prediction_date} ({evaluatingPrediction?.day_of_week})</div>
            <div><b>Forecasted Demand:</b> {evaluatingPrediction?.predicted_demand} meals</div>
            <div><b>Recommended Prep:</b> {evaluatingPrediction?.recommended_preparation} meals</div>
          </div>

          <div className="form-group">
            <label className="form-label">Actual Food Consumed by Customers (Meals)</label>
            <input
              type="number"
              required
              min="0"
              className="form-control"
              placeholder="e.g. 435"
              value={actualConsumedInput}
              onChange={(e) => setActualConsumedInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsActualModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingActual}
              className="btn btn-primary"
            >
              <Check size={16} />
              <span>{savingActual ? 'Evaluating...' : 'Save & Calculate Accuracy'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Single Prediction Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Prediction Log Deletion"
        maxWidth="460px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Are you sure you want to delete prediction log #{deleteConfirmPred?.id} ({deleteConfirmPred?.food_category} on {deleteConfirmPred?.prediction_date})?
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
            <span>Delete Prediction</span>
          </button>
        </div>
      </Modal>

      {/* Bulk Delete Predictions Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Confirm Bulk Deletion"
        maxWidth="460px"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Are you sure you want to delete <b>{selectedIds.length}</b> historical predictions? This action cannot be undone.
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
            <span>{isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Predictions`}</span>
          </button>
        </div>
      </Modal>

      {/* Donation Modal from Simulator */}
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
              Pickup notification sent to <b>{donationPartner}</b>.
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
              <b>Detected Surplus:</b> ~{predictionResult?.surplus_meals} excess meals of {predictionResult?.food_category}
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
                onClick={handleDispatchSimulatorDonation}
                className="btn btn-primary"
              >
                <Send size={15} />
                <span>Confirm & Dispatch Pickup</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Predictions;
