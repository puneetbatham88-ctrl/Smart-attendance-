import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Key, ShieldAlert, CheckCircle, LogOut, ExternalLink, 
  Sparkles, Smartphone, Play, HelpCircle, UserCheck, Lock
} from 'lucide-react';
import { User, Shift, PunchLog, NotificationLog, GeofenceConfig, SettingsPolicy, Branch, Department } from './types';
import { INITIAL_USERS, INITIAL_PUNCH_LOGS, INITIAL_NOTIFICATIONS, DEFAULT_SHIFTS, DEFAULT_BRANCHES, DEFAULT_DEPARTMENTS } from './data/mockData';
import EmployeeMobilePortal from './components/EmployeeMobilePortal';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [punchLogs, setPunchLogs] = useState<PunchLog[]>([]);
  const [notificationsLog, setNotificationsLog] = useState<NotificationLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [policy, setPolicy] = useState<SettingsPolicy>({
    weekends: [0, 6], // Sunday and Saturday
    halfDayThresholdHours: 4,
    halfDayAutoMark: true,
    devLoginRestricted: true, // Restricted to admin-only by default for secure dev workspace
    adminPasscode: 'admin123'
  });
  
  // Login input states
  const [emailInput, setEmailInput] = useState('');
  const [registerNameInput, setRegisterNameInput] = useState('');
  const [registerShift, setRegisterShift] = useState('morning');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Admin credentials / passcode gate states
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscodePrompt, setShowPasscodePrompt] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // 1. Initial State Loading from LocalStorage
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('sa_users');
      const storedShifts = localStorage.getItem('sa_shifts');
      const storedPunches = localStorage.getItem('sa_punches');
      const storedNotifies = localStorage.getItem('sa_notifies');
      const storedSession = localStorage.getItem('sa_session');
      const storedPolicy = localStorage.getItem('sa_policy');
      const storedBranches = localStorage.getItem('sa_branches');
      const storedDepartments = localStorage.getItem('sa_departments');

      if (storedUsers) setUsers(JSON.parse(storedUsers));
      else {
        setUsers(INITIAL_USERS);
        localStorage.setItem('sa_users', JSON.stringify(INITIAL_USERS));
      }

      if (storedShifts) setShifts(JSON.parse(storedShifts));
      else {
        setShifts(DEFAULT_SHIFTS);
        localStorage.setItem('sa_shifts', JSON.stringify(DEFAULT_SHIFTS));
      }

      if (storedBranches) setBranches(JSON.parse(storedBranches));
      else {
        setBranches(DEFAULT_BRANCHES);
        localStorage.setItem('sa_branches', JSON.stringify(DEFAULT_BRANCHES));
      }

      if (storedDepartments) setDepartments(JSON.parse(storedDepartments));
      else {
        setDepartments(DEFAULT_DEPARTMENTS);
        localStorage.setItem('sa_departments', JSON.stringify(DEFAULT_DEPARTMENTS));
      }

      if (storedPunches) setPunchLogs(JSON.parse(storedPunches));
      else {
        setPunchLogs(INITIAL_PUNCH_LOGS);
        localStorage.setItem('sa_punches', JSON.stringify(INITIAL_PUNCH_LOGS));
      }

      if (storedNotifies) setNotificationsLog(JSON.parse(storedNotifies));
      else {
        setNotificationsLog(INITIAL_NOTIFICATIONS);
        localStorage.setItem('sa_notifies', JSON.stringify(INITIAL_NOTIFICATIONS));
      }

      if (storedPolicy) {
        setPolicy(JSON.parse(storedPolicy));
      } else {
        localStorage.setItem('sa_policy', JSON.stringify({
          weekends: [0, 6],
          halfDayThresholdHours: 4,
          halfDayAutoMark: true,
          devLoginRestricted: true,
          adminPasscode: 'admin123'
        }));
      }

      if (storedSession) {
        setCurrentUser(JSON.parse(storedSession));
      }
    } catch (e) {
      console.error('Failed to parse local attendance data', e);
      setUsers(INITIAL_USERS);
      setShifts(DEFAULT_SHIFTS);
      setBranches(DEFAULT_BRANCHES);
      setDepartments(DEFAULT_DEPARTMENTS);
      setPunchLogs(INITIAL_PUNCH_LOGS);
      setNotificationsLog(INITIAL_NOTIFICATIONS);
    }
  }, []);

  // 1.5. Inactivity Auto-logout State & Logic
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(60);
  const lastActiveRef = React.useRef<number>(Date.now());

  useEffect(() => {
    if (!currentUser) {
      setShowInactivityWarning(false);
      return;
    }

    // Initialize/Reset activity timestamp on mount or when currentUser changes
    lastActiveRef.current = Date.now();

    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
    };

    // Track common visual and interactive user activity events
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActiveRef.current;
      const timeoutMs = 15 * 60 * 1000; // 15 minutes
      const warningMs = 14 * 60 * 1000; // 14 minutes (1-minute warning)

      if (elapsed >= timeoutMs) {
        // Force session termination and show informative feedback
        setCurrentUser(null);
        localStorage.removeItem('sa_session');
        setLoginError('You have been logged out due to 15 minutes of inactivity to protect sensitive attendance data.');
        setShowInactivityWarning(false);
      } else if (elapsed >= warningMs) {
        // Show remaining seconds in real-time
        const remainingSeconds = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setInactivityCountdown(remainingSeconds);
        setShowInactivityWarning(true);
      } else {
        setShowInactivityWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(checkInterval);
    };
  }, [currentUser]);

  // Sync utilities
  const syncUsersState = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('sa_users', JSON.stringify(updatedUsers));
  };

  const syncBranchesState = (updated: Branch[]) => {
    setBranches(updated);
    localStorage.setItem('sa_branches', JSON.stringify(updated));
  };

  const syncDepartmentsState = (updated: Department[]) => {
    setDepartments(updated);
    localStorage.setItem('sa_departments', JSON.stringify(updated));
  };

  const syncPunchesState = (updatedPunches: PunchLog[]) => {
    setPunchLogs(updatedPunches);
    localStorage.setItem('sa_punches', JSON.stringify(updatedPunches));
  };

  const syncNotificationsState = (updatedNotifies: NotificationLog[]) => {
    setNotificationsLog(updatedNotifies);
    localStorage.setItem('sa_notifies', JSON.stringify(updatedNotifies));
  };

  const syncPolicyState = (updatedPolicy: SettingsPolicy) => {
    setPolicy(updatedPolicy);
    localStorage.setItem('sa_policy', JSON.stringify(updatedPolicy));
  };

  const syncAllCollectionStates = (
    u: User[],
    s: Shift[],
    p: PunchLog[],
    n: NotificationLog[]
  ) => {
    setUsers(u);
    setShifts(s);
    setPunchLogs(p);
    setNotificationsLog(n);
    localStorage.setItem('sa_users', JSON.stringify(u));
    localStorage.setItem('sa_shifts', JSON.stringify(s));
    localStorage.setItem('sa_punches', JSON.stringify(p));
    localStorage.setItem('sa_notifies', JSON.stringify(n));
  };

  // 2. Authentication handlers
  const handleLoginAttempt = (user: User) => {
    setLoginError('');
    
    // Check if development restriction is enabled and user is not an admin
    if (policy.devLoginRestricted && user.role !== 'admin') {
      setLoginError('Development Lock Active: Non-administrator logins are strictly restricted during active development.');
      return;
    }

    // Check if admin passcode is configured
    if (user.role === 'admin' && policy.adminPasscode) {
      setPendingUser(user);
      setShowPasscodePrompt(true);
      setPasscodeInput('');
    } else {
      // Normal direct login
      setCurrentUser(user);
      localStorage.setItem('sa_session', JSON.stringify(user));
      setLoginError('');
    }
  };

  const handleQuickLogin = (user: User) => {
    handleLoginAttempt(user);
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    const matchedUser = users.find(u => u.email.toLowerCase() === emailInput.trim().toLowerCase());
    if (matchedUser) {
      if (matchedUser.status === 'inactive') {
        setLoginError('This profile is marked inactive. Contact your supervisor.');
        return;
      }
      handleLoginAttempt(matchedUser);
      setEmailInput('');
    } else {
      setLoginError('No user account discovered with this email. Click "Create Staff Account" to sign up!');
    }
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    const correctPasscode = policy.adminPasscode || 'admin123';
    if (passcodeInput === correctPasscode) {
      setCurrentUser(pendingUser);
      localStorage.setItem('sa_session', JSON.stringify(pendingUser));
      setLoginError('');
      setShowPasscodePrompt(false);
      setPendingUser(null);
      setPasscodeInput('');
    } else {
      setLoginError('Invalid Administrator Passcode. Please try again.');
    }
  };

  const handleRegisterAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (policy.devLoginRestricted) {
      setLoginError('Development Lock Active: Registering new staff accounts is disabled during development.');
      return;
    }
    if (!registerNameInput.trim() || !emailInput.trim()) {
      setLoginError('Please supply both full name and email.');
      return;
    }

    const emailExist = users.some(u => u.email.toLowerCase() === emailInput.trim().toLowerCase());
    if (emailExist) {
      setLoginError('This email is already in use by another account.');
      return;
    }

    const newPrfl: User = {
      id: `u-${Date.now()}`,
      name: registerNameInput.trim(),
      email: emailInput.toLowerCase().trim(),
      role: 'employee',
      defaultShiftId: registerShift,
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=150&q=80`,
      dndSettings: {
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        dndModeActive: false
      },
      status: 'active'
    };

    const updated = [...users, newPrfl];
    syncUsersState(updated);
    
    // Automatically log in
    setCurrentUser(newPrfl);
    localStorage.setItem('sa_session', JSON.stringify(newPrfl));
    
    // reset forms
    setRegisterNameInput('');
    setEmailInput('');
    setShowRegisterForm(false);
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sa_session');
  };

  // 3. Dynamic Punch In State triggers
  const handlePunchIn = (location: GeofenceConfig, notes: string, shiftId: string, requestedHalfDay?: boolean) => {
    if (!currentUser) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Resolve lateness status based on shift rules
    const assignedShift = shifts.find(s => s.id === shiftId) || shifts[0];
    
    // Calculate if late
    const [shiftHour, shiftMinute] = assignedShift.startTime.split(':');
    const shiftStartTimeToday = new Date();
    shiftStartTimeToday.setHours(parseInt(shiftHour, 10), parseInt(shiftMinute, 10), 0, 0);

    // Add grace minutes limit
    const graceThreshold = new Date(shiftStartTimeToday.getTime() + assignedShift.gracePeriodMinutes * 60000);
    
    // Lateness status resolver
    let punchStatus: PunchLog['status'] = requestedHalfDay ? 'half-day' : 'on-time';
    if (!requestedHalfDay && now > graceThreshold) {
      punchStatus = 'late';
    }

    // Geolocation verification
    // Mark as warning / coordinates failure if accuracy limit is simulated as exceeded, or selected "Anywhere" outside HQ boundaries
    const isOutOfBounds = location.name.includes("Simulated") || location.name.includes("Anywhere");
    const resolvedAccuracy = isOutOfBounds ? 1500 : 8 + Math.floor(Math.random() * 10);

    const newPunchRecord: PunchLog = {
      id: `p-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      date: today,
      punchInTime: now.toISOString(),
      punchOutTime: null,
      shiftId: assignedShift.id,
      shiftName: assignedShift.name,
      status: punchStatus,
      requestedHalfDay: requestedHalfDay,
      punchInLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        accuracy: resolvedAccuracy
      },
      punchOutLocation: null,
      notified: !currentUser.dndSettings.dndModeActive,
      dndSuppressed: currentUser.dndSettings.dndModeActive,
      notes: notes.trim()
    };

    // Appending record
    const updatedPunches = [newPunchRecord, ...punchLogs];
    syncPunchesState(updatedPunches);

    // Communication simulation dispatch
    const notificationMessage = `Dear ${currentUser.name}, your punch-in is recorded at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} for ${assignedShift.name} from ${location.name}.`;
    
    const notificationChannels: ('sms' | 'email' | 'push')[] = ['sms', 'email', 'push'];
    const newNotifications: NotificationLog[] = notificationChannels.map((channel, i) => {
      // check if channel is user enabled
      let channelEnabled = true;
      if (channel === 'sms') channelEnabled = currentUser.dndSettings.smsEnabled;
      if (channel === 'email') channelEnabled = currentUser.dndSettings.emailEnabled;
      if (channel === 'push') channelEnabled = currentUser.dndSettings.pushEnabled;

      const isSuppressed = currentUser.dndSettings.dndModeActive || !channelEnabled;

      return {
        id: `n-${Date.now()}-${i}`,
        userId: currentUser.id,
        userName: currentUser.name,
        title: 'Work attendance Logged',
        message: notificationMessage,
        timestamp: now.toISOString(),
        type: channel,
        status: isSuppressed ? 'suppressed' : 'sent'
      };
    });

    syncNotificationsState([...newNotifications, ...notificationsLog]);
  };

  // 4. Punch Out handlers
  const handlePunchOut = (location: GeofenceConfig) => {
    if (!currentUser) return;

    const now = new Date();

    // locate the uncompleted punch log
    const activePunchIndex = punchLogs.findIndex(p => p.userId === currentUser.id && p.punchOutTime === null);
    if (activePunchIndex === -1) return;

    const updatedPunches = [...punchLogs];
    const targetPunch = updatedPunches[activePunchIndex];

    const isOutOfBounds = location.name.includes("Simulated") || location.name.includes("Anywhere");
    const resolvedAccuracy = isOutOfBounds ? 1200 : 6 + Math.floor(Math.random() * 12);

    targetPunch.punchOutTime = now.toISOString();
    targetPunch.punchOutLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      accuracy: resolvedAccuracy
    };

    // Calculate hours worked to verify Half-Day policy threshold
    const punchInDate = new Date(targetPunch.punchInTime);
    const diffMs = now.getTime() - punchInDate.getTime();
    const hoursWorked = diffMs / (1000 * 60 * 60);

    let finalStatus = targetPunch.status;
    if (targetPunch.requestedHalfDay || (policy.halfDayAutoMark && hoursWorked < policy.halfDayThresholdHours)) {
      finalStatus = 'half-day';
    }
    targetPunch.status = finalStatus;

    // Overtime Calculation and Recording
    const isOvertimeEnabled = policy.overtimeEnabled !== false;
    const standardLimit = policy.standardWorkHours || 8;
    if (isOvertimeEnabled && hoursWorked > standardLimit) {
      targetPunch.overtimeMinutes = Math.max(0, Math.floor((hoursWorked - standardLimit) * 60));
      targetPunch.overtimeStatus = 'pending';
    } else {
      targetPunch.overtimeMinutes = 0;
      targetPunch.overtimeStatus = undefined;
    }

    targetPunch.notified = !currentUser.dndSettings.dndModeActive;
    targetPunch.dndSuppressed = currentUser.dndSettings.dndModeActive;

    syncPunchesState(updatedPunches);

    // Dispatch out notification
    const notificationMessage = `Dear ${currentUser.name}, you have successfully punched-out at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} via mobile GPS. See you on your next shift!`;
    
    const notificationChannels: ('sms' | 'email' | 'push')[] = ['sms', 'email', 'push'];
    const newNotifications: NotificationLog[] = notificationChannels.map((channel, i) => {
      let channelEnabled = true;
      if (channel === 'sms') channelEnabled = currentUser.dndSettings.smsEnabled;
      if (channel === 'email') channelEnabled = currentUser.dndSettings.emailEnabled;
      if (channel === 'push') channelEnabled = currentUser.dndSettings.pushEnabled;

      const isSuppressed = currentUser.dndSettings.dndModeActive || !channelEnabled;

      return {
        id: `n-${Date.now()}-${i}`,
        userId: currentUser.id,
        userName: currentUser.name,
        title: 'Duty Session Completed',
        message: notificationMessage,
        timestamp: now.toISOString(),
        type: channel,
        status: isSuppressed ? 'suppressed' : 'sent'
      };
    });

    syncNotificationsState([...newNotifications, ...notificationsLog]);
  };

  // 5. Update user-specific notification preferences
  const handleUpdateDnd = (settings: User['dndSettings']) => {
    if (!currentUser) return;

    const updatedCurrentUser = { ...currentUser, dndSettings: settings };
    setCurrentUser(updatedCurrentUser);
    localStorage.setItem('sa_session', JSON.stringify(updatedCurrentUser));

    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedCurrentUser : u);
    syncUsersState(updatedUsers);
  };

  // 6. Admin Panel User Provisions
  const handleAddNewUser = (userData: Partial<User> & Omit<User, 'id' | 'joinedDate' | 'dndSettings'>) => {
    const newUserRecord: User = {
      ...userData,
      id: `u-${Date.now()}`,
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: userData.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face`,
      dndSettings: {
        smsEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        dndModeActive: false
      }
    };

    const updated = [...users, newUserRecord];
    syncUsersState(updated);
  };

  // 7. Admin Panel Shift Guidelines modifier
  const handleUpdateShift = (
    shiftId: string, 
    startTime: string, 
    endTime: string, 
    gracePeriodMinutes: number, 
    overtimeAllowed?: boolean, 
    overtimeMultiplier?: number
  ) => {
    const updatedShifts = shifts.map(s => s.id === shiftId ? { ...s, startTime, endTime, gracePeriodMinutes, overtimeAllowed, overtimeMultiplier } : s);
    setShifts(updatedShifts);
    localStorage.setItem('sa_shifts', JSON.stringify(updatedShifts));
  };

  // 7b. Admin Panel User Profile & Role modifier
  const handleUpdateUser = (userId: string, updatedFields: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updatedFields } : u);
    syncUsersState(updatedUsers);
    if (currentUser && currentUser.id === userId) {
      const updatedCurrentUser = { ...currentUser, ...updatedFields };
      setCurrentUser(updatedCurrentUser);
      localStorage.setItem('sa_session', JSON.stringify(updatedCurrentUser));
    }
  };

  // 7c. Admin Panel Punch Log modifier
  const handleUpdatePunch = (punchId: string, updatedFields: Partial<PunchLog>) => {
    const updatedPunches = punchLogs.map(p => p.id === punchId ? { ...p, ...updatedFields } : p);
    syncPunchesState(updatedPunches);
  };

  // 8. Wipe Session Ledger Utility
  const handleClearLogs = () => {
    const confirmed = window.confirm("Are you sure you want to clear all punch attendance logs and communication records? Stored staff configurations will remain.");
    if (!confirmed) return;

    syncPunchesState([]);
    syncNotificationsState([]);
  };

  // 9. Admin Panel Biometrics Update Handler
  const handleUpdateUserBiometrics = (userId: string, biometrics: User['biometrics']) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, biometrics } : u);
    syncUsersState(updatedUsers);
  };

  // 9b. Update User Weekends Handler
  const handleUpdateUserWeekends = (userId: string, weekends: number[]) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, weekends } : u);
    syncUsersState(updatedUsers);
    if (currentUser && currentUser.id === userId) {
      const updatedCurrentUser = { ...currentUser, weekends };
      setCurrentUser(updatedCurrentUser);
      localStorage.setItem('sa_session', JSON.stringify(updatedCurrentUser));
    }
  };

  // 10. Admin Panel Bulk Add calculated biometric punches
  const handleBulkAddPunches = (newPunches: PunchLog[]) => {
    const updated = [...newPunches, ...punchLogs];
    syncPunchesState(updated);
  };

  // 11. Admin Panel Restore Backup Handler
  const handleRestoreBackup = (
    u: User[],
    s: Shift[],
    p: PunchLog[],
    n: NotificationLog[],
    pol: SettingsPolicy,
    b?: Branch[],
    dep?: Department[]
  ) => {
    setUsers(u);
    setShifts(s);
    setPunchLogs(p);
    setNotificationsLog(n);
    setPolicy(pol);
    localStorage.setItem('sa_users', JSON.stringify(u));
    localStorage.setItem('sa_shifts', JSON.stringify(s));
    localStorage.setItem('sa_punches', JSON.stringify(p));
    localStorage.setItem('sa_notifies', JSON.stringify(n));
    localStorage.setItem('sa_policy', JSON.stringify(pol));

    if (b) {
      setBranches(b);
      localStorage.setItem('sa_branches', JSON.stringify(b));
    }
    if (dep) {
      setDepartments(dep);
      localStorage.setItem('sa_departments', JSON.stringify(dep));
    }

    if (currentUser) {
      const restoredCurrentUser = u.find(user => user.id === currentUser.id && user.role === 'admin');
      if (restoredCurrentUser) {
        setCurrentUser(restoredCurrentUser);
        localStorage.setItem('sa_session', JSON.stringify(restoredCurrentUser));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100" id="applet-primary-root">
      
      {/* 1. Global Navigation Bar */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0 shadow-xs" id="applet-navbar">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-500/10">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
              Smart Attendance Track
              <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-sky-100">Mobile Geofenced</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Multi-user shifts & custom real-time reporting</span>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-3 py-1 bg-slate-50 rounded-xl text-xs font-semibold">
              <span className="text-slate-400">Roster View:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                ${currentUser.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-sky-50 text-sky-600 border border-sky-100'}`}
              >
                {currentUser.role}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-extrabold transition-all outline-none rounded-xl cursor-pointer"
              id="global-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. Main app display section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col justify-center items-center" id="main-content-layout">
        <AnimatePresence mode="wait">
          
          {/* RENDER LOGIN PORTAL OUT-OF-SESSION */}
          {!currentUser ? (
            <motion.div
              key="auth-gate"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg space-y-6"
              id="login-auth-chassis"
            >
              
              <div className="text-center space-y-2 mb-2">
                <h2 className="text-3xl font-extrabold font-sans text-slate-800 tracking-tight">Access HR Attendance Gateway</h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                  Connect via personal credentials to market your mobile attendance, check geofenced status, or configure compliance guidelines.
                </p>
              </div>

              {/* Login box */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6">
                
                <AnimatePresence mode="wait">
                  {showPasscodePrompt ? (
                    <motion.form
                      key="passcodeform"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      onSubmit={handleVerifyPasscode}
                      className="space-y-4"
                      id="admin-passcode-form"
                    >
                      <div className="text-center pb-2">
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                          <Key className="h-6 w-6 animate-pulse" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Admin Passcode Required</h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                          The developer has restricted access. Enter the Admin Passcode to login.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Verification Passcode</label>
                        <input 
                          type="password" 
                          required
                          placeholder="••••••••" 
                          autoFocus
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center text-sm font-mono font-bold tracking-widest outline-none text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/50"
                          value={passcodeInput}
                          onChange={(e) => setPasscodeInput(e.target.value)}
                          id="passcode-verification-input"
                        />
                      </div>

                      {loginError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-2xl flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col gap-3">
                        <button 
                          type="submit"
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl border-0 font-bold shadow-md cursor-pointer tracking-wider text-xs uppercase"
                          id="verify-passcode-submit"
                        >
                          Verify & Unlock
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setShowPasscodePrompt(false); setPendingUser(null); setLoginError(''); }}
                          className="text-xs text-slate-500 font-bold hover:underline py-1 outline-none border-0 bg-transparent cursor-pointer"
                        >
                          Cancel Verification
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="standard-login"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      {/* QUICK LOGIN CHOOSE ACCOUNTS PANEL */}
                      <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100" id="quick-choose-user">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Quick Testing Profiles (Single-Click Bypass)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Admin selector */}
                          <button
                            onClick={() => handleQuickLogin(users.find(u => u.role === 'admin') || INITIAL_USERS[0])}
                            className="p-3 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl text-left select-none outline-none cursor-pointer transition-all flex items-center gap-2 relative overflow-hidden"
                            id="quick-login-admin"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700 block">Supervisor</span>
                                {policy.devLoginRestricted && (
                                  <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded uppercase tracking-wider">Lock Active</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-medium">admin@company.com</span>
                            </div>
                          </button>
                          
                          {/* Employee selector */}
                          <button
                            onClick={() => handleQuickLogin(users.find(u => u.email === 'david@company.com') || INITIAL_USERS[1])}
                            className={`p-3 bg-white text-left select-none outline-none cursor-pointer transition-all flex items-center gap-2 relative border ${
                              policy.devLoginRestricted ? 'opacity-50 cursor-not-allowed border-dashed border-slate-200 hover:bg-white' : 'hover:bg-sky-50 border-slate-200/80 hover:border-sky-200'
                            } rounded-xl`}
                            id="quick-login-employee"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-slate-700 block truncate">David Miller</span>
                                {policy.devLoginRestricted && <Lock className="h-2.5 w-2.5 text-rose-500 shrink-0" />}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-medium truncate">david@company.com</span>
                            </div>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {/* Neo Reeves selector */}
                          <button
                            onClick={() => handleQuickLogin(users.find(u => u.email === 'neo@company.com') || INITIAL_USERS[3])}
                            className={`p-3 bg-white text-left select-none outline-none cursor-pointer transition-all flex items-center gap-2 relative border ${
                              policy.devLoginRestricted ? 'opacity-50 cursor-not-allowed border-dashed border-slate-200 hover:bg-white' : 'hover:bg-sky-50 border-slate-200/80 hover:border-sky-200'
                            } rounded-xl`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-slate-700 block truncate">Neo (Night Shift)</span>
                                {policy.devLoginRestricted && <Lock className="h-2.5 w-2.5 text-rose-500 shrink-0" />}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-medium truncate">neo@company.com</span>
                            </div>
                          </button>

                          {/* Sarah Connor (DND Active Selector) */}
                          <button
                            onClick={() => handleQuickLogin(users.find(u => u.email === 'sarah@company.com') || INITIAL_USERS[2])}
                            className={`p-3 bg-white text-left select-none outline-none cursor-pointer transition-all flex items-center gap-2 relative border ${
                              policy.devLoginRestricted ? 'opacity-50 cursor-not-allowed border-dashed border-slate-200 hover:bg-white' : 'hover:bg-amber-50 border-slate-200/80 hover:border-amber-200'
                            } rounded-xl`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-slate-700 block truncate">Sarah (Muted DND)</span>
                                {policy.devLoginRestricted && <Lock className="h-2.5 w-2.5 text-rose-500 shrink-0" />}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-medium truncate">sarah@company.com</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="relative flex items-center justify-center my-2" id="divider-or">
                        <div className="absolute inset-0 border-t border-slate-100 flex items-center"></div>
                        <span className="relative bg-white px-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Or Use Custom Email Credential</span>
                      </div>

                      {loginError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-2xl flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      {/* EMAIL LOGIN SCREEN FORM */}
                      <div id="email-form-canvas">
                        <AnimatePresence mode="wait">
                          {showRegisterForm ? (
                            <motion.form 
                              key="regform"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              onSubmit={handleRegisterAccount} 
                              className="space-y-4"
                            >
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Your Full Name</label>
                                <input 
                                  type="text" 
                                  required
                                  placeholder="e.g. Ob-Wan Kenobi" 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/50"
                                  value={registerNameInput}
                                  onChange={(e) => setRegisterNameInput(e.target.value)}
                                  id="reg-input-name"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Preferred Shift</label>
                                <select 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                                  value={registerShift}
                                  onChange={(e) => setRegisterShift(e.target.value)}
                                  id="reg-input-shift"
                                >
                                  <option value="morning">Morning Duty (08:00 - 16:00)</option>
                                  <option value="evening">Evening Duty (16:00 - 00:00)</option>
                                  <option value="night">Night Duty (00:00 - 08:00)</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Email ID</label>
                                <input 
                                  type="email" 
                                  required
                                  placeholder="obiwan@jediorder.org" 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/50"
                                  value={emailInput}
                                  onChange={(e) => setEmailInput(e.target.value)}
                                  id="reg-input-email"
                                />
                              </div>

                              <div className="pt-2 flex flex-col gap-3">
                                <button 
                                  type="submit"
                                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-90 hover:shadow-indigo-500/10 text-white rounded-2xl border-0 font-bold shadow-md cursor-pointer tracking-wider text-xs uppercase"
                                  id="signup-submit-btn"
                                >
                                  Create Employee Account
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => { setShowRegisterForm(false); setLoginError(''); }}
                                  className="text-xs text-indigo-500 font-bold hover:underline py-1 outline-none border-0 bg-transparent cursor-pointer"
                                >
                                  Return to Sign In
                                </button>
                              </div>
                            </motion.form>
                          ) : (
                            <motion.form 
                              key="loginform"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              onSubmit={handleCustomLogin} 
                              className="space-y-4"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Worker Email Address</label>
                                  {policy.devLoginRestricted && (
                                    <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider">
                                      <Lock className="h-2 w-2" /> Admin Only
                                    </span>
                                  )}
                                </div>
                                <input 
                                  type="email" 
                                  required
                                  placeholder="e.g. employee@company.com" 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/50"
                                  value={emailInput}
                                  onChange={(e) => setEmailInput(e.target.value)}
                                  id="login-input-email"
                                />
                              </div>

                              <div className="pt-2 flex flex-col gap-3">
                                <button 
                                  type="submit"
                                  className="w-full py-3 bg-slate-900 hover:bg-sky-600 hover:shadow-sky-500/10 text-white rounded-2xl border-0 font-bold tracking-wider text-xs uppercase transition-all cursor-pointer"
                                  id="login-submit-btn"
                                >
                                  Enter Suite
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => { if (!policy.devLoginRestricted) { setShowRegisterForm(true); setLoginError(''); } }}
                                  className={`text-xs font-bold py-1 outline-none border-0 bg-transparent ${
                                    policy.devLoginRestricted ? 'text-slate-400 cursor-not-allowed line-through' : 'text-sky-600 hover:underline cursor-pointer'
                                  }`}
                                  disabled={policy.devLoginRestricted}
                                  id="go-to-signup-btn"
                                >
                                  {policy.devLoginRestricted ? 'Registration Disabled (Dev Lock)' : 'Or Register New Staff Account'}
                                </button>
                              </div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </motion.div>
          ) : (
            
            /* RENDER ACTIVE USER ROLE DISPATCH ROUTE PANEL */
            <motion.div
              key="active-suite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center self-stretch"
              id="active-attendance-space"
            >
              <AnimatePresence mode="wait">
                {currentUser.role === 'admin' ? (
                  <motion.div
                    key="admin-space"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <AdminPanel
                      currentUser={currentUser}
                      users={users}
                      shifts={shifts}
                      punchLogs={punchLogs}
                      notificationsLog={notificationsLog}
                      policy={policy}
                      branches={branches}
                      departments={departments}
                      onUpdateBranches={syncBranchesState}
                      onUpdateDepartments={syncDepartmentsState}
                      onUpdatePolicy={syncPolicyState}
                      onAddUser={handleAddNewUser}
                      onUpdateShift={handleUpdateShift}
                      onClearLogs={handleClearLogs}
                      onUpdateUserBiometrics={handleUpdateUserBiometrics}
                      onAddPunches={handleBulkAddPunches}
                      onUpdateUserWeekends={handleUpdateUserWeekends}
                      onUpdateUser={handleUpdateUser}
                      onUpdatePunch={handleUpdatePunch}
                      onRestoreBackup={handleRestoreBackup}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="employee-mobile-space"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full flex justify-center"
                  >
                    <EmployeeMobilePortal
                      user={currentUser}
                      shifts={shifts}
                      punchLogs={punchLogs}
                      notificationsLog={notificationsLog}
                      policy={policy}
                      onPunchIn={handlePunchIn}
                      onPunchOut={handlePunchOut}
                      onUpdateDnd={handleUpdateDnd}
                      onLogout={handleLogout}
                      onUpdateUserWeekends={handleUpdateUserWeekends}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

          )}

        </AnimatePresence>
      </main>

      {/* 3. Humble footer credit */}
      <footer className="py-6 px-6 border-t border-slate-150 text-center select-none text-[10px] text-slate-400 shrink-0 font-medium font-sans" id="applet-footer">
        &copy; {new Date().getFullYear()} Active Staffing Solutions Ltd. Fully geofenced workspace simulation using client-side persistent ledger engines.
      </footer>

      {/* 4. Inactivity Warning Modal */}
      <AnimatePresence>
        {showInactivityWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            id="inactivity-warning-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 text-center"
              id="inactivity-warning-card"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center mx-auto animate-bounce">
                <Lock className="h-8 w-8 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  Inactivity Auto-Logout Warning
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  You have been inactive for a while. To protect sensitive biometric logs and employee attendance data, you will be automatically logged out in:
                </p>
              </div>

              {/* Countdown circle or bar display */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center space-y-1">
                <span className="font-mono text-3xl font-extrabold text-indigo-600 tracking-tight">
                  {inactivityCountdown}s
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Remaining Time
                </span>
                {/* Visual animated bar indicating progress */}
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-3">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: `${(inactivityCountdown / 60) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-amber-500 to-indigo-600 rounded-full animate-pulse"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    lastActiveRef.current = Date.now();
                    setShowInactivityWarning(false);
                  }}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold border-0 text-xs tracking-wider uppercase cursor-pointer outline-none transition-all shadow-md"
                  id="keep-me-logged-in-btn"
                >
                  Stay Logged In
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-3 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl font-bold border border-slate-200/60 text-xs tracking-wider uppercase cursor-pointer outline-none transition-all"
                  id="inactivity-logout-now-btn"
                >
                  Logout Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
