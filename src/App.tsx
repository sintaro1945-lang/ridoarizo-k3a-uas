import React, { useState, useEffect } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Position, WorkSetting, AttendanceRecord, PayrollRecord } from './types';
import AuthScreen from './components/AuthScreen';
import AdminBackoffice from './components/AdminBackoffice';
import EmployeePWA from './components/EmployeePWA';
import { Loader2, Monitor, Smartphone } from 'lucide-react';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Collections state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [workSetting, setWorkSetting] = useState<WorkSetting | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

  // View mode switcher: 'admin' (Back Office Management) vs 'pwa' (Mobile-First Employee App)
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'pwa'>('admin');

  useEffect(() => {
    const demoUserStr = localStorage.getItem('absensigo_demo_user');
    if (demoUserStr) {
      try {
        const demoProfile = JSON.parse(demoUserStr) as UserProfile;
        setCurrentUserProfile(demoProfile);
        setFirebaseUser({ uid: demoProfile.uid, email: demoProfile.email } as any);
        setLoadingAuth(false);
        return;
      } catch (e) {
        localStorage.removeItem('absensigo_demo_user');
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setCurrentUserProfile(userSnap.data() as UserProfile);
          } else {
            const isAdmin = user.email === 'sintaro1945@gmail.com' || user.email?.includes('admin');
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Karyawan',
              role: isAdmin ? 'admin' : 'employee',
              dailyRate: 150000,
              joinedDate: new Date().toISOString().split('T')[0],
              avatarUrl: user.photoURL || '',
            };
            await setDoc(userRef, defaultProfile);
            setCurrentUserProfile(defaultProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUserProfile(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to Firestore collections when authenticated
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => list.push(d.data() as UserProfile));
        setUsers(list);
        const current = list.find((u) => u.uid === firebaseUser.uid);
        if (current) setCurrentUserProfile(current);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubPositions = onSnapshot(
      collection(db, 'positions'),
      (snap) => {
        const list: Position[] = [];
        snap.forEach((d) => list.push(d.data() as Position));
        setPositions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'positions')
    );

    const unsubWorkSetting = onSnapshot(
      doc(db, 'work_settings', 'default_setting'),
      (snap) => {
        if (snap.exists()) {
          setWorkSetting(snap.data() as WorkSetting);
        } else {
          setWorkSetting({
            id: 'default_setting',
            workStart: '08:00',
            workEnd: '17:00',
            lateToleranceMinutes: 15,
            workDays: 'Senin - Jumat',
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'work_settings/default_setting')
    );

    const unsubAttendance = onSnapshot(
      collection(db, 'attendance'),
      (snap) => {
        const list: AttendanceRecord[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AttendanceRecord));
        setAttendanceList(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'attendance')
    );

    const unsubPayrolls = onSnapshot(
      collection(db, 'payrolls'),
      (snap) => {
        const list: PayrollRecord[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as PayrollRecord));
        setPayrolls(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payrolls')
    );

    return () => {
      unsubUsers();
      unsubPositions();
      unsubWorkSetting();
      unsubAttendance();
      unsubPayrolls();
    };
  }, [firebaseUser]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Memuat AbsensiGo Gold...</p>
      </div>
    );
  }

  if (!firebaseUser || !currentUserProfile) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Floating Pill Mode Switcher Bar matching user screenshot */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 py-2.5 px-4 flex justify-center sticky top-0 z-50">
        <div className="bg-slate-950 p-1 rounded-full border border-slate-800 flex items-center max-w-md w-full shadow-2xl">
          <button
            onClick={() => setAdminViewMode('admin')}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black flex items-center justify-center gap-2 transition-all ${
              adminViewMode === 'admin'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" /> Back Office Management
          </button>
          <button
            onClick={() => setAdminViewMode('pwa')}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black flex items-center justify-center gap-2 transition-all ${
              adminViewMode === 'pwa'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Mobile-First Employee App
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {adminViewMode === 'admin' ? (
          <AdminBackoffice
            currentUser={currentUserProfile}
            users={users}
            positions={positions}
            workSetting={workSetting}
            attendanceList={attendanceList}
            payrolls={payrolls}
            onSwitchToEmployeePWA={() => setAdminViewMode('pwa')}
          />
        ) : (
          <EmployeePWA
            currentUser={currentUserProfile}
            positions={positions}
            workSetting={workSetting}
            onSwitchToAdmin={currentUserProfile.role === 'admin' ? () => setAdminViewMode('admin') : undefined}
          />
        )}
      </div>
    </div>
  );
}
