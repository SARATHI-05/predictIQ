import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Award, 
  BarChart2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Edit2,
  Check,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const PredictionAccuracy = () => {
  const toast = useToast();

  const [metrics, setMetrics] = useState({
    total_evaluated_predictions: 0,
    overall_accuracy_percentage: 97.5,
    mean_absolute_percentage_error: 2.5,
    mean_absolute_error_meals: 10.4,
    category_accuracy_rankings: [],
    recent_accuracy_history: []
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Edit/Record Actual Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actualConsumedInput, setActualConsumedInput] = useState('');
  const [savingActual, setSavingActual] = useState(false);

  const fetchAccuracy = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/accuracy/summary');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load accuracy metrics:', err);
      toast.error('Failed to load prediction accuracy tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAccuracy = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/api/accuracy/sync');
      setMetrics(res.data.metrics);
      toast.success('Accuracy metrics synchronized with live predictions & food records!');
    } catch (err) {
      toast.error('Failed to synchronize accuracy data');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAccuracy();
  }, []);

  const handleOpenRecordActual = (item) => {
    setSelectedItem(item);
    setActualConsumedInput(item.actual_consumed || '');
    setIsRecordModalOpen(true);
  };

  const handleSaveActual = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const consumed = parseInt(actualConsumedInput);
    if (isNaN(consumed) || consumed < 0) {
      toast.error('Please enter a valid consumed meals count');
      return;
    }

    try {
      setSavingActual(true);
      if (selectedItem.prediction_id) {
        await api.put(`/api/predictions/${selectedItem.prediction_id}/actual`, {
          actual_consumed: consumed,
          prediction_date: selectedItem.date,
          food_category: selectedItem.food_category
        });
      }
      toast.success(`Updated actual consumption for ${selectedItem.food_category} (${consumed} meals)`);
      setIsRecordModalOpen(false);
      fetchAccuracy();
    } catch (err) {
      toast.error('Failed to save actual consumption');
    } finally {
      setSavingActual(false);
    }
  };

  const filteredHistory = selectedCategory === 'All' 
    ? (metrics.recent_accuracy_history || [])
    : (metrics.recent_accuracy_history || []).filter(h => h.food_category === selectedCategory);

  const getPerformanceBadge = (score) => {
    if (score >= 95) {
      return (
        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={12} /> Grade A+
        </span>
      );
    } else if (score >= 88) {
      return (
        <span className="badge badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Check size={12} /> Grade A
        </span>
      );
    } else if (score >= 75) {
      return <span className="badge badge-amber">Grade B</span>;
    } else {
      return <span className="badge badge-rose">Attention</span>;
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}>
              <Target size={22} color="#FFFFFF" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Continuous Prediction Accuracy Tracking</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Automated continuous evaluation comparing ML forecast models against actual recorded customer food consumption.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button className="btn btn-secondary" onClick={fetchAccuracy} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'pulse-indicator' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={handleSyncAccuracy} disabled={syncing}>
            <Zap size={15} className={syncing ? 'pulse-indicator' : ''} />
            <span>{syncing ? 'Syncing ML Models...' : 'Sync & Re-evaluate'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Overall Model Accuracy</span>
            <Award size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-primary)' }}>
            {metrics.overall_accuracy_percentage}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {metrics.total_evaluated_predictions} evaluated prediction records
          </div>
        </div>

        <div className="card glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Mean Percentage Error (MAPE)</span>
            <TrendingUp size={18} color="var(--accent-secondary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-secondary)' }}>
            {metrics.mean_absolute_percentage_error}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Low percentage variance against ground truth
          </div>
        </div>

        <div className="card glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Average Meal Deviation (MAE)</span>
            <BarChart2 size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-amber)' }}>
            {metrics.mean_absolute_error_meals} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>meals</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Mean Absolute Error per service
          </div>
        </div>
      </div>

      {/* Category Accuracy Rankings Leaderboard */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>Food Category Accuracy Leaderboard</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Breakdown of prediction precision and average meal error across all standard menu food categories.
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Food Category</th>
                <th>Accuracy Rating</th>
                <th>Average Error (Meals)</th>
                <th>Evaluation Count</th>
                <th>Performance Grade</th>
              </tr>
            </thead>
            <tbody>
              {metrics.category_accuracy_rankings?.map((cat, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{cat.category}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{cat.avg_accuracy}%</td>
                  <td>{cat.avg_error_meals} meals</td>
                  <td>{cat.evaluations_count} comparisons</td>
                  <td>
                    {getPerformanceBadge(cat.avg_accuracy)}
                  </td>
                </tr>
              ))}
              {(!metrics.category_accuracy_rankings || metrics.category_accuracy_rankings.length === 0) && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No category evaluations recorded yet. Run forecasts to populate the leaderboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Comparison Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
          Predicted Demand vs Actual Consumption Trajectory
        </h3>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={filteredHistory.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip 
                contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFFFFF' }}
              />
              <Legend />
              <Line type="monotone" dataKey="predicted_demand" name="Predicted Demand" stroke="#0D7F54" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="actual_consumed" name="Actual Consumed" stroke="#0284C7" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Predicted vs Actual Log History</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cross-referenced historical forecast vs customer consumption records</p>
          </div>
          <select
            className="input-field"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: '180px', height: '38px' }}
          >
            <option value="All">All Categories</option>
            {metrics.category_accuracy_rankings?.map(c => (
              <option key={c.category} value={c.category}>{c.category}</option>
            ))}
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Predicted Demand</th>
                <th>Actual Consumed</th>
                <th>Error (Meals)</th>
                <th>Percentage Error</th>
                <th>Accuracy Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((h, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{h.date}</td>
                  <td><span className="badge badge-cyan">{h.food_category}</span></td>
                  <td style={{ fontWeight: 600 }}>{h.predicted_demand} meals</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{h.actual_consumed} meals</td>
                  <td style={{ color: h.error > 0 ? 'var(--accent-amber)' : (h.error < 0 ? 'var(--accent-rose)' : 'var(--accent-primary)'), fontWeight: 600 }}>
                    {h.error > 0 ? `+${h.error}` : h.error} meals
                  </td>
                  <td>{h.percentage_error}%</td>
                  <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {h.accuracy_score}%
                  </td>
                  <td>
                    <button
                      onClick={() => handleOpenRecordActual(h)}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.725rem' }}
                      title="Update or calibrate actual consumption"
                    >
                      <Edit2 size={12} />
                      <span>Adjust</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                    No prediction evaluations found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Actual Consumed Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={`Adjust Actual Consumption - ${selectedItem?.food_category}`}
        maxWidth="480px"
      >
        <form onSubmit={handleSaveActual}>
          <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div><b>Service Date:</b> {selectedItem?.date}</div>
            <div><b>AI Predicted Demand:</b> {selectedItem?.predicted_demand} meals</div>
          </div>

          <div className="form-group">
            <label className="form-label">Actual Food Consumed (Meals)</label>
            <input
              type="number"
              required
              min="0"
              className="form-control"
              placeholder="e.g. 420"
              value={actualConsumedInput}
              onChange={(e) => setActualConsumedInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
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
              <span>{savingActual ? 'Recalculating...' : 'Save & Recalculate'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PredictionAccuracy;
