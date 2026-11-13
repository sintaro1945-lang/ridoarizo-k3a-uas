import React, { useState } from 'react';
import { UserProfile, Position, WorkSetting, AttendanceRecord, PayrollRecord } from '../types';
import {
  Users,
  Briefcase,
  Clock,
  FileText,
  DollarSign,
  Shield,
  Smartphone,
  LogOut,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { auth } from '../firebase';
import EmployeeManagement from './EmployeeManagement';
import PositionManagement from './PositionManagement';
import WorkSettingManagement from './WorkSettingManagement';
import AttendanceManagement from './AttendanceManagement';
import PayrollManagement from './PayrollManagement';

interface AdminBackofficeProps {
  currentUser: UserProfile;
  users: UserProfile[];
  positions: Position[];
  workSetting: WorkSetting | null;
  attendanceList: AttendanceRecord[];
  payrolls: PayrollRecord[];
  onSwitchToEmployeePWA: () => void;
}

export default function AdminBackoffice({
  currentUser,
  users,
  positions,
  workSetting,
  attendanceList,
  payrolls,
  onSwitchToEmployeePWA,
}: AdminBackofficeProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'positions' | 'worksettings' | 'attendance' | 'payroll'>('dashboard');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceList.filter((a) => a.date === todayStr);
  const totalEmployees = users.filter((u) => u.role === 'employee').length;
  const presentToday = todayAttendance.filter((a) => a.clockInTime).length;
  const lateToday = todayAttendance.filter((a) => a.status === 'Late').length;

  const currentMonthStr = todayStr.substring(0, 7);
  const currentPayrolls = payrolls.filter((p) => p.month === currentMonthStr);
  const totalPayrollEst = currentPayrolls.reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col hidden lg:flex sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center text-white font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">AbsensiGo</h1>
            <p className="text-xs text-slate-400">Backoffice HRM Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'employees' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" /> Data Karyawan
          </button>

          <button
            onClick={() => setActiveTab('positions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'positions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Briefcase className="w-5 h-5" /> Data Jabatan
          </button>

          <button
            onClick={() => setActiveTab('worksettings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'worksettings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5" /> Hari & Jam Kerja
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" /> Data Kehadiran
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <DollarSign className="w-5 h-5" /> Payroll Gaji Harian
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={onSwitchToEmployeePWA}
            className="w-full py-3 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Smartphone className="w-4 h-4" /> Beralih ke Mobile PWA
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('absensigo_demo_user');
              auth.signOut();
              window.location.reload();
            }}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile/desktop */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-30 flex justify-between items-center lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="font-bold">AbsensiGo Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToEmployeePWA}
              className="p-2 bg-indigo-600/20 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Smartphone className="w-4 h-4" /> PWA
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('absensigo_demo_user');
                auth.signOut();
                window.location.reload();
              }}
              className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Subnav */}
        <div className="flex lg:hidden overflow-x-auto bg-slate-900 border-b border-slate-800 p-2 gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'employees', label: 'Karyawan' },
            { id: 'positions', label: 'Jabatan' },
            { id: 'worksettings', label: 'Jam Kerja' },
            { id: 'attendance', label: 'Kehadiran' },
            { id: 'payroll', label: 'Payroll' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h2 className="text-3xl font-bold">Dashboard Admin</h2>
                <p className="text-slate-400 mt-1">Ringkasan aktivitas kehadiran dan manajemen perusahaan hari ini.</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Karyawan</span>
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold">{totalEmployees}</h3>
                  <p className="text-xs text-slate-500 mt-1">Karyawan aktif terdaftar</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Hadir Hari Ini</span>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold">{presentToday}</h3>
                  <p className="text-xs text-emerald-400 mt-1">Tercatat clock-in hari ini</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Terlambat</span>
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold">{lateToday}</h3>
                  <p className="text-xs text-amber-400 mt-1">Melewati toleransi jam masuk</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Estimasi Payroll</span>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-400">Rp {totalPayrollEst.toLocaleString('id-ID')}</h3>
                  <p className="text-xs text-slate-500 mt-1">Bulan {currentMonthStr}</p>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-4">Aktivitas Presensi Hari Ini ({todayStr})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50 uppercase tracking-wider">
                        <th className="p-3">Karyawan</th>
                        <th className="p-3">Jam Masuk</th>
                        <th className="p-3">Jam Pulang</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm">
                      {todayAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400">
                            Belum ada karyawan yang melakukan presensi hari ini.
                          </td>
                        </tr>
                      ) : (
                        todayAttendance.map((a) => {
                          const emp = users.find((u) => u.uid === a.userId);
                          return (
                            <tr key={a.id} className="hover:bg-white/[0.02]">
                              <td className="p-3 font-bold">{emp?.displayName || a.userName || 'Karyawan'}</td>
                              <td className="p-3 font-mono text-blue-400">{a.clockInTime || '-'}</td>
                              <td className="p-3 font-mono text-indigo-400">{a.clockOutTime || '-'}</td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                                  {a.status}
                                </span>
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
          )}

          {activeTab === 'employees' && <EmployeeManagement users={users} positions={positions} />}
          {activeTab === 'positions' && <PositionManagement positions={positions} />}
          {activeTab === 'worksettings' && <WorkSettingManagement workSetting={workSetting} />}
          {activeTab === 'attendance' && <AttendanceManagement attendanceList={attendanceList} users={users} />}
          {activeTab === 'payroll' && (
            <PayrollManagement users={users} positions={positions} attendanceList={attendanceList} payrolls={payrolls} />
          )}
        </main>
      </div>
    </div>
  );
}
