import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  Trash2,
  Globe,
  Phone,
  Mail,
  Laptop,
  Activity,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { UserProfile, UserRole } from '../types/security';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    data: adminData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin_users'],
    queryFn: api.getAdminUsers,
    enabled: isOpen,
    refetchInterval: 8000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api.updateUserRole(userId, role),
    onSuccess: (res) => {
      setStatusMessage({ type: 'success', text: res.message || 'User role updated successfully.' });
      qc.invalidateQueries({ queryKey: ['admin_users'] });
      setTimeout(() => setStatusMessage(null), 3500);
    },
    onError: (err: any) => {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update user role.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: (res) => {
      setStatusMessage({ type: 'success', text: res.message || 'User removed successfully.' });
      qc.invalidateQueries({ queryKey: ['admin_users'] });
      setTimeout(() => setStatusMessage(null), 3500);
    },
    onError: (err: any) => {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete user.' });
    },
  });

  if (!isOpen) return null;

  const users = adminData?.users || [];
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.country || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  const onlineCount = users.filter((u) => u.isOnline).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-mgmt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="user-mgmt-title" className="text-base font-bold text-slate-900">
                  User Directory &amp; Role Authority
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Master Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Oversee all registered fleet accounts, inspect active app sessions, and assign security clearances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats & Search Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong>{onlineCount}</strong> Active / Online Now
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Enrolled: <strong>{users.length}</strong>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, country…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Alert Notification */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">No matching user accounts found</p>
              <p className="text-xs text-slate-500">New users who register via the portal will appear here.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User &amp; Status</th>
                    <th className="py-3 px-4">Contact &amp; Location</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">Role Clearance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === currentUserId || user.role === 'ADMIN';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name & Active Online Status */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                {(user.fullName || 'U')[0].toUpperCase()}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                  user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                                title={user.isOnline ? 'Active Online Now' : 'Offline'}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="truncate max-w-[150px]">{user.fullName}</span>
                                {user.isVerified && (
                                  <span title="Email Verified">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <span
                                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                                    user.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                <span>{user.isOnline ? 'Using App Now' : 'Offline'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Country */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="text-slate-800 font-mono text-[11px] flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[170px]">{user.email}</span>
                            </div>
                            {(user.phone || user.country) && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                {user.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5 text-slate-400" />
                                    {user.phone}
                                  </span>
                                )}
                                {user.country && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5 text-slate-400" />
                                    {user.country}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Device */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
                            <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{user.deviceName || 'Personal PC'}</span>
                          </div>
                        </td>

                        {/* Role Assignment Dropdown */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role}
                              onChange={(e) =>
                                roleMutation.mutate({
                                  userId: user.id,
                                  role: e.target.value as UserRole,
                                })
                              }
                              disabled={roleMutation.isPending}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                user.role === 'ADMIN'
                                  ? 'bg-purple-50 text-purple-900 border-purple-200 font-bold'
                                  : user.role === 'SECURITY_ANALYST'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  : 'bg-blue-50 text-blue-900 border-blue-200'
                              }`}
                            >
                              <option value="SECURITY_ANALYST">Security Analyst (Default)</option>
                              <option value="AUDITOR">Compliance Auditor</option>
                              <option value="ADMIN">Master Administrator</option>
                            </select>
                          </div>
                        </td>

                        {/* Delete Action */}
                        <td className="py-3.5 px-4 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to revoke access for ${user.fullName}?`)) {
                                  deleteMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Revoke / Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Policy Notice */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Roles enforce strict Zero-Trust device privacy: non-admin users only view their own hardware.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
