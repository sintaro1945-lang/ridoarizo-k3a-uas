import React, { useState } from 'react';
import { Position } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Briefcase, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

interface PositionManagementProps {
  positions: Position[];
}

export default function PositionManagement({ positions }: PositionManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    baseDailyRate: 150000,
  });

  const openAddModal = () => {
    setEditingPosition(null);
    setFormData({ title: '', department: '', baseDailyRate: 150000 });
    setIsModalOpen(true);
  };

  const openEditModal = (pos: Position) => {
    setEditingPosition(pos);
    setFormData({ title: pos.title, department: pos.department, baseDailyRate: pos.baseDailyRate });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPosition) {
        const ref = doc(db, 'positions', editingPosition.id);
        await updateDoc(ref, {
          title: formData.title,
          department: formData.department,
          baseDailyRate: Number(formData.baseDailyRate),
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `positions/${editingPosition.id}`));
      } else {
        const newId = 'pos_' + Date.now();
        const newPos: Position = {
          id: newId,
          title: formData.title,
          department: formData.department,
          baseDailyRate: Number(formData.baseDailyRate),
        };
        await setDoc(doc(db, 'positions', newId), newPos).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `positions/${newId}`)
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus jabatan ini?')) {
      try {
        await deleteDoc(doc(db, 'positions', id)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `positions/${id}`)
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
          <h2 className="text-2xl font-bold">Manajemen Jabatan</h2>
          <p className="text-sm text-slate-400">Kelola daftar jabatan, departemen, dan standar gaji harian.</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Jabatan
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50 uppercase tracking-wider">
                <th className="p-4">Jabatan</th>
                <th className="p-4">Departemen</th>
                <th className="p-4">Standar Gaji / Hari</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Belum ada data jabatan.
                  </td>
                </tr>
              ) : (
                positions.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      {p.title}
                    </td>
                    <td className="p-4 text-slate-300">{p.department}</td>
                    <td className="p-4 font-semibold text-emerald-400">Rp {p.baseDailyRate.toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-white">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-lg">{editingPosition ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Jabatan</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Contoh: Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Departemen</label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Contoh: Technology"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Standar Gaji Harian (Rp)</label>
                <input
                  type="number"
                  required
                  value={formData.baseDailyRate}
                  onChange={(e) => setFormData({ ...formData, baseDailyRate: Number(e.target.value) })}
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
