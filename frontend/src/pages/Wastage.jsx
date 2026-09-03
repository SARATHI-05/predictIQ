import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  TrendingDown, 
  AlertTriangle, 
  Utensils, 
  ChefHat, 
  HeartHandshake, 
  PieChart as PieIcon,
  ShieldCheck,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import api from '../services/api';
import DashboardCard from '../components/DashboardCard';
import ChartCard from '../components/ChartCard';

const Wastage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWastage = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/wastage');
        setData(response.data);
      } catch (err) {
        console.error('Failed to load wastage data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWastage();
  }, []);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Food Wastage & Surplus Analysis</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Monitor historical leftover trends, category-level food waste percentages, and derive dynamic AI recommendations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <DashboardCard
          title="Total Prepared"
          value={`${data?.total_prepared?.toLocaleString() || 0} meals`}
          subtitle="Cumulative historical"
          icon={ChefHat}
          accentColor="cyan"
        />
        <DashboardCard
          title="Total Consumed"
          value={`${data?.total_consumed?.toLocaleString() || 0} meals`}
          subtitle="Direct customer intake"
          icon={Utensils}
          accentColor="emerald"
        />
        <DashboardCard
          title="Total Leftovers"
          value={`${data?.total_wastage?.toLocaleString() || 0} meals`}
          subtitle="Cumulative food surplus"
          icon={Trash2}
          accentColor="rose"
        />
        <DashboardCard
          title="Wastage Rate"
          value={`${data?.overall_wastage_percentage || 0}%`}
          subtitle="Target threshold: < 5.0%"
          icon={TrendingDown}
          trend={data?.overall_wastage_percentage > 6 ? "High Variance" : "Controlled"}
          trendType={data?.overall_wastage_percentage > 6 ? "negative" : "positive"}
          accentColor={data?.overall_wastage_percentage > 6 ? "rose" : "amber"}
        />
      </div>

      {/* Feature 11: Dynamic Smart Wastage Insights from Database */}
      {data?.smart_insights?.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Lightbulb size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI Smart Wastage Recommendations</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {data.smart_insights.map((insight, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {insight.title}
                    </span>
                    <span
                      className={`badge ${
                        insight.severity === 'Warning' ? 'badge-amber' : insight.severity === 'Action' ? 'badge-rose' : 'badge-cyan'
                      }`}
                      style={{ fontSize: '10.5px' }}
                    >
                      {insight.type}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {insight.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Daily Wastage Trend */}
        <ChartCard
          title="Daily Leftover Trend (Last 30 Days)"
          subtitle="Tracking food prepared vs leftover quantity over time"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.daily_wastage_trend || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: '#FFFFFF' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="leftover" name="Leftovers (Waste)" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#wasteGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Wastage Rate */}
        <ChartCard
          title="Wastage Percentage by Food Category"
          subtitle="Percentage of prepared meals that resulted in surplus/leftover"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.category_wastage || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="category" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} unit="%" />
              <Tooltip
                contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: '#FFFFFF' }}
                formatter={(val) => [`${val}%`, 'Wastage Rate']}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="wastage_percent" name="Wastage %" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Prevention & Donation Strategy Box */}
      <div className="card" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)', border: '1px solid #A7F3D0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <HeartHandshake size={24} color="#34D399" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI Food Waste Reduction & Redistribution Protocol</h3>
        </div>

        <div className="grid-cols-3" style={{ gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ background: '#F9FAFB', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={16} color="var(--brand-primary)" />
              1. Dynamic Safety Buffer
            </div>
            <p>
              PredictIQ automatically applies a 5% to 8% safety cushion tailored to specific food shelf-lives rather than blanket over-preparation.
            </p>
          </div>

          <div style={{ background: '#F9FAFB', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertTriangle size={16} color="#D97706" />
              2. Proactive Surplus Thresholds
            </div>
            <p>
              When scheduled production exceeds ML predicted demand by 25+ meals, high-priority surplus notifications alert the kitchen manager.
            </p>
          </div>

          <div style={{ background: '#F9FAFB', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <HeartHandshake size={16} color="#0284C7" />
              3. NGO Donation Routing
            </div>
            <p>
              Certified food recovery partners are automatically queued for surplus food dispatch, preventing edible leftovers from reaching landfills.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wastage;
