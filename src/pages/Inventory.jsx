import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, Plus, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  TrendingDown, ShoppingCart, RefreshCw, Download, Search, CheckCircle, Edit2, Trash2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

const CATEGORIES = ['All', 'Grains', 'Pulses', 'Oils', 'Protein', 'Vegetables', 'Ready Mix', 'Spices', 'Dairy', 'Essentials'];

const Inventory = () => {
  const { token, user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'Admin';

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total_items: 0, total_valuation: 0, low_stock_count: 0, low_stock_items: [] });
  const [purchaseRecs, setPurchaseRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'recommendations'

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form States
  const [newItem, setNewItem] = useState({
    ingredient_name: '',
    category: 'Grains',
    unit: 'kg',
    current_stock: 50.0,
    min_stock_level: 20.0,
    max_stock_level: 500.0,
    unit_cost: 50.0,
    supplier: 'Local Wholesale Mandi'
  });

  const [adjustData, setAdjustData] = useState({
    quantity: 10.0,
    transaction_type: 'IN',
    reason: 'Restock Shipment Received'
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [itemsRes, sumRes, recRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/inventory?category=${selectedCategory}&search=${search}`, { headers }),
        axios.get('http://127.0.0.1:8000/api/inventory/summary', { headers }),
        axios.get('http://127.0.0.1:8000/api/inventory/purchase-recommendations', { headers })
      ]);
      setItems(itemsRes.data);
      setSummary(sumRes.data);
      setPurchaseRecs(recRes.data);
    } catch (err) {
      toast.error('Failed to load inventory stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory, search]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('http://127.0.0.1:8000/api/inventory', newItem, { headers });
      toast.success(`Added ${newItem.ingredient_name} to inventory!`);
      setShowAddModal(false);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add inventory item');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `http://127.0.0.1:8000/api/inventory/${selectedItem.id}/adjust`,
        adjustData,
        { headers }
      );
      toast.success(`Updated stock for ${selectedItem.ingredient_name}`);
      setShowAdjustModal(false);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to adjust stock');
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from inventory?`)) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`http://127.0.0.1:8000/api/inventory/${id}`, { headers });
      toast.success(`Removed ${name} from inventory`);
      fetchInventory();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: 'var(--accent-primary)' }}>
              <Package size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Real-Time Inventory & Procurement</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Track live ingredient stock, detect critical supply shortages, and generate automated purchase recommendations
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchInventory}>
            <RefreshCw size={16} /> Refresh
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Ingredient
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Total Tracked Items</span>
            <Package size={18} color="var(--accent-secondary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {summary.total_items}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across {CATEGORIES.length - 1} ingredient categories
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Total Stock Valuation</span>
            <ArrowUpRight size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-primary)' }}>
            ₹{summary.total_valuation?.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Calculated at current supplier unit costs
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: `1px solid ${summary.low_stock_count > 0 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-color)'}`, borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Low Stock Items</span>
            <AlertTriangle size={18} color={summary.low_stock_count > 0 ? 'var(--accent-rose)' : 'var(--accent-primary)'} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: summary.low_stock_count > 0 ? 'var(--accent-rose)' : 'var(--accent-primary)' }}>
            {summary.low_stock_count}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {summary.low_stock_count > 0 ? 'Items below reorder threshold' : 'All stock levels optimal'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Active Purchase Needs</span>
            <ShoppingCart size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-amber)' }}>
            {purchaseRecs.filter(r => r.recommended_purchase_quantity > 0).length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Calculated from predicted batch demand
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {summary.low_stock_count > 0 && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#F43F5E" />
            <div>
              <div style={{ fontWeight: 700, color: '#F43F5E', fontSize: '0.95rem' }}>
                Critical Supply Shortfall Detected ({summary.low_stock_count} Items)
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                The following ingredients are below safety minimum: {summary.low_stock_items?.map(i => `${i.ingredient_name} (${i.current_stock} ${i.unit})`).join(', ')}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => setActiveTab('recommendations')}
            style={{ fontSize: '0.85rem', borderColor: '#F43F5E', color: '#F43F5E' }}
          >
            View Purchase Order
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stock')}
          style={{ borderRadius: '8px' }}
        >
          <Package size={16} /> Live Stock Master ({items.length})
        </button>
        <button
          className={`btn ${activeTab === 'recommendations' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recommendations')}
          style={{ borderRadius: '8px' }}
        >
          <ShoppingCart size={16} /> Automated Purchase Recommendations ({purchaseRecs.length})
        </button>
      </div>

      {activeTab === 'stock' ? (
        <>
          {/* Controls: Search & Category Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search ingredient or supplier..."
                  className="input-field"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '36px', height: '40px', width: '100%' }}
                />
              </div>

              <select
                className="input-field"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ width: '180px', height: '40px' }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Inventory Items Table */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ingredient Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Safety Min</th>
                    <th>Max Cap</th>
                    <th>Unit Cost</th>
                    <th>Total Value</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Loading inventory data...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No inventory items found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isLow = item.current_stock <= item.min_stock_level;
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.ingredient_name}</td>
                          <td><span className="badge badge-secondary">{item.category}</span></td>
                          <td style={{ fontWeight: 700, color: isLow ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                            {item.current_stock} {item.unit}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{item.min_stock_level} {item.unit}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{item.max_stock_level} {item.unit}</td>
                          <td>₹{item.unit_cost} / {item.unit}</td>
                          <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                            ₹{(item.current_stock * item.unit_cost).toLocaleString()}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.supplier || 'N/A'}</td>
                          <td>
                            {isLow ? (
                              <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> Low Stock
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={12} /> Stocked
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn btn-secondary"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setAdjustData({ quantity: 10.0, transaction_type: 'IN', reason: 'Stock replenishment' });
                                  setShowAdjustModal(true);
                                }}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                title="Adjust Stock"
                              >
                                Adjust
                              </button>
                              {isAdmin && (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleDeleteItem(item.id, item.ingredient_name)}
                                  style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--accent-rose)' }}
                                  title="Delete Item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Purchase Recommendations View (Feature 14) */
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Smart Procurement Engine</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Formula: <code>Recommended Purchase = max(0, Batch Demand + Safety Min Stock - Current Available Stock)</code>
            </p>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Food Category</th>
                  <th>Current Stock</th>
                  <th>Batch Demand</th>
                  <th>Safety Min</th>
                  <th>Recommended Order</th>
                  <th>Unit Cost</th>
                  <th>Estimated Cost</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {purchaseRecs.map((rec, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{rec.ingredient_name}</td>
                    <td><span className="badge badge-secondary">{rec.food_category}</span></td>
                    <td>{rec.current_stock} {rec.unit}</td>
                    <td>{rec.standard_batch_demand} {rec.unit}</td>
                    <td>{rec.min_stock_level} {rec.unit}</td>
                    <td style={{ fontWeight: 700, color: rec.recommended_purchase_quantity > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                      {rec.recommended_purchase_quantity} {rec.unit}
                    </td>
                    <td>₹{rec.unit_cost}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      ₹{rec.estimated_total_cost.toLocaleString()}
                    </td>
                    <td>
                      {rec.urgency === 'Urgent' ? (
                        <span className="badge badge-danger">Urgent Reorder</span>
                      ) : rec.urgency === 'Moderate' ? (
                        <span className="badge badge-warning">Procure Next</span>
                      ) : (
                        <span className="badge badge-success">Adequate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Inventory Item */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Ingredient to Stock Master">
        <form onSubmit={handleAddItem}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingredient Name</label>
              <input
                type="text"
                required
                className="input-field"
                value={newItem.ingredient_name}
                onChange={(e) => setNewItem({ ...newItem, ingredient_name: e.target.value })}
                placeholder="e.g. Basmati Rice"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Category</label>
              <select
                className="input-field"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Initial Stock</label>
              <input
                type="number"
                step="any"
                required
                className="input-field"
                value={newItem.current_stock}
                onChange={(e) => setNewItem({ ...newItem, current_stock: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Unit</label>
              <select
                className="input-field"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              >
                <option value="kg">kg</option>
                <option value="liters">liters</option>
                <option value="units">units</option>
                <option value="packets">packets</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Unit Cost (₹)</label>
              <input
                type="number"
                step="any"
                required
                className="input-field"
                value={newItem.unit_cost}
                onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Safety Min Threshold</label>
              <input
                type="number"
                step="any"
                required
                className="input-field"
                value={newItem.min_stock_level}
                onChange={(e) => setNewItem({ ...newItem, min_stock_level: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Supplier / Vendor</label>
              <input
                type="text"
                className="input-field"
                value={newItem.supplier}
                onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Ingredient</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Stock */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={`Adjust Stock: ${selectedItem?.ingredient_name}`}>
        <form onSubmit={handleAdjustStock}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Transaction Type</label>
            <select
              className="input-field"
              value={adjustData.transaction_type}
              onChange={(e) => setAdjustData({ ...adjustData, transaction_type: e.target.value })}
            >
              <option value="IN">Restock (+) - Received inventory shipment</option>
              <option value="OUT">Dispense (-) - Sent to kitchen prep</option>
              <option value="ADJUSTMENT">Direct Count Set (=) - Physical audit adjustment</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Quantity ({selectedItem?.unit})
            </label>
            <input
              type="number"
              step="any"
              required
              className="input-field"
              value={adjustData.quantity}
              onChange={(e) => setAdjustData({ ...adjustData, quantity: parseFloat(e.target.value) })}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Reason / Reference</label>
            <input
              type="text"
              required
              className="input-field"
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              placeholder="e.g. Weekly wholesale restock shipment"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Record Adjustment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
