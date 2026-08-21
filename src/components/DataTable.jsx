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
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <div className="pulse-indicator" style={{ fontSize: '1rem', fontWeight: 600 }}>Loading data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <Inbox size={40} strokeWidth={1.5} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="table-container">
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
          padding: '1rem 0.5rem 0',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div>
            Showing <b>{(page - 1) * pageSize + 1}</b> to <b>{Math.min(page * pageSize, total)}</b> of <b>{total}</b> entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', opacity: page <= 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', opacity: page >= totalPages ? 0.4 : 1 }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
