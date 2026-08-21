import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Shield, UserPlus, RefreshCw, Search, CheckCircle, XCircle, Activity, Lock, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { formatIST, formatISTDate } from '../utils/timeUtils';


const UserManagement = () => {
  const { token, user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Activity Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`http://127.0.0.1:8000/api/users?search=${search}&role=${roleFilter}`, { headers });
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleToggleStatus = async (userId, currentStatus, email) => {
    if (userId === currentUser?.id && currentStatus) {
      toast.warning('You cannot deactivate your own active session account.');
      return;
    }
    const newStatus = !currentStatus;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`http://127.0.0.1:8000/api/users/${userId}/status`, { is_active: newStatus }, { headers });
      toast.success(`User ${email} ${newStatus ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleRoleChange = async (userId, newRole, email) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`http://127.0.0.1:8000/api/users/${userId}/role`, { role: newRole }, { headers });
      toast.success(`Changed ${email} role to ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user role');
    }
  };

  const viewUserActivity = async (u) => {
    setSelectedUser(u);
    setLoadingActivity(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`http://127.0.0.1:8000/api/users/${u.id}/activity`, { headers });
      setActivityData(res.data);
    } catch (err) {
      toast.error('Failed to load user activity trail');
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleInitiateDelete = (u) => {
    if (u.id === currentUser?.id) {
      toast.warning('You cannot delete your own active admin account.');
      return;
    }
    setUserToDelete(u);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`http://127.0.0.1:8000/api/users/${userToDelete.id}`, { headers });
      toast.success(res.data?.message || `User ${userToDelete.email} removed successfully`);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px', color: 'var(--accent-purple)' }}>
              <Users size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>User Management & Access Control</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Administer employee credentials, role permissions (RBAC), account activation, and track user audit history
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={fetchUsers}>
          <RefreshCw size={16} /> Refresh Users
        </button>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by user name or email address..."
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px', width: '100%' }}
            />
          </div>

          <select
            className="input-field"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '160px', height: '40px' }}
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Activity Events</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No user accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <select
                        className="input-field"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value, u.email)}
                        style={{ height: '30px', padding: '2px 8px', fontSize: '12px', width: '100px' }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={12} /> Deactivated
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {u.last_login ? formatIST(u.last_login) : 'Never'}
                    </td>
                    <td>
                      <span className="badge badge-secondary">{u.activity_count} logged actions</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatISTDate(u.created_at)}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => viewUserActivity(u)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="View Audit Activity"
                        >
                          <Activity size={13} /> Activity
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleToggleStatus(u.id, u.is_active, u.email)}
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '12px', 
                            color: u.is_active ? 'var(--accent-amber)' : 'var(--accent-primary)' 
                          }}
                          title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleInitiateDelete(u)}
                          disabled={u.id === currentUser?.id}
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '12px', 
                            color: u.id === currentUser?.id ? 'var(--text-muted)' : 'var(--accent-rose)',
                            borderColor: u.id === currentUser?.id ? 'transparent' : 'rgba(244, 63, 94, 0.3)',
                            cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer'
                          }}
                          title={u.id === currentUser?.id ? 'Cannot delete own account' : 'Permanently Delete User'}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Details Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={`Audit Trail for ${selectedUser?.name} (${selectedUser?.email})`}
      >
        {loadingActivity ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading user activity records...
          </div>
        ) : activityData?.activities?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No recent activity recorded for this user.
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {activityData?.activities?.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td><span className="badge badge-primary">{a.action}</span></td>
                    <td><span className="badge badge-secondary">{a.module}</span></td>
                    <td style={{ fontSize: '12px' }}>{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={Boolean(userToDelete)}
        onClose={() => !deleting && setUserToDelete(null)}
        title="Confirm User Account Deletion"
        maxWidth="520px"
      >
        <div>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            alignItems: 'flex-start', 
            marginBottom: '1.25rem', 
            padding: '1rem', 
            background: 'rgba(244, 63, 94, 0.1)', 
            borderRadius: '10px', 
            border: '1px solid rgba(244, 63, 94, 0.25)' 
          }}>
            <div style={{ padding: '8px', background: 'rgba(244, 63, 94, 0.2)', borderRadius: '8px', color: 'var(--accent-rose)', flexShrink: 0 }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.25rem' }}>
                Permanent Deletion Warning
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Are you sure you want to permanently delete this user? This action cannot be undone and will immediately revoke all access and credentials.
              </p>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-input)', 
            padding: '1rem', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)', 
            marginBottom: '1.5rem', 
            fontSize: '0.875rem' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>User Name:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userToDelete?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{userToDelete?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assigned Role:</span>
              <span className={`badge ${userToDelete?.role === 'Admin' ? 'badge-cyan' : 'badge-emerald'}`} style={{ fontSize: '0.7rem' }}>
                {userToDelete?.role}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Account Status:</span>
              <span style={{ color: userToDelete?.is_active ? 'var(--accent-primary)' : 'var(--accent-rose)', fontWeight: 600 }}>
                {userToDelete?.is_active ? 'Active' : 'Deactivated'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setUserToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmDelete}
              disabled={deleting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete User Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;

