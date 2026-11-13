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
  LogOut,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Shield,
  Smartphone,
  ChevronRight,
  Award
} from 'lucide-react';
import SelfieCameraModal from './SelfieCameraModal';

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
  const [locationStr, setLocationStr] = useState<string>('Lokasi Terdeteksi (GPS)');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Fetch today's attendance and history
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

    // Get geolocation description
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStr(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setLocationStr('Kantor / Area Utama');
        }
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
          const coordStr = `Lat: ${lat}, Lng: ${lng}`;
          resolve(coordStr);
        },
        () => {
          resolve(locationStr || 'Lokasi GPS (Default)');
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
        // Check if late based on workSetting
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
      } else if (todayAttendance) {
        // Clock out
        const ref = doc(db, 'attendance', todayAttendance.id);
        await updateDoc(ref, {
          clockOutTime: nowTime,
          clockOutSelfieUrl: imageSrc,
          clockOutLocation: freshCoord,
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `attendance/${todayAttendance.id}`));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userPosition = positions.find((p) => p.id === currentUser.positionId);
  const dailyRate = currentUser.dailyRate || userPosition?.baseDailyRate || 150000;

  // Calculate this month's present days & estimated salary
  const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"
  const thisMonthAttendance = attendanceHistory.filter((r) => r.date.startsWith(currentMonthStr) && r.clockInTime);
  const totalDaysPresent = thisMonthAttendance.length;
  const estimatedSalary = totalDaysPresent * dailyRate;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-20">
      {/* Mobile Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center overflow-hidden">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-blue-400 m-auto" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">{currentUser.displayName}</h2>
            <p className="text-xs text-slate-400">{userPosition?.title || 'Karyawan'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'admin' && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Shield className="w-3.5 h-3.5" /> Backoffice
            </button>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('absensigo_demo_user');
              auth.signOut();
              window.location.reload();
            }}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4">
        {activeTab === 'beranda' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Status Card */}
            <div className="bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Presensi Hari Ini</span>
                  <h3 className="text-xl font-bold mt-1">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    todayAttendance?.clockOutTime
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : todayAttendance?.clockInTime
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {todayAttendance?.clockOutTime ? 'Selesai' : todayAttendance?.clockInTime ? 'Sudah Clock-In' : 'Belum Absen'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1">Jam Masuk</span>
                  <span className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    {todayAttendance?.clockInTime || '--:--'}
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1">Jam Pulang</span>
                  <span className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    {todayAttendance?.clockOutTime || '--:--'}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                {!todayAttendance?.clockInTime ? (
                  <button
                    onClick={handleClockInClick}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera className="w-5 h-5" /> Clock-In (Masuk Kerja)
                  </button>
                ) : !todayAttendance?.clockOutTime ? (
                  <button
                    onClick={handleClockOutClick}
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera className="w-5 h-5" /> Clock-Out (Pulang Kerja)
                  </button>
                ) : (
                  <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold rounded-2xl text-center text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Presensi Hari Ini Telah Selesai
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400">Kehadiran Bulan Ini</span>
                <h4 className="text-2xl font-bold mt-1">{totalDaysPresent} <span className="text-sm font-normal text-slate-400">Hari</span></h4>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400">Estimasi Gaji</span>
                <h4 className="text-lg font-bold mt-1 text-emerald-400">
                  Rp {estimatedSalary.toLocaleString('id-ID')}
                </h4>
              </div>
            </div>

            {/* Shift Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Jadwal Shift Kerja</span>
                <h4 className="font-bold mt-0.5">{workSetting ? `${workSetting.workStart} - ${workSetting.workEnd}` : '08:00 - 17:00'}</h4>
                <p className="text-xs text-slate-400 mt-1">{workSetting?.workDays || 'Senin - Jumat'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'presensi' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center">
              <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Menu Presensi Karyawan</h3>
              <p className="text-sm text-slate-400 mt-1">Lakukan absen masuk dan pulang dengan verifikasi foto selfie dan lokasi GPS.</p>

              <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Lokasi: <strong className="text-white">{locationStr}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Tanggal: <strong className="text-white">{todayStr}</strong></span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {!todayAttendance?.clockInTime ? (
                  <button
                    onClick={handleClockInClick}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera className="w-5 h-5" /> Clock-In Sekarang
                  </button>
                ) : !todayAttendance?.clockOutTime ? (
                  <button
                    onClick={handleClockOutClick}
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera className="w-5 h-5" /> Clock-Out Sekarang
                  </button>
                ) : (
                  <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold rounded-2xl text-center">
                    Presensi hari ini sudah lengkap. Terima kasih!
                  </div>
                )}
              </div>
            </div>

            {/* Today's Record Details */}
            {todayAttendance && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Detail Foto Selfie Hari Ini</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-2">Clock-In ({todayAttendance.clockInTime})</span>
                    {todayAttendance.clockInSelfieUrl ? (
                      <img src={todayAttendance.clockInSelfieUrl} alt="Clock in selfie" className="w-full aspect-square object-cover rounded-2xl border border-slate-800" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-500">Tidak ada foto</div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-2">Clock-Out ({todayAttendance.clockOutTime || 'Belum'})</span>
                    {todayAttendance.clockOutSelfieUrl ? (
                      <img src={todayAttendance.clockOutSelfieUrl} alt="Clock out selfie" className="w-full aspect-square object-cover rounded-2xl border border-slate-800" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-500">Belum Clock-Out</div>
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
              <h3 className="text-lg font-bold">Riwayat Presensi</h3>
              <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full">
                {attendanceHistory.length} Total Hari
              </span>
            </div>

            {attendanceHistory.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Belum ada riwayat presensi tercatat.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceHistory.map((rec) => (
                  <div key={rec.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          rec.status === 'Present'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : rec.status === 'Late'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {rec.status === 'Present' ? 'H' : rec.status === 'Late' ? 'T' : 'A'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{rec.date}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Masuk: {rec.clockInTime || '--'} | Pulang: {rec.clockOutTime || '--'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        rec.status === 'Present'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : rec.status === 'Late'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-300'
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
            {/* Biodata Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-blue-600/30 border-2 border-blue-500/50 mx-auto flex items-center overflow-hidden mb-4 shadow-xl">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-blue-400 m-auto" />
                )}
              </div>
              <h3 className="text-xl font-bold">{currentUser.displayName}</h3>
              <p className="text-sm text-blue-400 mt-0.5">{userPosition?.title || 'Karyawan'}</p>
              <p className="text-xs text-slate-400 mt-1">{currentUser.email}</p>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800 text-left">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Tarif Gaji / Hari</span>
                  <span className="text-base font-bold text-emerald-400">Rp {dailyRate.toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Departemen</span>
                  <span className="text-sm font-semibold text-white">{userPosition?.department || 'Umum'}</span>
                </div>
              </div>
            </div>

            {/* Salary Calculation Info */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold">Model Gaji Harian</h4>
                  <p className="text-xs text-slate-400">Bulan: {currentMonthStr}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Masuk Bulan Ini</span>
                  <span className="font-bold">{totalDaysPresent} Hari</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tarif per Hari</span>
                  <span className="font-bold">Rp {dailyRate.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-white/10 text-base font-bold text-emerald-400">
                  <span>Estimasi Total Gaji</span>
                  <span>Rp {estimatedSalary.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-2 z-40 max-w-lg mx-auto">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('beranda')}
            className={`flex flex-col items-center py-2 rounded-2xl transition-all ${
              activeTab === 'beranda' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('presensi')}
            className={`flex flex-col items-center py-2 rounded-2xl transition-all ${
              activeTab === 'presensi' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">Presensi</span>
          </button>

          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex flex-col items-center py-2 rounded-2xl transition-all ${
              activeTab === 'laporan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">Laporan</span>
          </button>

          <button
            onClick={() => setActiveTab('profil')}
            className={`flex flex-col items-center py-2 rounded-2xl transition-all ${
              activeTab === 'profil' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">Profil & Gaji</span>
          </button>
        </div>
      </nav>

      {/* Selfie Modal */}
      <SelfieCameraModal
        title={cameraMode === 'in' ? 'Clock-In Selfie Presensi' : 'Clock-Out Selfie Presensi'}
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureSelfie}
      />
    </div>
  );
}
