import { useEffect, useState } from 'react';
import { 
  Search, 
  Edit2, 
  Trash2, 
  User,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminLayout from '@/components/admin/AdminLayout';

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'customer' | 'admin';
  phone?: string;
  createdAt: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await usersAPI.delete(deleteId);
      setUsers(users.filter(u => u.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'customer' | 'admin') => {
    try {
      await usersAPI.update(userId, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setEditUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
    <AdminLayout title="Users">
      <div className="p-8 px-0 md:px-8">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fff4e9]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-12 pr-4 py-3 bg-[#2a3a4a] border border-[#fff4e9]/20 rounded-lg
                       text-[#fff4e9] placeholder-[#fff4e9]/40
                       focus:outline-none focus:border-[#fff4e9]/50"
            />
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-[#2a3a4a] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#fff4e9]/60">No users found</p>
            </div>
          ) : (
            <div className="bg-[#2a3a4a] rounded-lg overflow-hidden border border-[#fff4e9]/10">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#fff4e9]/10 bg-[#fff4e9]/5">
                      <th className="text-left px-6 py-4 text-sm font-medium text-[#fff4e9]">User</th>
                      <th className="hidden md:table-cell text-left px-6 py-4 text-sm font-medium text-[#fff4e9]">Role</th>
                      <th className="hidden md:table-cell text-left px-6 py-4 text-sm font-medium text-[#fff4e9]">Joined</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-[#fff4e9]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr 
                        key={u.id} 
                        className="border-b border-[#fff4e9]/10 last:border-0 hover:bg-[#fff4e9]/5 transition-colors cursor-pointer md:cursor-default"
                        onClick={() => {
                          if (window.innerWidth < 768) setEditUser(u);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#fff4e9]/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-[#fff4e9]/60" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[#fff4e9] truncate">
                                {u.firstName || u.lastName 
                                  ? `${u.firstName || ''} ${u.lastName || ''}`
                                  : 'Unnamed User'}
                              </p>
                              <p className="text-xs text-[#fff4e9]/50 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                            u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {u.role === 'admin' && <Shield className="w-3 h-3" />}
                            {u.role}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 text-[#fff4e9]/60">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditUser(u);
                              }}
                              className="p-2 text-[#fff4e9]/60 hover:text-[#fff4e9] hover:bg-[#fff4e9]/10 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(u.id);
                                }}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#2a3a4a] border-[#fff4e9]/20">
          <DialogHeader>
            <DialogTitle className="text-[#fff4e9]">Delete User</DialogTitle>
            <DialogDescription className="text-[#fff4e9]/60">
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-[#2a3a4a] border-[#fff4e9]/20">
          <DialogHeader>
            <DialogTitle className="text-[#fff4e9]">Edit User</DialogTitle>
            <DialogDescription className="text-[#fff4e9]/60">
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm text-[#fff4e9]/80 mb-2">Role</label>
              <select
                value={editUser?.role}
                onChange={(e) => setEditUser(editUser ? { ...editUser, role: e.target.value as 'customer' | 'admin' } : null)}
                className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9]"
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setEditUser(null)}
              className="px-4 py-2 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => editUser && handleUpdateRole(editUser.id, editUser.role)}
              className="px-4 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded hover:bg-[#f3e7d9] transition-colors"
            >
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
