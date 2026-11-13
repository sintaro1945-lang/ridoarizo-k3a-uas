import React, { useState } from 'react';
import { UserProfile, Position } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Users, Plus, Edit2, Trash2, Shield, DollarSign, X, Check } from 'lucide-react';

interface EmployeeManagementProps {
  users: UserProfile[];
  positions: Position[];
}

export default function EmployeeManagement({ users, positions }: EmployeeManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    role: 'employee' as 'admin' | 'employee',
    positionId: '',
    dailyRate: 150000,
    phone: '',
    joinedDate: new Date().toISOString().split('T')[0],
  });

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      role: 'employee',
      positionId: positions[0]?.id || '',
      dailyRate: positions[0]?.baseDailyRate || 150000,
      phone: '',
      joinedDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      positionId: user.positionId || '',
      dailyRate: user.dailyRate || 150000,
      phone: user.phone || '',
      joinedDate: user.joinedDate || new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const ref = doc(db, 'users', editingUser.uid);
        await updateDoc(ref, {
          displayName: formData.displayName,
          role: formData.role,
          positionId: formData.positionId,
          dailyRate: Number(formData.dailyRate),
          phone: formData.phone,
          joinedDate: formData.joinedDate,
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.uid}`));
      } else {
        // Create new user doc with generated ID
        const newId = 'user_' + Date.now();
        const newUser: UserProfile = {
          uid: newId,
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          positionId: formData.positionId,
          dailyRate: Number(formData.dailyRate),
          phone: formData.phone,
          joinedDate: formData.joinedDate,
          avatarUrl: '',
        };
        await setDoc(doc(db, 'users', newId), newUser).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `users/${newId}`)
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (uid: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) {
      try {
        await deleteDoc(doc(db, 'users', uid)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}`)
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Karyawan</h2>
          <p className="text-sm text-slate-400">Kelola data profil, jabatan, dan tarif gaji harian karyawan.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Karyawan
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50 uppercase tracking-wider">
                <th className="p-4">Karyawan</th>
                <th className="p-4">Jabatan</th>
                <th className="p-4">Role</th>
                <th className="p-4">Tarif Gaji / Hari</th>
                <th className="p-4">Tanggal Bergabung</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Belum ada data karyawan.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const pos = positions.find((p) => p.id === u.positionId);
                  return (
                    <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center overflow-hidden">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-blue-400 m-auto" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold">{u.displayName}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{pos?.title || '-'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-emerald-400">
                        Rp {(u.dailyRate || pos?.baseDailyRate || 150000).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-slate-400">{u.joinedDate || '-'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.uid)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-white">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-lg">{editingUser ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="budi@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Jabatan</label>
                  <select
                    value={formData.positionId}
                    onChange={(e) => {
                      const posId = e.target.value;
                      const selectedPos = positions.find((p) => p.id === posId);
                      setFormData({
                        ...formData,
                        positionId: posId,
                        dailyRate: selectedPos ? selectedPos.baseDailyRate : formData.dailyRate,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih Jabatan</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tarif Gaji Harian (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">No. Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tanggal Bergabung</label>
                <input
                  type="date"
                  value={formData.joinedDate}
                  onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
