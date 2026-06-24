import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, MapPin, CheckCircle, AlertOctagon, BellOff, Bell, LogOut, 
  Smartphone, Signal, Wifi, Battery, ChevronRight, MessageSquare, History, Award, Mail,
  QrCode, Camera, Scan, RefreshCw, Play, Volume2, VolumeX, ShieldAlert
} from 'lucide-react';
import { User, Shift, PunchLog, GeofenceConfig, SettingsPolicy, NotificationLog } from '../types';
import { DEFAULT_GEOFENCES } from '../data/mockData';

interface EmployeeMobilePortalProps {
  user: User;
  shifts: Shift[];
  punchLogs: PunchLog[];
  notificationsLog?: NotificationLog[];
  policy: SettingsPolicy;
  onPunchIn: (location: GeofenceConfig, notes: string, shiftId: string, requestedHalfDay?: boolean) => void;
  onPunchOut: (location: GeofenceConfig) => void;
  onUpdateDnd: (dndSettings: User['dndSettings']) => void;
  onLogout: () => void;
  onUpdateUserWeekends: (userId: string, weekends: number[]) => void;
}

export default function EmployeeMobilePortal({
  user,
  shifts,
  punchLogs,
  notificationsLog = [],
  policy,
  onPunchIn,
  onPunchOut,
  onUpdateDnd,
  onLogout,
  onUpdateUserWeekends
}: EmployeeMobilePortalProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedGeo, setSelectedGeo] = useState<GeofenceConfig>(DEFAULT_GEOFENCES[0]);
  const [notes, setNotes] = useState('');
  const [requestHalfDay, setRequestHalfDay] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', body: '', isSuppressed: false });
  const [activeMobileTab, setActiveMobileTab] = useState<'punch' | 'qr-scan' | 'notifications'>('punch');

  // QR Code Proximity Scanner State
  const [scannerResult, setScannerResult] = useState<'idle' | 'success' | 'out-of-range' | 'invalid'>('idle');
  const [scannedLocationName, setScannedLocationName] = useState('');
  const [scannerDistance, setScannerDistance] = useState(0);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [manualPayloadInput, setManualPayloadInput] = useState('');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Camera feed effect
  useEffect(() => {
    if (activeMobileTab === 'qr-scan' && cameraEnabled) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Camera stream denied or unavailable:", err);
          setCameraEnabled(false);
        });
    } else {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    }
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeMobileTab, cameraEnabled]);

  // Audio synthesizer beep
  const playScanBeep = (type: 'success' | 'error') => {
    if (!beepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        oscillator.stop(audioCtx.currentTime + 0.12);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(160, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch (err) {
      console.warn("Audio Context beep suppressed.", err);
    }
  };

  // Haversine formula to compute distance in meters between two geolocations
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Radius of the Earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Processes QR payload string and triggers corresponding punch state if proximity checked
  const handleQRScan = (payloadText: string) => {
    if (!payloadText.trim()) return;
    setIsScanningActive(true);
    setScannerResult('idle');
    
    setTimeout(() => {
      setIsScanningActive(false);
      try {
        const data = JSON.parse(payloadText.trim());
        if (data.v !== 'workspace-auth-v1' || !data.name || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
          throw new Error('Invalid signature');
        }
        
        setScannedLocationName(data.name);
        
        // Compute distance
        const dist = getDistanceMeters(
          selectedGeo.latitude, 
          selectedGeo.longitude, 
          data.lat, 
          data.lng
        );
        
        setScannerDistance(dist);
        
        // Resolve if "Anywhere" option was selected for GPS simulation or distance falls in workspace boundary
        const isAnywhere = selectedGeo.radiusMeters > 5000 || data.r > 5000;
        const inRange = isAnywhere || dist <= data.r;
        
        if (inRange) {
          playScanBeep('success');
          setScannerResult('success');
          
          // Match geofence data
          const resolvedGeo: GeofenceConfig = {
            name: data.name,
            latitude: data.lat,
            longitude: data.lng,
            radiusMeters: data.r
          };
          
          // Perform automatic check-in / check-out
          if (activePunch) {
            onPunchOut(resolvedGeo);
            
            const isDnd = user.dndSettings.dndModeActive || !user.dndSettings.pushEnabled;
            setToastMessage({
              title: 'Proximity Check-Out Auth',
              body: `Gate automated punch-out completed at ${formatTime(new Date())} via QR scan.`,
              isSuppressed: isDnd
            });
            setShowNotificationToast(true);
            setTimeout(() => setShowNotificationToast(false), 5000);
          } else {
            onPunchIn(resolvedGeo, "Automated check-in generated via proximity QR scan clearance.", activeShift.id, false);
            
            const isDnd = user.dndSettings.dndModeActive || !user.dndSettings.pushEnabled;
            setToastMessage({
              title: 'Proximity Check-In Auth',
              body: `Gate automated punch-in completed at ${formatTime(new Date())} for ${activeShift.name}.`,
              isSuppressed: isDnd
            });
            setShowNotificationToast(true);
            setTimeout(() => setShowNotificationToast(false), 5000);
          }
          
        } else {
          playScanBeep('error');
          setScannerResult('out-of-range');
        }
        
      } catch (err) {
        console.error("Failed to parse scan package:", err);
        playScanBeep('error');
        setScannerResult('invalid');
      }
    }, 1250); // delay to simulate high-fidelity camera focusing scan line sweep
  };

  // Format time utilities
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Detect appropriate shift based on current hour
  const getAutoDetectedShift = () => {
    const hours = currentTime.getHours();
    
    // Simple logic matching DEF_SHIFTS:
    // Morning: 08:00 - 16:00 (hours 8 to 15)
    // Evening: 16:00 - 00:00 (hours 16 to 23)
    // Night: 00:00 - 08:00 (hours 0 to 7)
    if (hours >= 8 && hours < 16) {
      return shifts.find(s => s.id === 'morning') || shifts[0];
    } else if (hours >= 16 && hours < 24) {
      return shifts.find(s => s.id === 'evening') || shifts[1];
    } else {
      return shifts.find(s => s.id === 'night') || shifts[2];
    }
  };

  const activeShift = getAutoDetectedShift();

  const todayDayIndex = currentTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const userWeekends = user.weekends !== undefined ? user.weekends : (policy?.weekends || [0, 6]);
  const isWeekendToday = userWeekends.includes(todayDayIndex);

  // Find if user currently has an unresolved active punch (In without Out)
  const activePunch = punchLogs.find(
    log => log.userId === user.id && log.date === currentTime.toISOString().split('T')[0] && log.punchOutTime === null
  ) || punchLogs.find(log => log.userId === user.id && log.punchOutTime === null); // fallback to any uncompleted punch

  // Statistics for this specific employee
  const employeeLogs = punchLogs.filter(log => log.userId === user.id);
  const totalPunches = employeeLogs.length;
  const latePunches = employeeLogs.filter(log => log.status === 'late').length;
  const onTimeRate = totalPunches > 0 ? Math.round(((totalPunches - latePunches) / totalPunches) * 100) : 100;
  
  // Hours worked calculation
  const totalWorkedMinutes = employeeLogs.reduce((acc, log) => {
    if (log.punchInTime && log.punchOutTime) {
      const diffMs = new Date(log.punchOutTime).getTime() - new Date(log.punchInTime).getTime();
      return acc + Math.round(diffMs / (1000 * 60));
    }
    return acc;
  }, 0);
  const formattedHours = (totalWorkedMinutes / 60).toFixed(1);

  // Filter specific employee notifications and compute unread active alerts count
  const myNotifications = notificationsLog.filter(n => n.userId === user.id);
  const unreadCount = myNotifications.filter(n => n.status === 'sent').length;

  const handlePunchClick = () => {
    if (activePunch) {
      // PUNCH OUT
      onPunchOut(selectedGeo);
      
      const isDnd = user.dndSettings.dndModeActive || !user.dndSettings.pushEnabled;
      setToastMessage({
        title: 'Punch-Out Logged',
        body: `Successful check-out at ${formatTime(new Date())} via ${selectedGeo.name}.`,
        isSuppressed: isDnd
      });
      setShowNotificationToast(true);
      setTimeout(() => setShowNotificationToast(false), 5000);
    } else {
      // PUNCH IN
      onPunchIn(selectedGeo, notes, activeShift.id, requestHalfDay);
      setNotes('');
      setRequestHalfDay(false);
      
      const isDnd = user.dndSettings.dndModeActive || !user.dndSettings.pushEnabled;
      setToastMessage({
        title: 'Punch-In Logged',
        body: `Successful check-in at ${formatTime(new Date())} for ${activeShift.name}.`,
        isSuppressed: isDnd
      });
      setShowNotificationToast(true);
      setTimeout(() => setShowNotificationToast(false), 5000);
    }
  };

  // Keyboard Shortcuts listener (Ctrl+Enter for Punch In, Ctrl+Shift+Enter for Punch Out)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Ctrl + Shift + Enter -> Punch Out
          e.preventDefault();
          if (activePunch) {
            handlePunchClick();
          }
        } else {
          // Ctrl + Enter -> Punch In
          e.preventDefault();
          if (!activePunch) {
            handlePunchClick();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePunch, selectedGeo, notes, activeShift, requestHalfDay, user, onPunchIn, onPunchOut]);

  const toggleDnd = (field: keyof User['dndSettings']) => {
    const updated = { ...user.dndSettings };
    if (field === 'dndModeActive') {
      updated.dndModeActive = !updated.dndModeActive;
    } else if (field === 'smsEnabled') {
      updated.smsEnabled = !updated.smsEnabled;
    } else if (field === 'emailEnabled') {
      updated.emailEnabled = !updated.emailEnabled;
    } else if (field === 'pushEnabled') {
      updated.pushEnabled = !updated.pushEnabled;
    }
    onUpdateDnd(updated);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4 px-2 select-none" id="emp-portal-container">
      
      {/* LEFT: Context Panel (Helper panel outside mobile frame explaining mechanics) */}
      <div className="w-full lg:w-96 text-slate-600 space-y-4 max-w-md" id="mechanics-brief">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-3">
            <Award className="h-5 w-5" />
            <span>Interactive Guide</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Mobile Geotrack Simulator</h3>
          <p className="text-sm leading-relaxed mb-4">
            Simulate how field workers record daily attendance on their mobile phones. Use the coordinates dropdown to test geofencing rules!
          </p>

          <div className="space-y-3 mt-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-700 block mb-1">⏰ Auto Shift Resolution</span>
              Automatically matches the punch record into the closest shift depending on actual punch-in time.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-700 block mb-1">📡 Smart Geofencing</span>
              HQ, Downtown Office and Labs have built-in geo boundaries. Choosing "Anywhere" simulates unconstrained road work, while some custom points trigger warnings.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-700 block mb-1">🔕 Suppressed DND Alerts</span>
              When "Do Not Disturb" mode is on, punch activities are archived securely but notifications are cleanly filtered.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-700 block mb-1">⌨️ Keyboard Shortcuts</span>
              Use <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-3xs">Ctrl+Enter</kbd> to punch-in or <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-3xs">Ctrl+Shift+Enter</kbd> to punch-out directly.
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Beautiful Simulated Smartphone Frame */}
      <div className="relative" id="smartphone-chassis">
        {/* Physical outer telephone boundary */}
        <div className="w-[380px] h-[780px] bg-slate-900 rounded-[50px] p-3.5 shadow-2xl border-4 border-slate-800 relative ring-12 ring-slate-900/10">
          
          {/* Ear Speaker & Notch Camera */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-full z-50 flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-800 rounded-full mb-1"></div>
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full ml-2 mb-1"></div>
          </div>

          {/* Internal Mobile Screen Container */}
          <div className="w-full h-full bg-slate-50 rounded-[40px] overflow-hidden flex flex-col relative border border-slate-950/20">
            
            {/* 1. Mobile Status Bar */}
            <div className="h-10 bg-slate-50 px-6 pt-3 flex justify-between items-center text-[11px] font-semibold text-slate-700 select-none z-10 shrink-0">
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              <div className="flex items-center gap-1.5">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <Battery className="h-3.5 w-3.5" />
                <span className="text-[10px]">94%</span>
              </div>
            </div>

            {/* Interactive Notification Overlay Banner */}
            <AnimatePresence>
              {showNotificationToast && (
                <motion.div
                  initial={{ opacity: 0, y: -80, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -80, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute top-11 left-4 right-4 z-50 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl p-3.5 flex items-start gap-3"
                  id="mobile-push-banner"
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${toastMessage.isSuppressed ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {toastMessage.isSuppressed ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                        {toastMessage.isSuppressed ? 'DND Suppressed Alert' : 'System Notification'}
                      </span>
                      <span className="text-[9px] text-slate-400">Just now</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 mt-0.5">{toastMessage.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {toastMessage.isSuppressed 
                        ? "DND mode is active. This notification was blocked from vibrating/alerting the device but registered in database."
                        : toastMessage.body
                      }
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile App Scrollable Canvas Area */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2 scrollbar-none" id="mobile-scroll-body">
              
              {/* Header Profile & Logout */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Welcome Back</span>
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">{user.name}</h4>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 rounded-full bg-slate-200/50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                  title="Logout"
                  id="mobile-logout-btn"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {activeMobileTab === 'punch' ? (
                <div className="space-y-5 animate-fade-in" id="mobile-punch-tab">
                  {/* Live Digital Clock Panel */}
                  <div className="bg-slate-900 rounded-3xl p-5 text-white relative overflow-hidden shadow-md">
                    <div className="absolute right-[-15px] top-[-15px] w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Live Timestamp</span>
                      <div className="flex items-center gap-1 text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-emerald-300 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Clock Active</span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-mono font-bold tracking-tight mb-0.5">
                      {formatTime(currentTime)}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(currentTime)}
                    </p>
                  </div>

                  {/* Alert if today is configured as a weekend day */}
                  {isWeekendToday && (
                    <div className="bg-amber-50 text-amber-800 p-3.5 rounded-2xl border border-amber-200/60 flex items-center gap-2.5 shadow-2xs font-sans">
                      <AlertOctagon className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-[10.5px] font-semibold leading-normal">
                        Scheduled Weekend Duty mode active. Keep in mind weekend compliance applies!
                      </span>
                    </div>
                  )}

                  {/* Automatic Shift Recommendation Info */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1.5">Auto-Shift Detection</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{activeShift.name}</span>
                        <span className="text-[10px] text-slate-500">Scheduled: {activeShift.startTime} - {activeShift.endTime}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                        ${activeShift.id === 'morning' ? 'bg-emerald-50 text-emerald-600' : 
                          activeShift.id === 'evening' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}
                      >
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Simulated GPS Coordinate Controller */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
                    <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block mb-2">Simulate Mobile GPS</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl text-xs border border-slate-100">
                        <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                        <select 
                          className="bg-transparent font-medium text-slate-700 outline-none w-full cursor-pointer border-0 outline-none focus:outline-none"
                          value={selectedGeo.name}
                          onChange={(e) => {
                            const zone = DEFAULT_GEOFENCES.find(g => g.name === e.target.value);
                            if (zone) setSelectedGeo(zone);
                          }}
                          id="gps-simulation-select"
                        >
                          {DEFAULT_GEOFENCES.map(g => (
                            <option key={g.name} value={g.name}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-1">
                        <span>Lat: {selectedGeo.latitude.toFixed(4)}</span>
                        <span>Lng: {selectedGeo.longitude.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Note Input Box when check-in is pending */}
                  {!activePunch && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
                        <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1.5">Shift Notes (Optional)</label>
                        <textarea 
                          className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none font-sans"
                          placeholder="Provide optional details (e.g. Traffic, Client site delay...)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          id="mobile-punch-notes"
                        />
                      </div>

                      {/* Half-Day shift request toggler */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-700 block">Request Half-Day Shift</span>
                          <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">Check-in with automatic half-day attendance credit</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRequestHalfDay(!requestHalfDay)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none relative outline-none border-0 cursor-pointer
                            ${requestHalfDay ? 'bg-sky-500' : 'bg-slate-300'}`}
                          id="request-halfday-toggle"
                        >
                          <motion.div 
                            layout
                            className={`w-4 h-4 bg-white rounded-full shadow-md`}
                            animate={{ x: requestHalfDay ? 16 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* LARGE MASSIVE PUNCH BUTTON */}
                  <div className="flex flex-col items-center justify-center py-2" id="punch-dial-container">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handlePunchClick}
                      className={`w-36 h-36 rounded-full flex flex-col items-center justify-center text-white font-bold relative shadow-xl select-none outline-none focus:outline-none border-0 cursor-pointer
                        ${activePunch 
                          ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-red-500/20' 
                          : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
                        }`}
                      id="major-punch-dial"
                    >
                      <AnimatePresence mode="wait">
                        {activePunch ? (
                          <motion.div 
                            key="punchout"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center text-center"
                          >
                            <Clock className="w-8 h-8 opacity-90 animate-pulse mb-1" />
                            <span className="text-sm tracking-wide">PUNCH OUT</span>
                            <span className="text-[9px] font-mono opacity-80 mt-1">Logged In</span>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="punchin"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center text-center"
                          >
                            <CheckCircle className="w-8 h-8 opacity-90 mb-1" />
                            <span className="text-sm tracking-wide">PUNCH IN</span>
                            <span className="text-[9px] font-mono opacity-80 mt-1">Check Attendance</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Pulsing visual halo */}
                      <div className={`absolute -inset-2.5 rounded-full border-2 opacity-15 animate-ping pointer-events-none
                        ${activePunch ? 'border-rose-500' : 'border-emerald-500'}`}
                      ></div>
                    </motion.button>

                    {/* Keyboard Shortcut Visual Hotkey Guides */}
                    <div className="mt-3 flex flex-col items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider" id="keyboard-shortcut-guide">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300 font-mono text-[9px] shadow-3xs lowercase">ctrl</kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300 font-mono text-[9px] shadow-3xs lowercase">enter</kbd>
                        <span className="text-slate-500 normal-case ml-1 font-semibold">to Punch In</span>
                      </span>
                      <span className="flex items-center gap-1 opacity-75">
                        <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300 font-mono text-[9px] shadow-3xs lowercase">ctrl</kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300 font-mono text-[9px] shadow-3xs lowercase">shift</kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300 font-mono text-[9px] shadow-3xs lowercase">enter</kbd>
                        <span className="text-slate-500 normal-case ml-1 font-semibold">to Punch Out</span>
                      </span>
                    </div>
                  </div>

                  {/* DND Suppressions & Custom Client Notification Sliders */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Mute Notification Center</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        {user.dndSettings.dndModeActive ? (
                          <span className="text-amber-500 font-bold flex items-center gap-0.5"><BellOff className="h-3 w-3" /> Muted</span>
                        ) : (
                          <span className="text-slate-400 font-semibold flex items-center gap-0.5"><Bell className="h-3 w-3" /> Normal</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3.5 pt-1">
                      
                      {/* Master DND Mode Toggle */}
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-dashed border-sky-200">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Do Not Disturb (DND)</span>
                          <p className="text-[9px] text-slate-400 leading-none mt-0.5">Stops all mock push/alert messages</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toggleDnd('dndModeActive')}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none relative outline-none cursor-pointer border-0
                            ${user.dndSettings.dndModeActive ? 'bg-amber-400' : 'bg-slate-300'}`}
                          id="toggle-master-dnd"
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-xs transform duration-200
                            ${user.dndSettings.dndModeActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* SMS alerts */}
                      <div className="flex justify-between items-center px-1">
                        <div>
                          <span className="text-xs font-medium text-slate-600 block">Simulate SMS Warning</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toggleDnd('smsEnabled')}
                          disabled={user.dndSettings.dndModeActive}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none relative outline-none cursor-pointer border-0
                            ${user.dndSettings.smsEnabled && !user.dndSettings.dndModeActive ? 'bg-emerald-400' : 'bg-slate-300 opacity-60'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-xs transform duration-200
                            ${user.dndSettings.smsEnabled && !user.dndSettings.dndModeActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Email alerts */}
                      <div className="flex justify-between items-center px-1">
                        <div>
                          <span className="text-xs font-medium text-slate-600 block">Simulate Email Alert</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toggleDnd('emailEnabled')}
                          disabled={user.dndSettings.dndModeActive}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none relative outline-none cursor-pointer border-0
                            ${user.dndSettings.emailEnabled && !user.dndSettings.dndModeActive ? 'bg-emerald-400' : 'bg-slate-300 opacity-60'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-xs transform duration-200
                            ${user.dndSettings.emailEnabled && !user.dndSettings.dndModeActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Push alerts */}
                      <div className="flex justify-between items-center px-1">
                        <div>
                          <span className="text-xs font-medium text-slate-600 block">Interactive Screen Toasts</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => toggleDnd('pushEnabled')}
                          disabled={user.dndSettings.dndModeActive}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none relative outline-none cursor-pointer border-0
                            ${user.dndSettings.pushEnabled && !user.dndSettings.dndModeActive ? 'bg-emerald-400' : 'bg-slate-300 opacity-60'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-xs transform duration-200
                            ${user.dndSettings.pushEnabled && !user.dndSettings.dndModeActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Custom Weekend Selector */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs" id="mobile-weekend-selector">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">My Weekend Convenience Days</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold uppercase">
                        {(user.weekends !== undefined ? user.weekends : (policy?.weekends || [0, 6])).length} Days
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3 font-semibold leading-relaxed">
                      Choose which days represent your weekend rest days. Attendance on selected days is flagged as weekend presence.
                    </p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {[
                        { label: 'S', val: 0, fullName: 'Sunday' },
                        { label: 'M', val: 1, fullName: 'Monday' },
                        { label: 'T', val: 2, fullName: 'Tuesday' },
                        { label: 'W', val: 3, fullName: 'Wednesday' },
                        { label: 'T', val: 4, fullName: 'Thursday' },
                        { label: 'F', val: 5, fullName: 'Friday' },
                        { label: 'S', val: 6, fullName: 'Saturday' }
                      ].map((dayObj) => {
                        const currentWeekends = user.weekends !== undefined ? user.weekends : (policy?.weekends || [0, 6]);
                        const isSelected = currentWeekends.includes(dayObj.val);
                        return (
                          <button
                            key={dayObj.val}
                            type="button"
                            title={dayObj.fullName}
                            onClick={() => {
                              let newWeekends = [...currentWeekends];
                              if (newWeekends.includes(dayObj.val)) {
                                newWeekends = newWeekends.filter(v => v !== dayObj.val);
                              } else {
                                newWeekends.push(dayObj.val);
                              }
                              onUpdateUserWeekends(user.id, newWeekends.sort());
                            }}
                            className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {dayObj.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Personnel Stats Grid */}
                  <div className="grid grid-cols-3 gap-2.5" id="mobile-stats">
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center shadow-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block">Weekly Min</span>
                      <span className="text-base font-bold text-slate-700 block mt-0.5">{formattedHours}h</span>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center shadow-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block">On-Time</span>
                      <span className="font-bold text-emerald-600 text-base block mt-0.5">{onTimeRate}%</span>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center shadow-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block">Streak</span>
                      <span className="text-base font-bold text-amber-500 block mt-0.5">3 Days</span>
                    </div>
                  </div>

                  {/* Historic punch feeds */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Your Recent Logins</span>
                      <History className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="space-y-3.5">
                      {employeeLogs.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400 font-medium">No logins recorded yet today.</div>
                      ) : (
                        employeeLogs.slice(0, 4).map((log) => (
                          <div key={log.id} className="flex justify-between items-start border-b border-slate-50 pb-2.5 last:border-0 last:pb-0 font-sans">
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-slate-700 block">
                                {new Date(log.punchInTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono block">
                                In: {new Date(log.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                {log.punchOutTime ? ` / Out: ${new Date(log.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` : ' (Active)'}
                              </span>
                              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[120px]">{log.punchInLocation.name}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wide uppercase
                                ${log.status === 'on-time' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                  log.status === 'late' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                  'bg-rose-50 text-rose-600 border border-rose-100'}`}
                              >
                                {log.status}
                              </span>
                              {log.dndSuppressed && (
                                <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded-xs font-medium">DND Suppressed</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : activeMobileTab === 'qr-scan' ? (
                <div className="space-y-4 animate-fade-in font-sans" id="mobile-qr-scan-tab">
                  {/* Proximity QR Scanners Viewfinder */}
                  <div className="bg-slate-900 rounded-3xl p-4.5 text-white relative overflow-hidden shadow-md">
                    <div className="absolute right-[-15px] top-[-15px] w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-sky-400">Proximity Scanner</span>
                    <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5 mt-1 leading-none">
                      <QrCode className="h-4.5 w-4.5 shrink-0 animate-pulse text-sky-450" />
                      QR Access Terminal
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-snug font-normal">
                      Scan entrance gateway QR codes. Proximity metrics will automatically determine arrivals or departure verification.
                    </p>
                  </div>

                  {/* Viewfinder Platform */}
                  <div className="relative border-4 border-slate-800 bg-black aspect-square rounded-[30px] overflow-hidden shadow-inner flex items-center justify-center group" id="qr-camera-lens-plate">
                    {/* Viewfinder corners decorative lines */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-emerald-450 z-20 rounded-tl-md"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-emerald-450 z-20 rounded-tr-md"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-emerald-450 z-20 rounded-bl-md"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-emerald-450 z-20 rounded-br-md"></div>

                    {/* Scanning Sweep line */}
                    {isScanningActive && (
                      <motion.div 
                        animate={{ top: ['4%', '94%', '4%'] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                        className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 z-20 pointer-events-none"
                      />
                    )}

                    {/* Viewfinder Body */}
                    {cameraEnabled ? (
                      <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover relative z-10 rounded-2xl"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
                        <Scan className={`h-11 w-11 text-slate-600 ${isScanningActive ? 'animate-pulse text-emerald-400' : ''}`} />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Device lens standby</span>
                        <p className="text-[9.5px] text-slate-500 font-semibold leading-relaxed max-w-[200px]">
                          Enable the camera module below, or use the tactile simulation controls for debugging without a webcam.
                        </p>
                      </div>
                    )}

                    {/* Laser flash on scannerResult success */}
                    {scannerResult === 'success' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.95, 0] }}
                        className="absolute inset-0 bg-emerald-500/85 z-30 flex items-center justify-center"
                      >
                        <CheckCircle className="h-16 w-16 text-white scale-125" />
                      </motion.div>
                    )}

                    {/* Laser flash on out-of-range */}
                    {scannerResult === 'out-of-range' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.95, 0] }}
                        className="absolute inset-0 bg-amber-500/85 z-30 flex items-center justify-center"
                      >
                        <ShieldAlert className="h-16 w-16 text-white scale-125" />
                      </motion.div>
                    )}
                  </div>

                  {/* Camera control button & Sound controls */}
                  <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-3xs flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCameraEnabled(!cameraEnabled)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all border
                        ${cameraEnabled 
                          ? 'bg-rose-50 text-rose-600 border-rose-100' 
                          : 'bg-slate-900 text-white border-slate-900'}`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {cameraEnabled ? "Disable Phone Lens" : "Activate Webcam Stream"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setBeepEnabled(!beepEnabled)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer border-0"
                      title={beepEnabled ? "Mute beep sound" : "Enable beep sound"}
                    >
                      {beepEnabled ? <Volume2 className="h-3.5 w-3.5 text-slate-650" /> : <VolumeX className="h-3.5 w-3.5 text-rose-500" />}
                    </button>
                  </div>

                  {/* Status Overlay Feedback Card */}
                  {scannerResult !== 'idle' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl p-4 border shadow-xs space-y-1.5
                        ${scannerResult === 'success' 
                          ? 'bg-emerald-50/85 border-emerald-100 text-emerald-900' 
                          : scannerResult === 'out-of-range' 
                          ? 'bg-amber-50/85 border-amber-100 text-amber-900' 
                          : 'bg-rose-50/85 border-rose-100 text-rose-900'}`}
                      id="scanner-feedback-banner"
                    >
                      <div className="flex items-center gap-2">
                        {scannerResult === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-605 shrink-0" />
                        ) : scannerResult === 'out-of-range' ? (
                          <ShieldAlert className="h-4 w-4 text-amber-605 shrink-0" />
                        ) : (
                          <AlertOctagon className="h-4 w-4 text-rose-605 shrink-0" />
                        )}
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider">
                          {scannerResult === 'success' ? 'Verification Passed' : 
                           scannerResult === 'out-of-range' ? 'Proximity Refused' : 'Lobby Code Invalid'}
                        </h4>
                      </div>

                      <div className="text-[10.5px] leading-relaxed font-semibold">
                        {scannerResult === 'success' ? (
                          <span>
                            Presence confirmed at <span className="font-bold">{scannedLocationName}</span>! Verified distance is <span className="font-bold">{(scannerDistance).toFixed(1)} meters</span>. Your automated {activePunch ? 'Check-Out' : 'Check-In'} was logged!
                          </span>
                        ) : scannerResult === 'out-of-range' ? (
                          <span>
                            Out of Range: You scanned the code for <span className="font-bold">{scannedLocationName}</span>, but your GPS coordinates place you <span className="font-bold">{(scannerDistance / 1000).toFixed(2)} km away</span>. Scanner gate radius authorization limit is {scannedLocationName.includes('HQ') ? '200' : scannedLocationName.includes('Labs') ? '300' : '150'} meters.
                          </span>
                        ) : (
                          <span>
                            The scanned payload is not recognized as a valid active corporate gateway signature. Please check with an administrator.
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* HIGH-FIDELITY SIMULATION DECK (For Sandboxed testing ease of use) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block leading-none">Simulation Controller</span>
                      <span className="text-[10.5px] text-slate-500 font-semibold block leading-tight">Test verification checks inside this isolated sandbox environment:</span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[9.5px] text-slate-500 font-bold leading-none bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span>Current Mobile GPS:</span>
                        <span className="text-emerald-600 font-extrabold shrink-0 truncate max-w-[130px]">{selectedGeo.name}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                        {DEFAULT_GEOFENCES.map((geo) => {
                          const qrPayload = JSON.stringify({
                            v: "workspace-auth-v1",
                            name: geo.name,
                            lat: geo.latitude,
                            lng: geo.longitude,
                            r: geo.radiusMeters
                          });
                          
                          // Calculate distance for preview
                          const calcDist = getDistanceMeters(selectedGeo.latitude, selectedGeo.longitude, geo.latitude, geo.longitude);
                          const isAnywhere = selectedGeo.radiusMeters > 5000 || geo.radiusMeters > 5000;
                          const wouldSucceed = isAnywhere || calcDist <= geo.radiusMeters;

                          return (
                            <button
                              key={geo.name}
                              type="button"
                              onClick={() => handleQRScan(qrPayload)}
                              disabled={isScanningActive}
                              className={`px-3 py-2 rounded-xl text-[10px] font-bold text-left transition-all border outline-none focus:outline-none flex justify-between items-center cursor-pointer disabled:opacity-50
                                ${wouldSucceed 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-850 hover:bg-emerald-100/55' 
                                  : 'bg-amber-50 border-amber-100 text-amber-850 hover:bg-amber-100/55'}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Scan className="h-3.5 w-3.5 shrink-0 text-slate-550" />
                                <span className="truncate">Scan {geo.name.replace('Main ', '')} QR</span>
                              </div>
                              <span className="text-[9px] font-mono shrink-0 rounded-md px-1 bg-white/75">
                                {isAnywhere ? '0m' : calcDist > 1000 ? `${(calcDist / 1000).toFixed(1)}km` : `${Math.round(calcDist)}m`}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">Or Paste Copied QR Raw Text:</label>
                        <div className="flex gap-1.5">
                          <input 
                            type="text"
                            placeholder='{"v":"workspace-auth-v1", ...}'
                            value={manualPayloadInput}
                            onChange={(e) => setManualPayloadInput(e.target.value)}
                            className="bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-1 text-[10px] text-slate-700 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 flex-1 font-mono shrink-0"
                            id="manual-qr-payload-paste"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleQRScan(manualPayloadInput);
                              setManualPayloadInput('');
                            }}
                            disabled={!manualPayloadInput.trim() || isScanningActive}
                            className="bg-slate-900 border-0 hover:bg-slate-800 text-white font-bold px-3 text-[10px] rounded-xl cursor-pointer disabled:opacity-50 inline-flex items-center"
                          >
                            Scan
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              ) : (
                <div className="space-y-4 animate-fade-in font-sans" id="mobile-notifications-tab">
                  {/* Notifications Header Panel */}
                  <div className="bg-slate-900 rounded-3xl p-5 text-white relative overflow-hidden shadow-md">
                    <div className="absolute right-[-15px] top-[-15px] w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400">Communication Desk</span>
                    <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2 mt-1 leading-none">
                      📬 Your Notification Logs
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal font-medium">
                      All clock-in and clock-out automated receipts sent to you reside securely inside your portal space.
                    </p>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center shadow-3xs">
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">dispatched</span>
                      <span className="text-sm font-extrabold text-slate-800 block mt-0.5">{myNotifications.length} Alerts</span>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 text-center shadow-3xs">
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Suppressed (DND)</span>
                      <span className="text-sm font-extrabold text-amber-500 block mt-0.5">
                        {myNotifications.filter(n => n.status === 'suppressed').length} Blocked
                      </span>
                    </div>
                  </div>

                  {/* Notifications feed list */}
                  <div className="space-y-3">
                    {myNotifications.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-3xs">
                        <BellOff className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <h5 className="text-xs font-bold text-slate-700">No Alerts Found</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">
                          Once you log check-in/out activity, automatic receipts will list here.
                        </p>
                      </div>
                    ) : (
                      myNotifications.map((notif) => (
                        <div 
                          key={notif.id}
                          className={`bg-white rounded-2.5xl p-4 border shadow-3xs flex gap-3 transition-colors
                            ${notif.status === 'suppressed' ? 'border-dashed border-slate-200 opacity-75' : 'border-slate-100 hover:border-slate-150'}`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center mt-0.5 shadow-2xs
                            ${notif.status === 'suppressed' 
                              ? 'bg-amber-100 text-amber-600' 
                              : notif.type === 'sms' ? 'bg-sky-50 text-sky-600'
                              : notif.type === 'email' ? 'bg-purple-100 text-purple-600'
                              : 'bg-emerald-50 text-emerald-600'}`}
                          >
                            {notif.status === 'suppressed' ? (
                              <BellOff className="h-4.5 w-4.5" />
                            ) : notif.type === 'sms' ? (
                              <MessageSquare className="h-4.5 w-4.5" />
                            ) : notif.type === 'email' ? (
                              <Mail className="h-4.5 w-4.5" />
                            ) : (
                              <Bell className="h-4.5 w-4.5" />
                            )}
                          </div>
                          
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-1.5">
                              <span className="text-[9px] font-mono text-slate-400 font-bold">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded
                                ${notif.status === 'suppressed' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                              >
                                {notif.status === 'suppressed' ? 'DND Suppressed' : notif.type}
                              </span>
                            </div>
                            <h5 className="text-xs font-extrabold text-slate-800 leading-tight truncate">{notif.title}</h5>
                            <p className="text-[10.5px] text-slate-500 leading-snug font-semibold">{notif.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Navigation Tabs inside Simulator */}
            <div className="bg-white border-t border-slate-100 px-3 py-2 flex justify-around items-center shrink-0 shadow-2xs z-10" id="mobile-tabs-bar">
              <button
                type="button"
                onClick={() => setActiveMobileTab('punch')}
                className={`flex flex-col items-center gap-0.5 outline-none border-0 bg-transparent cursor-pointer transition-all w-1/3 py-1
                  ${activeMobileTab === 'punch' ? 'text-emerald-600 font-extrabold' : 'text-slate-400 font-semibold hover:text-slate-600'}`}
              >
                <Clock className="h-4 w-4" />
                <span className="text-[8px] tracking-wide uppercase">Punch Clock</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveMobileTab('qr-scan')}
                className={`flex flex-col items-center gap-0.5 outline-none border-0 bg-transparent cursor-pointer transition-all w-1/3 py-1
                  ${activeMobileTab === 'qr-scan' ? 'text-emerald-600 font-extrabold animate-pulse' : 'text-slate-400 font-semibold hover:text-slate-600'}`}
              >
                <QrCode className="h-4 w-4" />
                <span className="text-[8px] tracking-wide uppercase">Scan QR Gate</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveMobileTab('notifications')}
                className={`flex flex-col items-center gap-0.5 outline-none border-0 bg-transparent cursor-pointer transition-all relative w-1/3 py-1
                  ${activeMobileTab === 'notifications' ? 'text-emerald-600 font-extrabold' : 'text-slate-400 font-semibold hover:text-slate-600'}`}
              >
                <div className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-rose-500 text-white font-extrabold text-[7px] h-3 w-3 rounded-full flex items-center justify-center border border-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[8px] tracking-wide uppercase">Inbox Logs</span>
              </button>
            </div>

            {/* Simulated smartphone bottom bar (iOS/Android styled pill) */}
            <div className="h-5 bg-slate-50 flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-400 rounded-full mb-1"></div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
