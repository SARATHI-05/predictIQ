import React, { useState } from 'react';
import { Search, Filter, RotateCcw, ChevronDown, ChevronUp, Calendar, Hash } from 'lucide-react';

const CATEGORIES = ['All', 'Meals', 'Biryani', 'Breakfast', 'Snacks', 'Dinner', 'Desserts'];

const AdvancedFilter = ({
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  categoryValue = 'All',
  onCategoryChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  minVal1 = '',
  onMinVal1Change,
  maxVal1 = '',
  onMaxVal1Change,
  label1 = 'Prepared Qty',
  minVal2 = '',
  onMinVal2Change,
  maxVal2 = '',
  onMaxVal2Change,
  label2 = 'Consumed Qty',
  onReset,
  extraFilters = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filter parameters
  let activeCount = 0;
  if (categoryValue && categoryValue !== 'All') activeCount++;
  if (startDate) activeCount++;
  if (endDate) activeCount++;
  if (minVal1 || maxVal1) activeCount++;
  if (minVal2 || maxVal2) activeCount++;
  if (searchValue) activeCount++;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-subtle)'
      }}
    >
      {/* Primary Bar: Search, Category, Expand Toggle, Reset */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', flex: 1, minWidth: '280px', gap: '0.75rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: '38px', height: '42px', width: '100%' }}
              aria-label="Search input"
            />
          </div>

          {/* Category Quick Selector */}
          {onCategoryChange && (
            <select
              className="input-field"
              value={categoryValue}
              onChange={(e) => onCategoryChange(e.target.value)}
              style={{ width: '160px', height: '42px' }}
              aria-label="Category filter"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '42px',
              position: 'relative'
            }}
            aria-expanded={isExpanded}
            aria-label="Toggle advanced filters"
          >
            <Filter size={16} />
            <span>Filters</span>
            {activeCount > 0 && (
              <span
                style={{
                  background: 'var(--accent-primary)',
                  color: '#0B0F17',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '999px',
                  padding: '1px 6px',
                  marginLeft: '2px'
                }}
              >
                {activeCount}
              </span>
            )}
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {activeCount > 0 && onReset && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '42px',
                color: 'var(--accent-rose)'
              }}
              title="Clear all filters"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Advanced Filter Drawer */}
      {isExpanded && (
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Date Range Start */}
          {onStartDateChange && (
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '6px'
                }}
              >
                <Calendar size={13} color="var(--accent-secondary)" /> Start Date
              </label>
              <input
                type="date"
                className="input-field"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                style={{ height: '38px' }}
              />
            </div>
          )}

          {/* Date Range End */}
          {onEndDateChange && (
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '6px'
                }}
              >
                <Calendar size={13} color="var(--accent-secondary)" /> End Date
              </label>
              <input
                type="date"
                className="input-field"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                style={{ height: '38px' }}
              />
            </div>
          )}

          {/* Metric 1 Min/Max Range */}
          {onMinVal1Change && onMaxVal1Change && (
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '6px'
                }}
              >
                <Hash size={13} color="var(--accent-primary)" /> {label1} Range
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  placeholder="Min"
                  className="input-field"
                  value={minVal1}
                  onChange={(e) => onMinVal1Change(e.target.value)}
                  style={{ height: '38px', flex: 1 }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="input-field"
                  value={maxVal1}
                  onChange={(e) => onMaxVal1Change(e.target.value)}
                  style={{ height: '38px', flex: 1 }}
                />
              </div>
            </div>
          )}

          {/* Metric 2 Min/Max Range */}
          {onMinVal2Change && onMaxVal2Change && (
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '6px'
                }}
              >
                <Hash size={13} color="var(--accent-amber)" /> {label2} Range
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  placeholder="Min"
                  className="input-field"
                  value={minVal2}
                  onChange={(e) => onMinVal2Change(e.target.value)}
                  style={{ height: '38px', flex: 1 }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="input-field"
                  value={maxVal2}
                  onChange={(e) => onMaxVal2Change(e.target.value)}
                  style={{ height: '38px', flex: 1 }}
                />
              </div>
            </div>
          )}

          {extraFilters}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
