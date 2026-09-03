import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

const DataTable = ({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  loading = false,
  emptyMessage = "No records found"
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
        <div className="pulse-indicator" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading live data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px dashed #E5E7EB',
        color: '#6B7280'
      }}>
        <Inbox size={36} color="#9CA3AF" strokeWidth={1.5} />
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ textAlign: col.align || 'left', width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={row.id || rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {total > pageSize && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1.25rem',
          fontSize: '0.8125rem',
          color: '#6B7280',
          borderTop: '1px solid var(--border-color)',
          background: '#FAFAFA'
        }}>
          <div>
            Showing <b>{(page - 1) * pageSize + 1}</b> to <b>{Math.min(page * pageSize, total)}</b> of <b>{total}</b> entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', opacity: page <= 1 ? 0.4 : 1, minHeight: '32px' }}
            >
              <ChevronLeft size={15} />
              <span>Previous</span>
            </button>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', opacity: page >= totalPages ? 0.4 : 1, minHeight: '32px' }}
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
