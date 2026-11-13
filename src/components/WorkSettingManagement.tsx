import React, { useState, useEffect } from 'react';
import { WorkSetting } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Clock, Check, Calendar } from 'lucide-react';

interface WorkSettingManagementProps {
  workSetting: WorkSetting | null;
}

export default function WorkSettingManagement({ workSetting }: WorkSettingManagementProps) {
  const [workStart, setWorkStart] = useState(workSetting?.workStart || '08:00');
  const [workEnd, setWorkEnd] = useState(workSetting?.workEnd || '17:00');
  const [lateTolerance, setLateTolerance] = useState(workSetting?.lateToleranceMinutes || 15);
  const [workDays, setWorkDays] = useState(workSetting?.workDays || 'Senin - Jumat');
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (workSetting) {
      setWorkStart(workSetting.workStart);
      setWorkEnd(workSetting.workEnd);
      setLateTolerance(workSetting.lateToleranceMinutes);
      setWorkDays(workSetting.workDays);
    }
  }, [workSetting]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const setting: WorkSetting = {
        id: 'default_setting',
        workStart,
        workEnd,
        lateToleranceMinutes: Number(lateTolerance),
        workDays,
      };
      await setDoc(doc(db, 'work_settings', 'default_setting'), setting).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, 'work_settings/default_setting')
      );
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Hari & Jam Kerja</h2>
        <p className="text-sm text-slate-400">Atur jam masuk, jam pulang, toleransi keterlambatan, dan hari kerja efektif.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        {savedMessage && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-2xl text-sm flex items-center gap-2">
            <Check className="w-5 h-5" /> Pengaturan jam kerja berhasil disimpan!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Jam Masuk Kerja (Start)</label>
              <input
                type="time"
                required
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Jam Pulang Kerja (End)</label>
              <input
                type="time"
                required
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Toleransi Keterlambatan (Menit)</label>
              <input
                type="number"
                required
                value={lateTolerance}
                onChange={(e) => setLateTolerance(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Lewat dari waktu ini ditandai Terlambat.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Hari Kerja Efektif</label>
              <input
                type="text"
                required
                value={workDays}
                onChange={(e) => setWorkDays(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-blue-500"
                placeholder="Senin - Jumat"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-2xl text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              <Check className="w-5 h-5" /> Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
