import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Flame, 
  Sun, 
  Calendar, 
  Award, 
  Sparkles,
  Zap,
  Layers,
  Lightbulb,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
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

const Analytics = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/analytics');
        setInsights(response.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>AI Demand & Operational Analytics</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Deep machine learning statistical insights into consumption patterns, food category performance, and peak demand triggers.
        </p>
      </div>

      {/* AI Key Insights Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <DashboardCard
          title="Highest Demand Category"
          value={insights?.highest_demand_food || 'N/A'}
          subtitle="Top historical consumer volume"
          icon={Flame}
          accentColor="emerald"
        />
        <DashboardCard
          title="Peak Demand Day"
          value={insights?.peak_demand_day || 'N/A'}
          subtitle="Highest average daily volume"
          icon={Calendar}
          accentColor="cyan"
        />
        <DashboardCard
          title="Average Daily Demand"
          value={`${insights?.average_daily_demand || 0} meals`}
          subtitle="Baseline demand per service"
          icon={TrendingUp}
          accentColor="purple"
        />
        <DashboardCard
          title="Highest Waste Hotspot"
          value={insights?.most_wasted_category || 'N/A'}
          subtitle="Target for buffer optimization"
          icon={Zap}
          accentColor="rose"
        />
      </div>

      {/* Feature 11: Dynamic Smart Wastage Insights */}
      {insights?.smart_insights?.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Lightbulb size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI Smart Operational Recommendations</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {insights.smart_insights.map((item, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                    {item.title}
                  </span>
                  <span className={`badge ${item.severity === 'Warning' ? 'badge-amber' : item.severity === 'Action' ? 'badge-rose' : 'badge-cyan'}`} style={{ fontSize: '10px' }}>
                    {item.type}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {item.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Visualizations */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Day of Week Demand Distribution */}
        <ChartCard
          title="Demand Distribution by Day of Week"
          subtitle="Average meals consumed per day across historical data"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={insights?.day_averages || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#131B2A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="avg_demand" name="Avg Demand (Meals)" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Weather Impact Analysis */}
        <ChartCard
          title="Weather Impact on Demand & Leftovers"
          subtitle="Correlation between atmospheric conditions and customer appetite"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={insights?.weather_demand_impact || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="weather" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#131B2A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="avg_demand" name="Avg Demand" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg_waste" name="Avg Leftover" fill="#F43F5E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Feature 10: Food Category Performance Master Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} color="#FBBF24" />
          <span>Food Category Performance Master (Database Derived)</span>
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Comprehensive statistics for Average Prepared, Consumed, Leftover, Wastage Rate, and efficiency ranking.
        </p>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Food Category</th>
                <th>Total Records</th>
                <th>Avg Prepared</th>
                <th>Avg Consumed (Demand)</th>
                <th>Avg Leftover</th>
                <th>Wastage %</th>
                <th>Efficiency Rating</th>
              </tr>
            </thead>
            <tbody>
              {insights?.category_performance?.map((cat, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700 }}><span className="badge badge-cyan">{cat.food_category}</span></td>
                  <td>{cat.number_of_records} logs</td>
                  <td>{cat.average_prepared} meals</td>
                  <td style={{ fontWeight: 700, color: '#34D399' }}>{cat.average_consumed} meals</td>
                  <td style={{ color: cat.average_leftover > 25 ? '#FB7185' : 'var(--text-secondary)' }}>
                    {cat.average_leftover} meals
                  </td>
                  <td style={{ fontWeight: 600, color: cat.wastage_percentage > 6 ? '#FB7185' : 'var(--text-primary)' }}>
                    {cat.wastage_percentage}%
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, maxWidth: '90px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${cat.efficiency_rate}%`, height: '100%', background: cat.efficiency_rate > 93 ? '#10B981' : '#F59E0B' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{cat.efficiency_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
