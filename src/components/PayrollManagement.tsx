import React, { useState } from 'react';
import { UserProfile, AttendanceRecord, PayrollRecord, Position } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { DollarSign, Calendar, CheckCircle2, FileText, Award } from 'lucide-react';

interface PayrollManagementProps {
  users: UserProfile[];
  positions: Position[];
  attendanceList: AttendanceRecord[];
  payrolls: PayrollRecord[];
}

export default function PayrollManagement({ users, positions, attendanceList, payrolls }: PayrollManagementProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // "YYYY-MM"

  const handleGeneratePayroll = async () => {
    try {
      for (const u of users) {
        if (u.role === 'admin') continue; // Skip admin or include as needed
        const pos = positions.find((p) => p.id === u.positionId);
        const rate = u.dailyRate || pos?.baseDailyRate || 150000;

        // Count present days in selectedMonth
        const presentDays = attendanceList.filter(
          (a) => a.userId === u.uid && a.date.startsWith(selectedMonth) && a.clockInTime
        ).length;

        const totalAmount = presentDays * rate;
        const payrollId = `${u.uid}_${selectedMonth}`;

        const payrollData: PayrollRecord = {
          id: payrollId,
          userId: u.uid,
          month: selectedMonth,
          totalDaysPresent: presentDays,
          dailyRate: rate,
          totalAmount: totalAmount,
          status: 'Draft',
          generatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'payrolls', payrollId), payrollData).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, `payrolls/${payrollId}`)
        );
      }
      alert('Payroll berhasil di-generate untuk bulan ' + selectedMonth);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (payrollId: string, currentStatus: 'Draft' | 'Paid') => {
    const nextStatus = currentStatus === 'Draft' ? 'Paid' : 'Draft';
    try {
      await updateDoc(doc(db, 'payrolls', payrollId), { status: nextStatus }).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `payrolls/${payrollId}`)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const currentPayrolls = payrolls.filter((p) => p.month === selectedMonth);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Payroll (Gajian Harian)</h2>
          <p className="text-sm text-slate-400">Hitung dan kelola gaji berdasarkan hari kehadiran dikali tarif harian.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleGeneratePayroll}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-sm whitespace-nowrap"
          >
            <DollarSign className="w-4 h-4" /> Generate Gaji Bulan Ini
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50 uppercase tracking-wider">
                <th className="p-4">Karyawan</th>
                <th className="p-4">Bulan</th>
                <th className="p-4">Hari Masuk</th>
                <th className="p-4">Tarif / Hari</th>
                <th className="p-4">Total Gaji</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {currentPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada data payroll untuk bulan {selectedMonth}. Klik "Generate Gaji Bulan Ini".
                  </td>
                </tr>
              ) : (
                currentPayrolls.map((p) => {
                  const emp = users.find((u) => u.uid === p.userId);
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-bold">{emp?.displayName || 'Karyawan'}</td>
                      <td className="p-4 text-slate-300">{p.month}</td>
                      <td className="p-4 font-semibold">{p.totalDaysPresent} Hari</td>
                      <td className="p-4 text-slate-400">Rp {p.dailyRate.toLocaleString('id-ID')}</td>
                      <td className="p-4 font-bold text-emerald-400">Rp {p.totalAmount.toLocaleString('id-ID')}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.status === 'Paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(p.id, p.status)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            p.status === 'Draft'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {p.status === 'Draft' ? 'Tandai Dibayar' : 'Ubah ke Draft'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
