import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  Trash2,
  Edit2,
  KeyRound,
  Search,
  RefreshCw,
  X,
  AlertTriangle,
  UserCheck,
  School,
  Phone,
  Mail,
  GraduationCap,
  Eye,
  EyeOff,
  Users,
  Info,
  Lock,
} from 'lucide-react';

const AVAILABLE_CLASSES = [
  'X-1', 'X-2', 'X-3', 'X-4', 'X-5', 'X-6',
  'XI-1', 'XI-2', 'XI-3', 'XI-4', 'XI-5', 'XI-6',
  'XII-1', 'XII-2', 'XII-3', 'XII-4', 'XII-5', 'XII-6',
  'XI IPA 1', 'XI IPA 2', 'XI IPS 1', 'XI IPS 2',
  'XII IPA 1', 'XII IPA 2', 'XII IPS 1', 'XII IPS 2',
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => store.getUsers());
  const [currentUser] = useState<User | null>(() => store.getCurrentUser());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add User Form State
  const [addForm, setAddForm] = useState({
    username: '',
    name: '',
    password: '',
    role: 'Guru' as UserRole,
    subRole: 'Guru Piket' as string,
    assignedClass: '',
    nip: '',
    phone: '',
    email: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
    notes: '',
  });
  const [showAddPass, setShowAddPass] = useState(false);

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    username: '',
    name: '',
    role: 'Guru' as UserRole,
    subRole: 'Guru Piket' as string,
    assignedClass: '',
    nip: '',
    phone: '',
    email: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
    notes: '',
  });

  // Reset Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen to store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setUsers(store.getUsers());
    });
    return () => unsubscribe();
  }, []);

  const handleSyncFirestore = async () => {
    setIsSyncing(true);
    try {
      await store.syncUsersWithFirestore();
      setUsers(store.getUsers());
      toast.success('Sinkronisasi Sukses', 'Data akun pengguna berhasil disinkronkan dengan Cloud Firestore.');
    } catch (err: any) {
      toast.error('Sinkronisasi Gagal', err?.message || 'Gagal menyinkronkan data dengan server.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (user.name && user.name.toLowerCase().includes(q)) ||
        (user.username && user.username.toLowerCase().includes(q)) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.nip && user.nip.toLowerCase().includes(q)) ||
        (user.assignedClass && user.assignedClass.toLowerCase().includes(q)) ||
        (user.subRole && user.subRole.toLowerCase().includes(q));

      const matchesRole =
        selectedRoleFilter === 'all' ||
        user.role === selectedRoleFilter ||
        (selectedRoleFilter === 'Wali Kelas' && user.subRole === 'Wali Kelas') ||
        (selectedRoleFilter === 'Guru Piket' && (user.subRole === 'Guru Piket' || user.role === 'Guru'));

      const matchesStatus = selectedStatusFilter === 'all' || user.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'Admin').length;
    const piket = users.filter((u) => u.subRole === 'Guru Piket' || (u.role === 'Guru' && !u.subRole)).length;
    const waliKelas = users.filter((u) => u.subRole === 'Wali Kelas').length;
    const kepsek = users.filter((u) => u.role === 'Kepala Sekolah').length;
    return { total, admins, piket, waliKelas, kepsek };
  }, [users]);

  // Open Handlers
  const handleOpenAddModal = () => {
    setAddForm({
      username: '',
      name: '',
      password: '',
      role: 'Guru',
      subRole: 'Guru Piket',
      assignedClass: '',
      nip: '',
      phone: '',
      email: '',
      status: 'aktif',
      notes: '',
    });
    setShowAddPass(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username || '',
      name: user.name || '',
      role: user.role || 'Guru',
      subRole: user.subRole || (user.role === 'Guru' ? 'Guru Piket' : user.role),
      assignedClass: user.assignedClass || '',
      nip: user.nip || '',
      phone: user.phone || '',
      email: user.email || '',
      status: user.status || 'aktif',
      notes: user.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenResetPassModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPass(false);
    setIsResetPassModalOpen(true);
  };

  const handleOpenDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.warning('Validasi', 'Nama lengkap pengguna wajib diisi.');
      return;
    }
    if (!addForm.username.trim()) {
      toast.warning('Validasi', 'Username wajib diisi.');
      return;
    }
    if (!addForm.password.trim()) {
      toast.warning('Validasi', 'Kata sandi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await store.addUser({
        username: addForm.username,
        name: addForm.name,
        password: addForm.password,
        role: addForm.role,
        subRole: addForm.subRole,
        assignedClass: addForm.subRole === 'Wali Kelas' ? addForm.assignedClass : '',
        nip: addForm.nip,
        phone: addForm.phone,
        email: addForm.email,
        status: addForm.status,
        notes: addForm.notes,
      });

      if (res.success) {
        toast.success('Berhasil Dibuat', res.message);
        setIsAddModalOpen(false);
      } else {
        toast.error('Gagal Membuat Akun', res.message);
      }
    } catch (err: any) {
      toast.error('Kesalahan', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!editForm.name.trim()) {
      toast.warning('Validasi', 'Nama lengkap tidak boleh kosong.');
      return;
    }
    if (!editForm.username.trim()) {
      toast.warning('Validasi', 'Username tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await store.updateUser(selectedUser.uid, {
        username: editForm.username,
        name: editForm.name,
        role: editForm.role,
        subRole: editForm.subRole,
        assignedClass: editForm.subRole === 'Wali Kelas' ? editForm.assignedClass : '',
        nip: editForm.nip,
        phone: editForm.phone,
        email: editForm.email,
        status: editForm.status,
        notes: editForm.notes,
      });

      if (res.success) {
        toast.success('Berhasil Diperbarui', res.message);
        setIsEditModalOpen(false);
      } else {
        toast.error('Gagal Memperbarui', res.message);
      }
    } catch (err: any) {
      toast.error('Kesalahan', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reset Password
  const handleResetPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!newPassword.trim() || newPassword.trim().length < 3) {
      toast.warning('Validasi', 'Kata sandi baru minimal 3 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await store.resetUserPassword(selectedUser.uid, newPassword.trim());
      if (res.success) {
        toast.success('Password Diperbarui', res.message);
        setIsResetPassModalOpen(false);
      } else {
        toast.error('Gagal Reset Password', res.message);
      }
    } catch (err: any) {
      toast.error('Kesalahan', err?.message || 'Gagal memperbarui password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await store.deleteUser(selectedUser.uid);
      if (res.success) {
        toast.success('Akun Dihapus', res.message);
        setIsDeleteModalOpen(false);
      } else {
        toast.error('Gagal Menghapus', res.message);
      }
    } catch (err: any) {
      toast.error('Kesalahan', err?.message || 'Gagal menghapus akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (user: User) => {
    if (user.role === 'Admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          {user.subRole || 'Super Admin'}
        </span>
      );
    }
    if (user.role === 'Kepala Sekolah') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <School className="w-3.5 h-3.5" />
          Kepala Sekolah
        </span>
      );
    }
    if (user.subRole === 'Wali Kelas') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <GraduationCap className="w-3.5 h-3.5" />
          Wali Kelas {user.assignedClass ? `(${user.assignedClass})` : ''}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <UserCheck className="w-3.5 h-3.5" />
        {user.subRole || 'Guru Piket'}
      </span>
    );
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            Manajemen Akun & Hak Akses Database
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Kelola data akun Guru Piket, Wali Kelas, Kepala Sekolah, dan Administrator yang tersimpan langsung di Database.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleSyncFirestore}
            disabled={isSyncing}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Sinkronkan dengan Cloud Firestore"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkron Cloud'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Akun</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guru Piket</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.piket}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wali Kelas</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.waliKelas}</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin & Kepsek</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.admins + stats.kepsek}</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-2xl flex items-start gap-3.5 text-blue-900 dark:text-blue-200 text-xs font-medium leading-relaxed">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Sistem Autentikasi Mandiri Database:</strong> Akun yang Anda buat di sini langsung tersimpan di Database lokal & Cloud Firestore. Petugas Piket dan Wali Kelas dapat langsung masuk menggunakan <strong>Username</strong> dan <strong>Kata Sandi</strong> yang telah dibuat tanpa bergantung pada login Google.
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pengguna, username, email, NIP, atau kelas..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Peran</option>
            <option value="Admin">Admin / Super Admin</option>
            <option value="Guru Piket">Guru Piket</option>
            <option value="Wali Kelas">Wali Kelas</option>
            <option value="Kepala Sekolah">Kepala Sekolah</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="aktif">Status Aktif</option>
            <option value="nonaktif">Status Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama & Profil</th>
                <th className="px-5 py-3.5">Kredensial Akun</th>
                <th className="px-5 py-3.5">Peran & Hak Akses</th>
                <th className="px-5 py-3.5">Kelas / NIP</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-sm">Tidak ada akun yang sesuai dengan filter.</p>
                    <p className="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau reset filter peran.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.uid === u.uid;
                  const isProtectedAdmin = u.uid === 'usr-admin';

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs flex-shrink-0">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded border border-blue-400/30">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              {u.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {u.phone}
                                </span>
                              )}
                              {u.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {u.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Credentials */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              @{u.username || 'user'}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              title="Kata sandi akun tersimpan terenkripsi dengan aman menggunakan algoritma bcrypt hashing"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              bcrypt
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {u.lastLoginAt ? `Login: ${new Date(u.lastLoginAt).toLocaleDateString('id-ID')}` : 'Belum pernah login'}
                          </p>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        {getRoleBadge(u)}
                      </td>

                      {/* Class / NIP */}
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {u.subRole === 'Wali Kelas' && u.assignedClass ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            Kelas {u.assignedClass}
                          </span>
                        ) : u.nip ? (
                          <span className="font-mono text-slate-500">NIP: {u.nip}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'aktif'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'aktif' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {u.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassModal(u)}
                            className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Reset Kata Sandi Akun"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Ubah Data Pengguna"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {!isProtectedAdmin && !isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Akun dari Database"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* ========================================================================= */}
      {/* 1. Modal: Tambah Akun Baru                                                */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Tambah Akun Pengguna</h3>
                  <p className="text-xs text-slate-500">Buat kredensial login untuk staf atau guru baru</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} autoComplete="off" className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Contoh: Siti Rahmah, S.Pd"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.username}
                    onChange={(e) =>
                      setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                    }
                    placeholder="Contoh: sitirahmah"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Kata Sandi Awal <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPass ? 'text' : 'password'}
                      required
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      placeholder="Minimal 3 karakter"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPass(!showAddPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showAddPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Peran Utama (Role)
                  </label>
                  <select
                    value={addForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      let defaultSub = 'Guru Piket';
                      if (newRole === 'Admin') defaultSub = 'Super Admin';
                      if (newRole === 'Kepala Sekolah') defaultSub = 'Kepala Sekolah';
                      setAddForm({ ...addForm, role: newRole, subRole: defaultSub });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Guru">Guru / Petugas Piket</option>
                    <option value="Admin">Administrator (TU / Sistem)</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Tugas Spesifik (Sub-Role)
                  </label>
                  <select
                    value={addForm.subRole}
                    onChange={(e) => setAddForm({ ...addForm, subRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {addForm.role === 'Guru' && (
                      <>
                        <option value="Guru Piket">Petugas Guru Piket Presensi</option>
                        <option value="Wali Kelas">Wali Kelas</option>
                        <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                      </>
                    )}
                    {addForm.role === 'Admin' && (
                      <>
                        <option value="Super Admin">Super Administrator</option>
                        <option value="Admin TU">Staf Tata Usaha</option>
                      </>
                    )}
                    {addForm.role === 'Kepala Sekolah' && (
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                    )}
                  </select>
                </div>
              </div>

              {addForm.subRole === 'Wali Kelas' && (
                <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    Kelas yang Dibina (Wali Kelas) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.assignedClass}
                    onChange={(e) => setAddForm({ ...addForm, assignedClass: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none font-bold"
                  >
                    <option value="">-- Pilih Kelas Binaan --</option>
                    {AVAILABLE_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    Wali Kelas akan otomatis menerima notifikasi disposisi presensi siswa di kelas ini.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    NIP Pegawai (Opsional)
                  </label>
                  <input
                    type="text"
                    value={addForm.nip}
                    onChange={(e) => setAddForm({ ...addForm, nip: e.target.value })}
                    placeholder="198001012005011001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    No. WhatsApp / HP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="guru@sman15.sch.id"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Status Akun
                  </label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="aktif">Aktif (Dapat Login)</option>
                    <option value="nonaktif">Nonaktif (Akses Diblokir)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Keterangan tambahan untuk akun ini..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun ke Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: Edit Data Akun                                                  */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Ubah Data Akun</h3>
                  <p className="text-xs text-slate-500">Edit informasi dan perizinan hak akses pengguna</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Username Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Peran Utama (Role)
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      let defaultSub = 'Guru Piket';
                      if (newRole === 'Admin') defaultSub = 'Super Admin';
                      if (newRole === 'Kepala Sekolah') defaultSub = 'Kepala Sekolah';
                      setEditForm({ ...editForm, role: newRole, subRole: defaultSub });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Guru">Guru / Petugas Piket</option>
                    <option value="Admin">Administrator (TU / Sistem)</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Tugas Spesifik (Sub-Role)
                  </label>
                  <select
                    value={editForm.subRole}
                    onChange={(e) => setEditForm({ ...editForm, subRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {editForm.role === 'Guru' && (
                      <>
                        <option value="Guru Piket">Petugas Guru Piket Presensi</option>
                        <option value="Wali Kelas">Wali Kelas</option>
                        <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                      </>
                    )}
                    {editForm.role === 'Admin' && (
                      <>
                        <option value="Super Admin">Super Administrator</option>
                        <option value="Admin TU">Staf Tata Usaha</option>
                      </>
                    )}
                    {editForm.role === 'Kepala Sekolah' && (
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                    )}
                  </select>
                </div>
              </div>

              {editForm.subRole === 'Wali Kelas' && (
                <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
                  <label className="block text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    Kelas yang Dibina (Wali Kelas) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.assignedClass}
                    onChange={(e) => setEditForm({ ...editForm, assignedClass: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none font-bold"
                  >
                    <option value="">-- Pilih Kelas Binaan --</option>
                    {AVAILABLE_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    NIP Pegawai (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editForm.nip}
                    onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Status Akun
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="aktif">Aktif (Dapat Login)</option>
                    <option value="nonaktif">Nonaktif (Akses Diblokir)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: Reset Kata Sandi                                                */}
      {/* ========================================================================= */}
      {isResetPassModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Reset Kata Sandi</h3>
                  <p className="text-xs text-slate-500">Atur kata sandi baru untuk {selectedUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassSubmit} autoComplete="off" className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Target Akun</p>
                <p className="font-black text-slate-900 dark:text-white text-sm mt-0.5">{selectedUser.name}</p>
                <p className="text-xs text-slate-400 font-mono">@{selectedUser.username} • {selectedUser.role}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Pengguna dapat langsung masuk dengan kata sandi baru ini setelah Anda menyimpannya.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-600/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: Hapus Akun                                                      */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl w-fit">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Hapus Akun Pengguna?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus akun <strong>{selectedUser.name}</strong> (@{selectedUser.username})? Pengguna ini tidak akan dapat login lagi ke sistem.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <p><strong>Peran:</strong> {selectedUser.role} ({selectedUser.subRole || 'Staf'})</p>
              {selectedUser.assignedClass && <p><strong>Kelas Binaan:</strong> {selectedUser.assignedClass}</p>}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;
