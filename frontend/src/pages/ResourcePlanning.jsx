import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, 
  Calculator, 
  Plus, 
  Edit2, 
  Trash2, 
  Coins, 
  PackageCheck, 
  AlertCircle,
  Check,
  Search,
  AlertTriangle,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const ResourcePlanning = () => {
  const toast = useToast();
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState('All');
  const [calcCategory, setCalcCategory] = useState('Biryani');
  const [targetMeals, setTargetMeals] = useState(500);
  const [calcPlan, setCalcPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal State for Recipe Ingredient CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    food_category: 'Meals',
    ingredient_name: '',
    quantity_per_unit: '',
    unit: 'kg',
    cost_per_unit: '',
    current_inventory: ''
  });
  const [formError, setFormError] = useState('');

  const categories = ['Meals', 'Biryani', 'Breakfast', 'Snacks', 'Dinner', 'Desserts'];

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/resources', {
        params: { category: category !== 'All' ? category : undefined }
      });
      setResources(response.data);
    } catch (err) {
      console.error('Failed to load resources:', err);
      toast.error('Failed to load recipe resources');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (e) => {
    if (e) e.preventDefault();
    try {
      const response = await api.post('/api/resources/calculate-plan', {
        food_category: calcCategory,
        target_meals: parseInt(targetMeals)
      });
      setCalcPlan(response.data);
    } catch (err) {
      console.error('Failed to calculate resource plan:', err);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [category]);

  useEffect(() => {
    handleCalculate();
  }, [calcCategory, targetMeals]);

  const handleOpenAdd = () => {
    setEditingResource(null);
    setFormData({
      food_category: 'Meals',
      ingredient_name: '',
      quantity_per_unit: '',
      unit: 'kg',
      cost_per_unit: '',
      current_inventory: '50'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setEditingResource(res);
    setFormData({
      food_category: res.food_category,
      ingredient_name: res.ingredient_name,
      quantity_per_unit: res.quantity_per_unit,
      unit: res.unit,
      cost_per_unit: res.cost_per_unit,
      current_inventory: res.current_inventory
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = {
        food_category: formData.food_category,
        ingredient_name: formData.ingredient_name,
        quantity_per_unit: parseFloat(formData.quantity_per_unit),
        unit: formData.unit,
        cost_per_unit: parseFloat(formData.cost_per_unit),
        current_inventory: parseFloat(formData.current_inventory)
      };

      if (editingResource) {
        await api.put(`/api/resources/${editingResource.id}`, payload);
        toast.success(`Updated ingredient: ${formData.ingredient_name}`);
      } else {
        await api.post('/api/resources', payload);
        toast.success(`Added new recipe ingredient: ${formData.ingredient_name}`);
      }

      setIsModalOpen(false);
      fetchResources();
      handleCalculate();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save resource');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this recipe ingredient specification?')) {
      try {
        await api.delete(`/api/resources/${id}`);
        toast.success('Removed recipe ingredient');
        fetchResources();
        handleCalculate();
      } catch (err) {
        toast.error('Failed to delete ingredient');
      }
    }
  };

  // Feature 12: Detect shortages in calculation
  const shortageList = calcPlan?.ingredients?.filter(i => i.additional_required > 0) || [];

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Resource & Ingredient Planning</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Configure dynamic recipe ingredient ratios, calculate procurement requirements, and detect resource shortages.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Recipe Ingredient</span>
        </button>
      </div>

      {/* Feature 12: Resource Shortage Warning Banner */}
      {shortageList.length > 0 && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.09)',
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
                Resource Shortage Detected ({shortageList.length} Ingredients Lacking for {targetMeals} {calcCategory} Meals)
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Deficits: {shortageList.map(s => `${s.ingredient_name} (+${s.additional_required} ${s.unit})`).join(', ')}
              </div>
            </div>
          </div>
          <Link
            to="/inventory"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', borderColor: '#F43F5E', color: '#F43F5E', textDecoration: 'none' }}
          >
            <ShoppingCart size={15} /> Go to Inventory Restock
          </Link>
        </div>
      )}

      {/* Real-time Calculation Simulator Card */}
      <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-cyan)'
          }}>
            <Calculator size={20} color="#FFFFFF" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Ingredient Requirement Calculator</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimate raw material demand and procurement budget for any target meal size</p>
          </div>
        </div>

        <div className="grid-cols-3" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Food Category</label>
            <select
              className="form-control"
              value={calcCategory}
              onChange={(e) => setCalcCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Target Meal Quantity</label>
            <input
              type="number"
              min="1"
              max="10000"
              className="form-control"
              value={targetMeals}
              onChange={(e) => setTargetMeals(e.target.value)}
              placeholder="e.g. 500 meals"
            />
          </div>

          <div style={{
            background: '#F9FAFB',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Est. Procurement Budget
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38BDF8', marginTop: '0.2rem' }}>
                ₹{calcPlan?.total_estimated_cost?.toLocaleString() || 0}
              </div>
            </div>
            <Coins size={28} color="#38BDF8" />
          </div>
        </div>

        {/* Calculated Breakdown Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ingredient Name</th>
                <th>Qty / Meal</th>
                <th>Total Required</th>
                <th>In Stock Inventory</th>
                <th>Shortage (Need to Buy)</th>
                <th>Unit Cost</th>
                <th>Est. Line Cost</th>
              </tr>
            </thead>
            <tbody>
              {calcPlan?.ingredients?.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.ingredient_name}</td>
                  <td>{item.quantity_per_meal} {item.unit}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.required_quantity} {item.unit}
                  </td>
                  <td>{item.current_inventory} {item.unit}</td>
                  <td>
                    {item.additional_required > 0 ? (
                      <span className="badge badge-rose">
                        +{item.additional_required} {item.unit} Short
                      </span>
                    ) : (
                      <span className="badge badge-emerald">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td>₹{item.cost_per_unit}/{item.unit}</td>
                  <td style={{ fontWeight: 700, color: '#38BDF8' }}>
                    ₹{item.estimated_cost?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recipe Specifications Master Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Configurable Recipe Specifications</h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Manage ingredient formulas, units, current inventory and costs per category</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '180px' }}
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Ingredient</th>
                <th>Ratio per Meal</th>
                <th>Unit</th>
                <th>Cost / Unit</th>
                <th>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td><span className="badge badge-cyan">{r.food_category}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.ingredient_name}</td>
                  <td>{r.quantity_per_unit} {r.unit}</td>
                  <td>{r.unit}</td>
                  <td>₹{r.cost_per_unit}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: r.current_inventory < 30 ? '#FB7185' : '#34D399' }}>
                      {r.current_inventory} {r.unit}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.55rem' }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.55rem', color: '#FDA4AF' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Recipe Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingResource ? 'Edit Recipe Ingredient' : 'Add Recipe Ingredient'}
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
              <label className="form-label">Food Category</label>
              <select
                className="form-control"
                value={formData.food_category}
                onChange={(e) => setFormData({ ...formData, food_category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ingredient Name</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Basmati Rice"
                value={formData.ingredient_name}
                onChange={(e) => setFormData({ ...formData, ingredient_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Quantity per Meal</label>
              <input
                type="number"
                step="0.001"
                required
                min="0.001"
                className="form-control"
                placeholder="e.g. 0.080"
                value={formData.quantity_per_unit}
                onChange={(e) => setFormData({ ...formData, quantity_per_unit: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit of Measure</label>
              <select
                className="form-control"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="liters">liters (Liters)</option>
                <option value="grams">grams (Grams)</option>
                <option value="units">units (Count)</option>
              </select>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Cost per Unit (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                className="form-control"
                placeholder="e.g. 85.00"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Stock Inventory</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                className="form-control"
                placeholder="e.g. 150.0"
                value={formData.current_inventory}
                onChange={(e) => setFormData({ ...formData, current_inventory: e.target.value })}
              />
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
              <span>{editingResource ? 'Update Ingredient' : 'Add Ingredient'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResourcePlanning;
