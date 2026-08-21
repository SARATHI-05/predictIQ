import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Utensils, 
  TrendingUp, 
  Trash2, 
  Users, 
  ChefHat, 
  Sparkles, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Layers,
  Calendar,
  Package,
  Target,
  Cpu,
  Server,
  Database,
  CheckCircle,
  Bell
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import api from '../services/api';
import DashboardCard from '../components/DashboardCard';
import ChartCard from '../components/ChartCard';
import AlertCard from '../components/AlertCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useISTClock } from '../utils/timeUtils';
import { Clock } from 'lucide-react';


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(19, 27, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ fontSize: '0.8rem', color: entry.color, fontWeight: 600, margin: '0.15rem 0' }}>
            {entry.name}: {entry.value} meals
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { fullIST } = useISTClock();
  const [summary, setSummary] = useState(null);

  const [trends, setTrends] = useState(null);
  const [activities, setActivities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, trendsRes, actRes] = await Promise.all([
        api.get('/api/dashboard/summary'),
        api.get('/api/dashboard/trends'),
        api.get('/api/dashboard/recent-activities')
      ]);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setActivities(actRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load live dashboard feed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);


  const handleMarkAlertRead = async (alertId) => {
    // Optimistically remove from visible alerts immediately
    setActivities((prev) => prev ? {
      ...prev,
      recent_alerts: prev.recent_alerts?.filter((a) => a.id !== alertId)
    } : prev);

    try {
      await api.put(`/api/alerts/${alertId}/read`);
      toast.success('Alert resolved and dismissed');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update alert');
      fetchDashboardData();
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Operations & Demand Intelligence
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Real-time AI demand forecasts, live inventory monitoring, continuous accuracy tracking, and surplus alert dispatch.
          </p>
        </div>


        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchDashboardData}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem' }}
          >
            <RefreshCw size={14} className={loading ? 'pulse-indicator' : ''} />
            <span>Refresh Feed</span>
          </button>
          <Link to="/predictions" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
            <Sparkles size={14} />
            <span>Run New Prediction</span>
          </Link>
        </div>
      </div>

      {/* Connection Notice / Error State */}
      {error && !summary && !loading && (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.75rem', borderColor: 'rgba(244, 63, 94, 0.35)', background: 'rgba(244, 63, 94, 0.04)' }}>
          <AlertTriangle size={36} color="#F43F5E" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Unable to load live dashboard feed
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '520px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
            Please check your network connection or verify that the backend API URL is configured correctly.
          </p>
          <button onClick={fetchDashboardData} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <RefreshCw size={15} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Primary KPI Cards Grid (Row 1) */}
      <div className="grid-cols-4" style={{ marginBottom: '1.25rem' }}>

        <DashboardCard
          title="Predicted Demand"
          value={`${summary?.today_predicted_demand || 0} meals`}
          subtitle="AI ML Model Forecast"
          icon={TrendingUp}
          trend="+5.4% vs avg"
          trendType="positive"
          accentColor="emerald"
        />
        <DashboardCard
          title="Recommended Prep"
          value={`${summary?.today_recommended_prep || 0} meals`}
          subtitle="With 6% safety buffer"
          icon={ChefHat}
          accentColor="cyan"
        />
        <DashboardCard
          title="Actual Consumption"
          value={`${summary?.today_consumption || 0} meals`}
          subtitle="Total consumed today"
          icon={Utensils}
          accentColor="purple"
        />
        <DashboardCard
          title="Estimated Wastage"
          value={`${summary?.estimated_wastage_pct || 0}%`}
          subtitle={`${summary?.today_leftover || 0} meals leftover`}
          icon={Trash2}
          trend={summary?.estimated_wastage_pct > 8 ? "High Waste" : "Optimal"}
          trendType={summary?.estimated_wastage_pct > 8 ? "negative" : "positive"}
          accentColor={summary?.estimated_wastage_pct > 8 ? "rose" : "amber"}
        />
      </div>

      {/* Secondary KPI Cards Grid (Row 2 - Feature 16 Enhancements) */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Prediction Accuracy</span>
            <Target size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--accent-primary)' }}>
            {summary?.prediction_accuracy || 97.5}%
          </div>
          {user?.role === 'Admin' ? (
            <Link to="/prediction-accuracy" style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '0.35rem' }}>
              View accuracy tracker <ArrowRight size={12} />
            </Link>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '0.35rem' }}>
              Live model evaluation
            </span>
          )}
        </div>

        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Highest Wastage Category</span>
            <Trash2 size={18} color="var(--accent-rose)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--accent-rose)' }}>
            {summary?.high_wastage_category || 'Biryani'}
          </div>
          <Link to="/wastage" style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '0.35rem' }}>
            Inspect waste insights <ArrowRight size={12} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Low Stock Items</span>
            <Package size={18} color={summary?.low_stock_items_count > 0 ? "var(--accent-rose)" : "var(--accent-primary)"} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: summary?.low_stock_items_count > 0 ? "var(--accent-rose)" : "var(--accent-primary)" }}>
            {summary?.low_stock_items_count || 0} items
          </div>
          <Link to="/inventory" style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '0.35rem' }}>
            Manage inventory <ArrowRight size={12} />
          </Link>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Pending Alerts</span>
            <Bell size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--accent-amber)' }}>
            {summary?.pending_alerts_count || 0} active
          </div>
          <Link to="/notifications" style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '0.35rem' }}>
            Open alert center <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Actual vs Predicted Trend */}
        <ChartCard
          title="Actual Consumption vs AI Predicted Demand"
          subtitle="14-day historical trend comparing ML prediction accuracy against consumption"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends?.demand_trend || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area type="monotone" dataKey="actual_consumed" name="Actual Consumed" stroke="#38BDF8" strokeWidth={2.5} fillOpacity={1} fill="url(#actGrad)" />
              <Area type="monotone" dataKey="predicted_demand" name="Predicted Demand" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#predGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Demand Distribution */}
        <ChartCard
          title="Food Demand by Category"
          subtitle="Cumulative food preparation and consumed demand per category"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends?.category_demand || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="category" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="rect" />
              <Bar dataKey="consumed" name="Consumed" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prepared" name="Prepared" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leftover" name="Leftover (Waste)" fill="#F43F5E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom Activities & Alerts Row */}
      <div className="grid-cols-3">
        {/* Active Alerts */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="#F43F5E" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Surplus & Stock Alerts</h3>
            </div>
            <Link to="/alerts" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              View All
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {activities?.recent_alerts?.slice(0, 3).map((a) => (
              <AlertCard key={a.id} alert={a} onMarkRead={handleMarkAlertRead} />
            ))}
            {(!activities?.recent_alerts || activities.recent_alerts.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                All clear! No pending surplus alerts.
              </div>
            )}
          </div>
        </div>

        {/* Recent ML Predictions */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--accent-secondary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Latest Predictions</h3>
            </div>
            <Link to="/predictions" style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 600 }}>
              Simulator
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activities?.latest_predictions?.map((p) => (
              <div key={p.id} style={{
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.food_category}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {p.prediction_date} &bull; {p.expected_customers} Customers
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34D399' }}>
                    {p.predicted_demand} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>meals</span>
                  </div>
                  <span className={`badge ${p.demand_level === 'Peak' ? 'badge-rose' : p.demand_level === 'High' ? 'badge-amber' : 'badge-cyan'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                    {p.demand_level}
                  </span>
                </div>
              </div>
            ))}
            {(!activities?.latest_predictions || activities.latest_predictions.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No predictions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Food Logs */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Food Logs</h3>
            </div>
            <Link to="/food-records" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              View All
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activities?.recent_records?.map((r) => (
              <div key={r.id} style={{
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {r.food_category}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {r.date} &bull; {r.weather}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {r.food_consumed} / {r.food_prepared} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>consumed</span>
                  </div>
                  <div style={{ fontSize: '0.725rem', color: r.leftover > 30 ? '#FB7185' : '#34D399' }}>
                    {r.leftover} leftover
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
