import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Shield, Smartphone, Users, Clock, Award, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setShowDomainHelp(false);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef).catch(() => null);

      if (!userSnap || !userSnap.exists()) {
        const isAdmin = user.email === 'sintaro1945@gmail.com' || user.email?.includes('admin');
        const defaultProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Karyawan Baru',
          role: isAdmin ? 'admin' : 'employee',
          dailyRate: 150000,
          joinedDate: new Date().toISOString().split('T')[0],
          avatarUrl: user.photoURL || '',
          phone: '',
        };
        await setDoc(userRef, defaultProfile).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`)
        );
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setShowDomainHelp(true);
        setError('Domain preview saat ini belum diotorisasi di Firebase Console.');
      } else {
        setError(err.message || 'Gagal melakukan login dengan Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'employee') => {
    setLoading(true);
    setError(null);
    try {
      const demoUid = role === 'admin' ? 'demo_admin_123' : 'demo_employee_456';
      const demoEmail = role === 'admin' ? 'sintaro1945@gmail.com' : 'karyawan@absensigo.com';
      const demoName = role === 'admin' ? 'Administrator (Demo)' : 'Budi Karyawan (Demo)';

      const userRef = doc(db, 'users', demoUid);
      const userSnap = await getDoc(userRef).catch(() => null);

      const defaultProfile: UserProfile = {
        uid: demoUid,
        email: demoEmail,
        displayName: demoName,
        role: role,
        dailyRate: 175000,
        joinedDate: new Date().toISOString().split('T')[0],
        avatarUrl: '',
        phone: '08123456789',
      };

      if (!userSnap || !userSnap.exists()) {
        await setDoc(userRef, defaultProfile).catch(() => {});
      }

      localStorage.setItem('absensigo_demo_user', JSON.stringify(defaultProfile));
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Gagal masuk mode demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-white">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg mb-4 ring-4 ring-blue-500/30">
            <Clock className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent">
            AbsensiGo HRM
          </h1>
          <p className="text-slate-300 text-sm mt-2">
            Sistem Manajemen HR Profesional & Presensi PWA Karyawan dengan Selfie & Gaji Harian
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            {showDomainHelp && (
              <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-red-500/30">
                <strong>Catatan:</strong> Domain preview cloud run Anda belum terdaftar di Authorized Domains Firebase Console. Gunakan <strong>Masuk Admin</strong> atau <strong>Masuk Karyawan</strong> di bawah untuk menguji aplikasi secara instan tanpa kendala.
              </p>
            )}
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <Smartphone className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white">PWA Mobile Karyawan</h3>
              <p className="text-xs text-slate-300">Clock-In & Clock-Out dengan verifikasi foto selfie & lokasi GPS.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <Shield className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white">Backoffice Admin</h3>
              <p className="text-xs text-slate-300">Kelola data karyawan, jabatan, shift kerja, dan rekapitulasi kehadiran.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-xl transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {loading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/20"></div>
            <span className="flex-shrink mx-4 text-xs text-slate-400">Atau Akses Instan (Rekomendasi Preview)</span>
            <div className="flex-grow border-t border-white/20"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Shield className="w-4 h-4" /> Masuk Admin
            </button>

            <button
              onClick={() => handleDemoLogin('employee')}
              disabled={loading}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
            >
              <Users className="w-4 h-4" /> Masuk Karyawan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
