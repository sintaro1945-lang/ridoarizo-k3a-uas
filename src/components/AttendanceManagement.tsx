import React, { useState } from 'react';
import { AttendanceRecord, UserProfile } from '../types';
import { Clock, Calendar, MapPin, User, Search, Eye, X } from 'lucide-react';
import { formatDateDDMMMYYYY } from '../utils/dateFormatter';

interface AttendanceManagementProps {
  attendanceList: AttendanceRecord[];
  users: UserProfile[];
}

export default function AttendanceManagement({ attendanceList, users }: AttendanceManagementProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const filteredAttendance = attendanceList.filter((item) => {
    if (selectedDate && item.date !== selectedDate) return false;
    if (selectedUser && item.userId !== selectedUser) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Data Kehadiran Karyawan</h2>
          <p className="text-sm text-slate-400">Pantau presensi harian, jam masuk, jam pulang, koordinat GPS, dan foto selfie karyawan.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl text-slate-300 transition-colors"
            >
              Reset Tanggal
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50 uppercase tracking-wider">
                <th className="p-4">Karyawan</th>
                <th className="p-4">Tanggal (DD-MMM-YYYY)</th>
                <th className="p-4">Clock-In</th>
                <th className="p-4">Clock-Out</th>
                <th className="p-4">Status</th>
                <th className="p-4">Lokasi GPS</th>
                <th className="p-4 text-right">Foto Selfie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada data kehadiran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((item) => {
                  const emp = users.find((u) => u.uid === item.userId);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-bold">{emp?.displayName || item.userName || 'Karyawan'}</td>
                      <td className="p-4 font-semibold text-white">{formatDateDDMMMYYYY(item.date)}</td>
                      <td className="p-4 font-mono text-blue-400">{item.clockInTime || '-'}</td>
                      <td className="p-4 font-mono text-indigo-400">{item.clockOutTime || '-'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.status === 'Late'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-xs font-mono max-w-xs truncate">
                        {item.clockInLocation || item.clockOutLocation || 'Kantor'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.clockInSelfieUrl && (
                            <button
                              onClick={() => setActivePhoto(item.clockInSelfieUrl || null)}
                              className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Masuk
                            </button>
                          )}
                          {item.clockOutSelfieUrl && (
                            <button
                              onClick={() => setActivePhoto(item.clockOutSelfieUrl || null)}
                              className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Pulang
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

      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl p-4 text-white">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm">Foto Selfie Presensi</h4>
              <button onClick={() => setActivePhoto(null)} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={activePhoto} alt="Selfie preview" className="w-full aspect-square object-cover rounded-2xl border border-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}
