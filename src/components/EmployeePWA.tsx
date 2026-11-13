import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, Position, WorkSetting } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';
import {
  Home,
  Clock,
  FileText,
  User,
  Users,
  LogOut,
  Camera,
  MapPin,
  CheckCircle2,
  Calendar,
  DollarSign,
  Shield,
  Smartphone,
  Award,
  Sparkles,
  TrendingUp,
  Bell,
  ChevronRight,
  BookOpen,
  Check,
  X,
  Clock4
} from 'lucide-react';
import SelfieCameraModal from './SelfieCameraModal';
import { formatDateDDMMMYYYY } from '../utils/dateFormatter';

interface EmployeePWAProps {
  currentUser: UserProfile;
  positions: Position[];
  workSetting: WorkSetting | null;
  onSwitchToAdmin?: () => void;
}

export default function EmployeePWA({ currentUser, positions, workSetting, onSwitchToAdmin }: EmployeePWAProps) {
  const [activeTab, setActiveTab] = useState<'beranda' | 'presensi' | 'laporan' | 'profil'>('beranda');
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'in' | 'out'>('in');
  const [loading, setLoading] = useState(false);
  const [locationStr, setLocationStr] = useState<string>('GPS Connected');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setCurrentTime(timeString);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'attendance'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: AttendanceRecord[] = [];
        let todayRec: AttendanceRecord | null = null;
        snapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() } as AttendanceRecord;
          records.push(data);
          if (data.date === todayStr) {
            todayRec = data;
          }
        });
        setTodayAttendance(todayRec);
        setAttendanceHistory(records.sort((a, b) => b.date.localeCompare(a.date)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
      }
    );

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStr(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setLocationStr('Kantor Utama');
        },
        { enableHighAccuracy: true }
      );
    }

    return () => unsubscribe();
  }, [currentUser.uid, todayStr]);

  const handleClockInClick = () => {
    setCameraMode('in');
    setIsCameraOpen(true);
  };

  const handleClockOutClick = () => {
    setCameraMode('out');
    setIsCameraOpen(true);
  };

  const getFreshLocation = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(locationStr || 'Lokasi tidak didukung');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          resolve(`Lat: ${lat}, Lng: ${lng}`);
        },
        () => {
          resolve(locationStr || 'GPS Lokasi');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleCaptureSelfie = async (imageSrc: string) => {
    setIsCameraOpen(false);
    setLoading(true);
    const nowTime = new Date().toTimeString().split(' ')[0];
    const freshCoord = await getFreshLocation();

    try {
      if (cameraMode === 'in') {
        let status: 'Present' | 'Late' = 'Present';
        if (workSetting) {
          const [workH, workM] = workSetting.workStart.split(':').map(Number);
          const [curH, curM] = nowTime.split(':').map(Number);
          const workMinutes = workH * 60 + workM;
          const curMinutes = curH * 60 + curM;
          const tolerance = workSetting.lateToleranceMinutes || 15;
          if (curMinutes > workMinutes + tolerance) {
            status = 'Late';
          }
        }

        const newRecord: Omit<AttendanceRecord, 'id'> = {
          userId: currentUser.uid,
          userName: currentUser.displayName,
          date: todayStr,
          clockInTime: nowTime,
          clockInSelfieUrl: imageSrc,
          clockInLocation: freshCoord,
          status: status,
        };

        await addDoc(collection(db, 'attendance'), newRecord).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, 'attendance')
        );
        setShowSuccessModal(true);
      } else if (todayAttendance) {
        const ref = doc(db, 'attendance', todayAttendance.id);
        await updateDoc(ref, {
          clockOutTime: nowTime,
          clockOutSelfieUrl: imageSrc,
          clockOutLocation: freshCoord,
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `attendance/${todayAttendance.id}`));
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userPosition = positions.find((p) => p.id === currentUser.positionId);
  const dailyRate = currentUser.dailyRate || userPosition?.baseDailyRate || 150000;

  const currentMonthStr = todayStr.substring(0, 7);
  const thisMonthAttendance = attendanceHistory.filter((r) => r.date.startsWith(currentMonthStr) && r.clockInTime);
  const totalDaysPresent = thisMonthAttendance.length;
  const estimatedSalary = totalDaysPresent * dailyRate;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col pb-24 font-sans antialiased selection:bg-amber-500 selection:text-white">
      {/* Dark Navy & Gold Header */}
      <header className="bg-[#0b1021] text-white px-5 pt-5 pb-8 rounded-b-[32px] shadow-xl sticky top-0 z-30 space-y-4 border-b border-amber-500/20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-amber-500/40">
              ⚡
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">AbsenEase Gold</span>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser.role === 'admin' && onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-xs font-bold rounded-xl text-white shadow-md transition-all"
              >
                Backoffice
              </button>
            )}
            <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors relative">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            </button>
          </div>
        </div>

        {/* User Card Row */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-amber-500 overflow-hidden shadow-md">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slate-300 m-auto mt-2" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight text-white">{currentUser.displayName}</h3>
              <p className="text-xs text-amber-400 font-semibold">{userPosition?.title || 'Senior Executive'}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
              {currentTime || '09:50 WIB'}
            </span>
          </div>
        </div>

        {/* Primary Gold Action CTA Button */}
        <div className="pt-1">
          {!todayAttendance?.clockInTime ? (
            <button
              onClick={handleClockInClick}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:opacity-95 active:scale-[0.99] font-extrabold rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 text-slate-950 transition-all text-base"
            >
              <Camera className="w-5 h-5" /> Absen Masuk (Clock-In)
            </button>
          ) : !todayAttendance?.clockOutTime ? (
            <button
              onClick={handleClockOutClick}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:opacity-95 active:scale-[0.99] font-extrabold rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 text-slate-950 transition-all text-base"
            >
              <Camera className="w-5 h-5" /> Absen Pulang (Clock-Out)
            </button>
          ) : (
            <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-bold rounded-2xl text-center text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Presensi Hari Ini Selesai
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto p-5 space-y-6">
        {activeTab === 'beranda' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Quick Menu Shortcuts Grid */}
            <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 text-center">
              <button onClick={() => setActiveTab('laporan')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-sm group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Daftar Absen</span>
              </button>

              <button onClick={() => setActiveTab('profil')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold shadow-sm group-hover:bg-yellow-500 group-hover:text-slate-950 transition-all">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Gaji Ku</span>
              </button>

              <button onClick={() => setActiveTab('laporan')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Kalender</span>
              </button>

              <button onClick={() => setActiveTab('presensi')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Clock4 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Shift</span>
              </button>
            </div>

            {/* Artikel / Pengumuman Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base text-slate-900">Artikel / Perusahaan</h3>
                <span className="text-xs font-bold text-amber-600 cursor-pointer hover:underline">Lihat Semua</span>
              </div>

              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 flex gap-4 items-center">
                <div className="w-24 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
                  <BookOpen className="w-8 h-8 font-bold" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Informasi HR</span>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">Agenda Bulan & Kebijakan Presensi Terbaru</h4>
                  <p className="text-[11px] text-slate-500">{formatDateDDMMMYYYY(todayStr)}</p>
                </div>
              </div>
            </div>

            {/* Pemberitahuan List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base text-slate-900">Pemberitahuan</h3>
                <span className="text-xs font-bold text-amber-600 cursor-pointer hover:underline">Lihat Semua</span>
              </div>

              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Presensi Berhasil Direkam</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sistem telah mencatat waktu dan koordinat GPS Anda.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Selamat Datang di AbsenEase Gold</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Gunakan aplikasi ini untuk presensi harian dan rekap gaji.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'presensi' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-md">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Menu Presensi Mandiri</h3>
              <p className="text-sm text-slate-500 mt-1">Lakukan absen masuk dan pulang dengan verifikasi foto selfie & GPS.</p>

              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>GPS: <strong className="text-slate-900 font-mono">{locationStr}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Tanggal: <strong className="text-slate-900">{formatDateDDMMMYYYY(todayStr)}</strong></span>
                </div>
              </div>

              <div className="mt-6">
                {!todayAttendance?.clockInTime ? (
                  <button
                    onClick={handleClockInClick}
                    disabled={loading}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 font-bold rounded-2xl shadow-xl shadow-amber-500/35 flex items-center justify-center gap-2 text-slate-950 transition-all text-base"
                  >
                    <Camera className="w-5 h-5" /> Clock-In Sekarang
                  </button>
                ) : !todayAttendance?.clockOutTime ? (
                  <button
                    onClick={handleClockOutClick}
                    disabled={loading}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 font-bold rounded-2xl shadow-xl shadow-amber-500/35 flex items-center justify-center gap-2 text-slate-950 transition-all text-base"
                  >
                    <Camera className="w-5 h-5" /> Clock-Out Sekarang
                  </button>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-2xl text-center">
                    Presensi hari ini sudah lengkap.
                  </div>
                )}
              </div>
            </div>

            {todayAttendance && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Foto Selfie Hari Ini</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block mb-2 font-semibold">Clock-In ({todayAttendance.clockInTime})</span>
                    {todayAttendance.clockInSelfieUrl ? (
                      <img src={todayAttendance.clockInSelfieUrl} alt="Clock in selfie" className="w-full aspect-square object-cover rounded-2xl border border-slate-200 shadow-md" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">No Photo</div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-2 font-semibold">Clock-Out ({todayAttendance.clockOutTime || 'Belum'})</span>
                    {todayAttendance.clockOutSelfieUrl ? (
                      <img src={todayAttendance.clockOutSelfieUrl} alt="Clock out selfie" className="w-full aspect-square object-cover rounded-2xl border border-slate-200 shadow-md" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">Belum Absen</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'laporan' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900">Riwayat Kehadiran</h3>
              <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold">
                {attendanceHistory.length} Total
              </span>
            </div>

            {attendanceHistory.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Belum ada riwayat presensi tercatat.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceHistory.map((rec) => (
                  <div key={rec.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm ${
                          rec.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-700'
                            : rec.status === 'Late'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rec.status === 'Present' ? 'H' : rec.status === 'Late' ? 'T' : 'A'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{formatDateDDMMMYYYY(rec.date)}</h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          In: {rec.clockInTime || '--'} | Out: {rec.clockOutTime || '--'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        rec.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'Late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profil' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-amber-500 mx-auto flex items-center overflow-hidden mb-4 shadow-md">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-500 m-auto" />
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{currentUser.displayName}</h3>
              <p className="text-sm text-amber-600 font-semibold mt-0.5">{userPosition?.title || 'Senior Executive'}</p>
              <p className="text-xs text-slate-500 mt-1">{currentUser.email}</p>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-left">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">Tarif Gaji / Hari</span>
                  <span className="text-base font-bold text-emerald-600 font-mono">Rp {dailyRate.toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">Departemen</span>
                  <span className="text-sm font-semibold text-slate-900">{userPosition?.department || 'Management'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 via-white to-white rounded-3xl p-6 shadow-sm border border-emerald-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Rincian Gaji Harian</h4>
                  <p className="text-xs text-slate-500">Periode: {currentMonthStr}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Hari Masuk</span>
                  <span className="font-bold text-slate-900">{totalDaysPresent} Hari</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tarif per Hari</span>
                  <span className="font-bold text-slate-900 font-mono">Rp {dailyRate.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-100 text-base font-bold text-emerald-600">
                  <span>Total Penghasilan</span>
                  <span className="font-mono">Rp {estimatedSalary.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-40 max-w-md mx-auto shadow-2xl">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('beranda')}
            className={`flex flex-col items-center py-2.5 rounded-2xl transition-all ${
              activeTab === 'beranda' ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('presensi')}
            className={`flex flex-col items-center py-2.5 rounded-2xl transition-all ${
              activeTab === 'presensi' ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Presensi</span>
          </button>

          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex flex-col items-center py-2.5 rounded-2xl transition-all ${
              activeTab === 'laporan' ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Laporan</span>
          </button>

          <button
            onClick={() => setActiveTab('profil')}
            className={`flex flex-col items-center py-2.5 rounded-2xl transition-all ${
              activeTab === 'profil' ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Profil</span>
          </button>
        </div>
      </nav>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] max-w-xs w-full p-6 shadow-2xl text-center space-y-5 animate-scaleUp">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto text-slate-950 shadow-xl shadow-amber-500/40 font-bold">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">Anda berhasil Absen</h3>
              <p className="text-xs text-slate-500">Selamat, data absen Anda berhasil direkam.</p>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 text-left space-y-2 border border-amber-200 text-xs">
              <div className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">Detail Absen</div>
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{formatDateDDMMMYYYY(todayStr)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 font-extrabold rounded-2xl text-slate-950 shadow-lg shadow-amber-500/30 transition-all text-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Selfie Modal */}
      <SelfieCameraModal
        title={cameraMode === 'in' ? 'Absen Masuk - Selfie & GPS' : 'Absen Pulang - Selfie & GPS'}
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureSelfie}
      />
    </div>
  );
}
