import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, Clock, VolumeX, ShieldAlert, FileText, Search, UserPlus, 
  Settings, Download, Send, RefreshCw, AlertCircle, Sparkles, MapPin, CheckCircle,
  QrCode, Upload, Trash2, Plus, UserCheck, Fingerprint, Cpu, Laptop,
  Globe, Server, Activity, Key
} from 'lucide-react';
import { User, Shift, PunchLog, NotificationLog, SettingsPolicy, Branch, Department } from '../types';
import { DEFAULT_GEOFENCES } from '../data/mockData';
import QRCode from 'qrcode';
import AttendanceHeatmap from './AttendanceHeatmap';
import PunchAnalyticsChart from './PunchAnalyticsChart';
import AIPredictiveRoster from './AIPredictiveRoster';
import GeminiWeeklyAnalytics from './GeminiWeeklyAnalytics';
import { jsPDF } from 'jspdf';

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  shifts: Shift[];
  punchLogs: PunchLog[];
  notificationsLog: NotificationLog[];
  policy: SettingsPolicy;
  branches: Branch[];
  departments: Department[];
  onUpdateBranches: (branches: Branch[]) => void;
  onUpdateDepartments: (departments: Department[]) => void;
  onUpdatePolicy: (policy: SettingsPolicy) => void;
  onAddUser: (user: Partial<User> & Omit<User, 'id' | 'joinedDate' | 'dndSettings'>) => void;
  onUpdateShift: (shiftId: string, startTime: string, endTime: string, gracePeriodMinutes: number, overtimeAllowed?: boolean, overtimeMultiplier?: number) => void;
  onClearLogs: () => void;
  onUpdateUserBiometrics: (userId: string, biometrics: User['biometrics']) => void;
  onAddPunches: (punches: PunchLog[]) => void;
  onUpdateUserWeekends: (userId: string, weekends: number[]) => void;
  onUpdateUser?: (userId: string, updatedFields: Partial<User>) => void;
  onUpdatePunch?: (punchId: string, updatedFields: Partial<PunchLog>) => void;
  onRestoreBackup?: (
    users: User[],
    shifts: Shift[],
    punches: PunchLog[],
    notifications: NotificationLog[],
    policy: SettingsPolicy,
    branches?: Branch[],
    departments?: Department[]
  ) => void;
}

export default function AdminPanel({
  currentUser,
  users,
  shifts,
  punchLogs,
  notificationsLog,
  policy,
  branches,
  departments,
  onUpdateBranches,
  onUpdateDepartments,
  onUpdatePolicy,
  onAddUser,
  onUpdateShift,
  onClearLogs,
  onUpdateUserBiometrics,
  onAddPunches,
  onUpdateUserWeekends,
  onUpdateUser,
  onUpdatePunch,
  onRestoreBackup
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'users' | 'shifts' | 'notifications' | 'ai' | 'qrcodes' | 'biometrics' | 'branches'>('analytics');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'standard' | 'gemini'>('gemini');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [selectedPosterGeo, setSelectedPosterGeo] = useState<any>(DEFAULT_GEOFENCES[0]);
  const posterCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (activeTab === 'qrcodes' && posterCanvasRef.current) {
      const qrPayload = JSON.stringify({
        v: "workspace-auth-v1",
        name: selectedPosterGeo.name,
        lat: selectedPosterGeo.latitude,
        lng: selectedPosterGeo.longitude,
        r: selectedPosterGeo.radiusMeters
      });
      QRCode.toCanvas(posterCanvasRef.current, qrPayload, {
        width: 150,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error("Error generating Poster QR:", err);
      });
    }
  }, [activeTab, selectedPosterGeo]);
  
  // Create User state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'employee'>('employee');
  const [newUserShift, setNewUserShift] = useState('morning');
  const [newUserEmployeeId, setNewUserEmployeeId] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('');
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserBranch, setNewUserBranch] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserAddress, setNewUserAddress] = useState('');
  const [newUserEmergencyContact, setNewUserEmergencyContact] = useState('');
  const [newUserDob, setNewUserDob] = useState('');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  // Branches & Departments form states
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [newBranchLat, setNewBranchLat] = useState('37.7749');
  const [newBranchLng, setNewBranchLng] = useState('-122.4194');
  const [newBranchRadius, setNewBranchRadius] = useState('100');
  const [branchEditingId, setBranchEditingId] = useState<string | null>(null);

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptCostCenter, setNewDeptCostCenter] = useState('');
  const [newDeptManager, setNewDeptManager] = useState('');
  const [deptEditingId, setDeptEditingId] = useState<string | null>(null);

  // Bulk CSV Onboarding state
  const [onboardMethod, setOnboardMethod] = useState<'single' | 'csv'>('single');
  const [csvParsedUsers, setCsvParsedUsers] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvIsDragging, setCsvIsDragging] = useState(false);

  // Biometric Devices & Operations state
  const [devices, setDevices] = useState([
    { id: 'dev-1', name: 'Main Lobby Reader - F10', ip: '192.168.1.110', port: 8080, status: 'online', type: 'Multi-modal (Face/Finger/Card)', lastSync: '2026-06-23 08:30', webhookUrl: 'https://api.workspace.com/hardware/v1/punches' },
    { id: 'dev-2', name: 'Warehouse Entry Turnstile', ip: '192.168.1.115', port: 8081, status: 'online', type: 'RFID Card & PIN Code', lastSync: '2026-06-23 08:15', webhookUrl: 'https://api.workspace.com/hardware/v1/gate-punches' },
    { id: 'dev-3', name: 'R&D Lab BioGate', ip: '192.168.3.40', port: 5000, status: 'offline', type: 'High-Sec Fingerprint & Face', lastSync: '2026-06-22 17:45', webhookUrl: 'https://api.workspace.com/hardware/v1/lab-punches' },
  ]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('dev-1');
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceIp, setNewDeviceIp] = useState('');
  const [newDevicePort, setNewDevicePort] = useState(8080);
  const [newDeviceType, setNewDeviceType] = useState('Multi-modal (Face/Finger/Card)');
  
  // Biometrics editing for single user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<Partial<User> | null>(null);
  
  const [editingBiometricUserId, setEditingBiometricUserId] = useState<string | null>(null);
  const [tempFaceReg, setTempFaceReg] = useState(false);
  const [tempFaceUrl, setTempFaceUrl] = useState('');
  const [tempFingerReg, setTempFingerReg] = useState(false);
  const [tempFingerprintHash, setTempFingerprintHash] = useState('');
  const [tempCardNum, setTempCardNum] = useState('');
  const [tempPinCode, setTempPinCode] = useState('');

  // Device sync simulation state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncType, setSyncType] = useState<'upload' | 'download'>('upload');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

  // Future API view parameters
  const [showApiSampleCode, setShowApiSampleCode] = useState(false);

  // Raw machine attendance log simulator
  const [rawMachineLogs, setRawMachineLogs] = useState([
    { id: 'rml-1', employeeId: 'EMP-1001', name: 'Puneet Batham', time: '2026-06-23 08:05:22', method: 'Face', ip: '192.168.1.110' },
    { id: 'rml-2', employeeId: 'EMP-8821', name: 'John Doe', time: '2026-06-23 08:12:15', method: 'Fingerprint', ip: '192.168.1.110' },
    { id: 'rml-3', employeeId: 'EMP-4491', name: 'Elizabeth Vance', time: '2026-06-23 09:35:40', method: 'Card', ip: '192.168.1.115' },
    { id: 'rml-4', employeeId: 'EMP-1001', name: 'Puneet Batham', time: '2026-06-23 17:05:10', method: 'Face', ip: '192.168.1.110' },
    { id: 'rml-5', employeeId: 'EMP-8821', name: 'John Doe', time: '2026-06-23 12:15:00', method: 'Fingerprint', ip: '192.168.1.110' }, 
    { id: 'rml-6', employeeId: 'EMP-4491', name: 'Elizabeth Vance', time: '2026-06-23 18:02:44', method: 'Card', ip: '192.168.1.115' },
  ]);

  // States to hold the calculated biometric report results
  const [calculatedLogs, setCalculatedLogs] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationSuccessMsg, setCalculationSuccessMsg] = useState('');

  // Biometrics Sub-Tab Option "Services Setup" state variables
  const [biometricsSubTab, setBiometricsSubTab] = useState<'terminals' | 'services'>('terminals');
  const [biometricServices, setBiometricServices] = useState([
    { id: 'srv-1', brandName: 'ZKTeco', customName: 'ZK-BioSecurity Cloud Push', apiUrl: 'http://192.168.1.110/zk/api', apiKey: 'zk_sec_9942', protocol: 'HTTP POST Push', pollingInterval: 'Real-time Webhook', status: 'active', lastSyncStatus: 'success' },
    { id: 'srv-2', brandName: 'Hikvision', customName: 'HikCentral ISUP Gateway', apiUrl: 'https://hik-cloud.corporate.lan/api', apiKey: 'hik_auth_key_102', protocol: 'REST API Polling', pollingInterval: 'Every 5 mins', status: 'active', lastSyncStatus: 'success' },
    { id: 'srv-3', brandName: 'Suprema', customName: 'Suprema BioStar 2 Cloud REST Client', apiUrl: 'https://biostar.workspace.com/api', apiKey: 'suprema_token_abc', protocol: 'REST API Polling', pollingInterval: 'Every 15 mins', status: 'inactive', lastSyncStatus: 'never' },
  ]);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [isTestingHandshake, setIsTestingHandshake] = useState<string | null>(null);
  const [handshakeResult, setHandshakeResult] = useState<string | null>(null);

  // Form states for Brand API Services
  const [newBrandName, setNewBrandName] = useState('ZKTeco');
  const [newBrandCustomName, setNewBrandCustomName] = useState('');
  const [newBrandApiUrl, setNewBrandApiUrl] = useState('');
  const [newBrandApiKey, setNewBrandApiKey] = useState('');
  const [newBrandProtocol, setNewBrandProtocol] = useState('HTTP POST Push');
  const [newBrandPolling, setNewBrandPolling] = useState('Real-time Webhook');
  const [newBrandStatus, setNewBrandStatus] = useState<'active' | 'inactive'>('active');

  // Customize reports variables
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterWeekendOnly, setFilterWeekendOnly] = useState<boolean>(false);
  const [reportFrequency, setReportFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('custom');

  // System Backup & Restore States
  const [isDraggingBackup, setIsDraggingBackup] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    date: string;
    usersCount: number;
    punchesCount: number;
    shiftsCount: number;
    isValid: boolean;
    error?: string;
    rawData?: any;
  } | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('');
  const [reportLayout, setReportLayout] = useState<'vertical' | 'horizontal'>('vertical');

  const AVAILABLE_COLUMNS = [
    { id: 'employeeName', label: 'Employee Name' },
    { id: 'employeeId', label: 'Employee ID' },
    { id: 'date', label: 'Date' },
    { id: 'punchIn', label: 'Punch In Time' },
    { id: 'punchOut', label: 'Punch Out Time' },
    { id: 'shift', label: 'Assigned Shift' },
    { id: 'geotag', label: 'Geotag Location' },
    { id: 'status', label: 'Status' },
    { id: 'duration', label: 'Duration Worked' },
    { id: 'notes', label: 'Activity Note' }
  ];

  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'employeeName', 'employeeId', 'date', 'punchIn', 'punchOut', 'shift', 'status', 'duration', 'notes'
  ]);

  // Shift updating states
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editGracePeriod, setEditGracePeriod] = useState(15);

  // Gemini AI variables
  const [aiSubTab, setAiSubTab] = useState<'dashboard' | 'conversational'>('dashboard');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Pre-configured questions for Gemini
  const AI_TEMPLATES = [
    { label: "Summarize Performance Trends", prompt: "Conduct a general 5-day attendance performance review. Find who is late most often and list overall productivity statistics." },
    { label: "Audit Location Violations", prompt: "Identify any coordinates anomalies or 'Out of Bounds' logging incidents where employees punched in or out from unauthorized zones." },
    { label: "Evaluate Shift Optimization", prompt: "Analyze the active shift mapping boundaries. Recommend if shifts need adjustment or grace periods require widening." }
  ];

  // AI query handler
  const handleQueryAI = async (customPrompt?: string | null) => {
    const promptToSend = customPrompt || aiPrompt || "Provide a summary report of attendance.";
    if (!promptToSend.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResponse('');

    try {
      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: punchLogs,
          employees: users,
          shifts: shifts,
          prompt: promptToSend
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAiResponse(data.text || "No insights returned.");
      } else {
        setAiError(data.error || "Failed to communicate with AI model.");
      }
    } catch (err: any) {
      setAiError(err.message || "Network error. Make sure process.env.GEMINI_API_KEY is configured.");
    } finally {
      setAiLoading(false);
    }
  };

  // One-click System Backup of localStorage data (users, punches, shifts)
  const handleSystemBackup = () => {
    try {
      const backupData = {
        backupVersion: "1.0",
        backupDate: new Date().toISOString(),
        sa_users: localStorage.getItem('sa_users') ? JSON.parse(localStorage.getItem('sa_users') || '[]') : users,
        sa_shifts: localStorage.getItem('sa_shifts') ? JSON.parse(localStorage.getItem('sa_shifts') || '[]') : shifts,
        sa_punches: localStorage.getItem('sa_punches') ? JSON.parse(localStorage.getItem('sa_punches') || '[]') : punchLogs,
        sa_notifies: localStorage.getItem('sa_notifies') ? JSON.parse(localStorage.getItem('sa_notifies') || '[]') : notificationsLog,
        sa_policy: localStorage.getItem('sa_policy') ? JSON.parse(localStorage.getItem('sa_policy') || '{}') : policy,
        sa_branches: localStorage.getItem('sa_branches') ? JSON.parse(localStorage.getItem('sa_branches') || '[]') : branches,
        sa_departments: localStorage.getItem('sa_departments') ? JSON.parse(localStorage.getItem('sa_departments') || '[]') : departments,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `smart_attendance_system_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      console.error("Backup download failed", error);
    }
  };

  // Backup restore file processing
  const processBackupFile = (file: File) => {
    setRestoreSuccessMsg('');
    setRestorePreview(null);
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setRestorePreview({
        date: '',
        usersCount: 0,
        punchesCount: 0,
        shiftsCount: 0,
        isValid: false,
        error: 'Invalid file format. Please upload a standard JSON backup file (.json).'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // Basic validation: must have sa_users and sa_punches
        if (!parsed.sa_users || !Array.isArray(parsed.sa_users)) {
          throw new Error('Missing or invalid "sa_users" array in the backup ledger.');
        }
        if (!parsed.sa_punches || !Array.isArray(parsed.sa_punches)) {
          throw new Error('Missing or invalid "sa_punches" array in the backup ledger.');
        }

        setRestorePreview({
          date: parsed.backupDate || 'Unknown Date',
          usersCount: parsed.sa_users.length,
          punchesCount: parsed.sa_punches.length,
          shiftsCount: parsed.sa_shifts?.length || 0,
          isValid: true,
          rawData: parsed
        });
      } catch (err: any) {
        setRestorePreview({
          date: '',
          usersCount: 0,
          punchesCount: 0,
          shiftsCount: 0,
          isValid: false,
          error: `Parsing Error: ${err.message || 'The file contents are corrupted or not a valid JSON.'}`
        });
      }
    };
    reader.onerror = () => {
      setRestorePreview({
        date: '',
        usersCount: 0,
        punchesCount: 0,
        shiftsCount: 0,
        isValid: false,
        error: 'Failed to read backup file.'
      });
    };
    reader.readAsText(file);
  };

  const handleCommitRestore = () => {
    if (!restorePreview || !restorePreview.isValid || !restorePreview.rawData) return;
    
    const { rawData } = restorePreview;
    
    if (onRestoreBackup) {
      onRestoreBackup(
        rawData.sa_users,
        rawData.sa_shifts || shifts,
        rawData.sa_punches,
        rawData.sa_notifies || notificationsLog,
        rawData.sa_policy || policy,
        rawData.sa_branches,
        rawData.sa_departments
      );
      setRestoreSuccessMsg('System restored successfully! The entire biometric ledger, user rosters, departments, and physical branches have been fully recovered.');
      setRestorePreview(null);
    } else {
      setRestorePreview({
        ...restorePreview,
        isValid: false,
        error: 'Restore function not initialized in the parent system framework.'
      });
    }
  };

  // User additions dispatcher
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    onAddUser({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      defaultShiftId: newUserShift,
      status: 'active',
      employeeId: newUserEmployeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: newUserAvatar || undefined,
      designation: newUserDesignation || undefined,
      department: newUserDepartment || undefined,
      branch: newUserBranch || undefined,
      phone: newUserPhone || undefined,
      address: newUserAddress || undefined,
      emergencyContact: newUserEmergencyContact || undefined,
      dob: newUserDob || undefined
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserEmployeeId('');
    setNewUserAvatar('');
    setNewUserDesignation('');
    setNewUserDepartment('');
    setNewUserBranch('');
    setNewUserPhone('');
    setNewUserAddress('');
    setNewUserEmergencyContact('');
    setNewUserDob('');
    
    setUserSuccessMsg(`Successfully registered ${newUserName} as an active ${newUserRole}!`);
    setTimeout(() => setUserSuccessMsg(''), 4000);
  };

  // Branches & Departments CRUD actions
  const handleAddOrUpdateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchCode) return;

    if (branchEditingId) {
      const updated = branches.map(b => b.id === branchEditingId ? {
        ...b,
        name: newBranchName,
        code: newBranchCode,
        location: newBranchLocation,
        latitude: parseFloat(newBranchLat) || 0,
        longitude: parseFloat(newBranchLng) || 0,
        radiusMeters: parseInt(newBranchRadius, 10) || 100
      } : b);
      onUpdateBranches(updated);
      setBranchEditingId(null);
    } else {
      const newBranch: Branch = {
        id: `branch-${Math.floor(1000 + Math.random() * 9000)}`,
        name: newBranchName,
        code: newBranchCode,
        location: newBranchLocation,
        latitude: parseFloat(newBranchLat) || 0,
        longitude: parseFloat(newBranchLng) || 0,
        radiusMeters: parseInt(newBranchRadius, 10) || 100
      };
      onUpdateBranches([...branches, newBranch]);
    }

    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchLocation('');
    setNewBranchLat('37.7749');
    setNewBranchLng('-122.4194');
    setNewBranchRadius('100');
  };

  const handleDeleteBranch = (id: string) => {
    onUpdateBranches(branches.filter(b => b.id !== id));
  };

  const handleEditBranch = (b: Branch) => {
    setBranchEditingId(b.id);
    setNewBranchName(b.name);
    setNewBranchCode(b.code);
    setNewBranchLocation(b.location || '');
    setNewBranchLat((b.latitude || 37.7749).toString());
    setNewBranchLng((b.longitude || -122.4194).toString());
    setNewBranchRadius((b.radiusMeters || 100).toString());
  };

  const handleAddOrUpdateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;

    if (deptEditingId) {
      const updated = departments.map(d => d.id === deptEditingId ? {
        ...d,
        name: newDeptName,
        code: newDeptCode,
        costCenter: newDeptCostCenter,
        manager: newDeptManager
      } : d);
      onUpdateDepartments(updated);
      setDeptEditingId(null);
    } else {
      const newDept: Department = {
        id: `dept-${Math.floor(1000 + Math.random() * 9000)}`,
        name: newDeptName,
        code: newDeptCode,
        costCenter: newDeptCostCenter,
        manager: newDeptManager
      };
      onUpdateDepartments([...departments, newDept]);
    }

    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptCostCenter('');
    setNewDeptManager('');
  };

  const handleDeleteDept = (id: string) => {
    onUpdateDepartments(departments.filter(d => d.id !== id));
  };

  const handleEditDept = (d: Department) => {
    setDeptEditingId(d.id);
    setNewDeptName(d.name);
    setNewDeptCode(d.code);
    setNewDeptCostCenter(d.costCenter || '');
    setNewDeptManager(d.manager || '');
  };

  // Helper to trigger parsing and load the rows
  const handleCSVFileParse = (text: string) => {
    try {
      setCsvError(null);
      const lines = text.split(/\r?\n/);
      if (lines.length === 0 || !lines[0].trim()) {
        throw new Error("The file is empty or missing headers.");
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      
      // Check required fields
      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      
      if (nameIndex === -1 || emailIndex === -1) {
        throw new Error("Missing required column headers. CSV must contain at least 'name' and 'email' columns.");
      }
      
      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Custom parser to support quoted strings / commas
        const values: string[] = [];
        let currentField = '';
        let insideQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        values.push(currentField.trim());
        
        // Extract fields
        const name = (values[nameIndex] || '').replace(/^["']|["']$/g, '').trim();
        const email = (values[emailIndex] || '').replace(/^["']|["']$/g, '').trim();
        
        if (!name && !email) continue; // Skip blank rows
        
        const empIdIndex = headers.indexOf('employeeid');
        const roleIndex = headers.indexOf('role');
        const shiftIndex = headers.indexOf('shiftid');
        const designationIndex = headers.indexOf('designation');
        const departmentIndex = headers.indexOf('department');
        const branchIndex = headers.indexOf('branch');
        const phoneIndex = headers.indexOf('phone');
        const addressIndex = headers.indexOf('address');
        const emergencyContactIndex = headers.indexOf('emergencycontact');
        const dobIndex = headers.indexOf('dob');
        const avatarIndex = headers.indexOf('avatar');
        
        const rawRole = roleIndex !== -1 ? (values[roleIndex] || '').trim().replace(/^["']|["']$/g, '').toLowerCase() : '';
        const role: 'admin' | 'employee' = rawRole === 'admin' ? 'admin' : 'employee';
        
        const rawShift = shiftIndex !== -1 ? (values[shiftIndex] || '').trim().replace(/^["']|["']$/g, '').toLowerCase() : '';
        const shiftId = ['morning', 'evening', 'night'].includes(rawShift) ? rawShift : 'morning';
        
        parsedRows.push({
          name: name,
          email: email,
          employeeId: empIdIndex !== -1 ? (values[empIdIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          role: role,
          defaultShiftId: shiftId,
          designation: designationIndex !== -1 ? (values[designationIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          department: departmentIndex !== -1 ? (values[departmentIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          branch: branchIndex !== -1 ? (values[branchIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          phone: phoneIndex !== -1 ? (values[phoneIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          address: addressIndex !== -1 ? (values[addressIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          emergencyContact: emergencyContactIndex !== -1 ? (values[emergencyContactIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          dob: dobIndex !== -1 ? (values[dobIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          avatar: avatarIndex !== -1 ? (values[avatarIndex] || '').replace(/^["']|["']$/g, '').trim() : '',
          status: 'active',
          selected: !!name && !!email && email.includes('@'),
          error: !name ? "Name is required" : !email ? "Email is required" : !email.includes('@') ? "Email is invalid" : null
        });
      }
      
      if (parsedRows.length === 0) {
        throw new Error("No valid data rows found in the CSV.");
      }
      
      setCsvParsedUsers(parsedRows);
    } catch (err: any) {
      setCsvError(err.message || "Failed to parse CSV file.");
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleCSVFileParse(text);
    };
    reader.readAsText(file);
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCsvIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      setCsvError("Only .csv files are supported.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleCSVFileParse(text);
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = () => {
    const toImport = csvParsedUsers.filter(u => u.selected && !u.error);
    if (toImport.length === 0) return;
    
    toImport.forEach(user => {
      onAddUser({
        name: user.name,
        email: user.email,
        role: user.role,
        defaultShiftId: user.defaultShiftId,
        status: 'active',
        employeeId: user.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        avatar: user.avatar || undefined,
        designation: user.designation || undefined,
        department: user.department || undefined,
        branch: user.branch || undefined,
        phone: user.phone || undefined,
        address: user.address || undefined,
        emergencyContact: user.emergencyContact || undefined,
        dob: user.dob || undefined
      });
    });
    
    setUserSuccessMsg(`Successfully imported ${toImport.length} employee profiles in bulk!`);
    setTimeout(() => setUserSuccessMsg(''), 5000);
    setCsvParsedUsers([]);
    setOnboardMethod('single');
  };

  const downloadCsvTemplate = () => {
    const csvContent = "name,email,employeeId,role,shiftId,designation,department,branch,phone,address,emergencyContact,dob,avatar\n" +
      "John Doe,john@company.com,EMP-8821,employee,morning,Software Engineer,Engineering,Main Headquarters (HQ),+15551234567,\"123 Main St, NY\",+15559876543,1992-05-15,\n" +
      "Elizabeth Vance,eli@company.com,EMP-4491,admin,evening,Solutions Architect,Product,Downtown Office Annex,+15558912345,\"456 Oak Rd, CA\",+15555432109,1988-11-20,";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "employee_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const simulateSyncBiometrics = (type: 'upload' | 'download') => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncType(type);
    setSyncSuccessMsg('');
    const targetDevice = devices.find(d => d.id === selectedDeviceId);
    const deviceName = targetDevice ? targetDevice.name : "Device";

    if (type === 'upload') {
      setSyncMessage(`Uploading local face, finger, card, and PIN records to ${deviceName}...`);
    } else {
      setSyncMessage(`Downloading raw access logs, face index tables, and card credentials from ${deviceName}...`);
    }

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
          
          setDevices(prevDevices => 
            prevDevices.map(d => d.id === selectedDeviceId ? { ...d, lastSync: nowStr } : d)
          );

          if (type === 'upload') {
            const registeredCount = users.filter(u => u.biometrics && (u.biometrics.faceRegistered || u.biometrics.fingerRegistered || u.biometrics.cardNumber || u.biometrics.pinCode)).length;
            setSyncSuccessMsg(`Successfully uploaded ${registeredCount || 2} biometric templates to ${deviceName}! Hardware database synchronized successfully.`);
          } else {
            setRawMachineLogs([
              { id: 'rml-1', employeeId: 'EMP-1001', name: 'Puneet Batham', time: '2026-06-23 08:05:22', method: 'Face', ip: targetDevice?.ip || '192.168.1.110' },
              { id: 'rml-2', employeeId: 'EMP-8821', name: 'John Doe', time: '2026-06-23 08:12:15', method: 'Fingerprint', ip: targetDevice?.ip || '192.168.1.110' },
              { id: 'rml-3', employeeId: 'EMP-4491', name: 'Elizabeth Vance', time: '2026-06-23 09:35:40', method: 'Card', ip: targetDevice?.ip || '192.168.1.115' },
              { id: 'rml-4', employeeId: 'EMP-1001', name: 'Puneet Batham', time: '2026-06-23 17:05:10', method: 'Face', ip: targetDevice?.ip || '192.168.1.110' },
              { id: 'rml-5', employeeId: 'EMP-8821', name: 'John Doe', time: '2026-06-23 12:15:00', method: 'Fingerprint', ip: targetDevice?.ip || '192.168.1.110' }, 
              { id: 'rml-6', employeeId: 'EMP-4491', name: 'Elizabeth Vance', time: '2026-06-23 18:02:44', method: 'Card', ip: targetDevice?.ip || '192.168.1.115' },
            ]);
            setSyncSuccessMsg(`Downloaded and parsed 6 raw terminal punches from ${deviceName}! Ready for policy evaluation.`);
          }
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleStartRegisterBiometrics = (user: User) => {
    setEditingBiometricUserId(user.id);
    setTempFaceReg(user.biometrics?.faceRegistered || false);
    setTempFaceUrl(user.biometrics?.faceTemplateUrl || '');
    setTempFingerReg(user.biometrics?.fingerRegistered || false);
    setTempFingerprintHash(user.biometrics?.fingerprintTemplate || '');
    setTempCardNum(user.biometrics?.cardNumber || '');
    setTempPinCode(user.biometrics?.pinCode || '');
  };

  const handleSaveUserBiometrics = () => {
    if (!editingBiometricUserId) return;
    
    const finalFaceUrl = tempFaceReg ? (tempFaceUrl || `https://images.unsplash.com/photo-${Math.floor(1500000000000 + Math.random() * 900000000)}?w=150&h=150&fit=crop&crop=face`) : '';
    const finalFingerHash = tempFingerReg ? (tempFingerprintHash || `FP-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`) : '';

    onUpdateUserBiometrics(editingBiometricUserId, {
      faceRegistered: tempFaceReg,
      faceTemplateUrl: finalFaceUrl || undefined,
      fingerRegistered: tempFingerReg,
      fingerprintTemplate: finalFingerHash || undefined,
      cardNumber: tempCardNum || undefined,
      pinCode: tempPinCode || undefined
    });

    setEditingBiometricUserId(null);
  };

  const handleCalculateBiometricPolicyData = () => {
    setIsCalculating(true);
    setCalculationSuccessMsg('');
    
    setTimeout(() => {
      const results: any[] = [];
      const logsByEmployeeDate: { [key: string]: { checkIns: string[], methods: string[] } } = {};
      
      rawMachineLogs.forEach(log => {
        const dateStr = log.time.split(' ')[0];
        const empId = log.employeeId;
        const key = `${empId}_${dateStr}`;
        
        if (!logsByEmployeeDate[key]) {
          logsByEmployeeDate[key] = { checkIns: [], methods: [] };
        }
        logsByEmployeeDate[key].checkIns.push(log.time);
        logsByEmployeeDate[key].methods.push(log.method);
      });

      Object.keys(logsByEmployeeDate).forEach(key => {
        const [empId, dateStr] = key.split('_');
        const employee = users.find(u => u.employeeId === empId || u.id === empId);
        if (!employee) return;

        const times = logsByEmployeeDate[key].checkIns.sort();
        const punchIn = times[0];
        const punchOut = times.length > 1 ? times[times.length - 1] : null;

        const assignedShift = shifts.find(s => s.id === employee.defaultShiftId) || shifts[0];
        
        const checkInTimePart = punchIn.split(' ')[1];
        const [checkInH, checkInM] = checkInTimePart.split(':').map(Number);
        const [shiftStartH, shiftStartM] = assignedShift.startTime.split(':').map(Number);
        
        const checkInMinutesSinceMidnight = checkInH * 60 + checkInM;
        const shiftStartMinutesSinceMidnight = shiftStartH * 60 + shiftStartM;
        const minutesLate = checkInMinutesSinceMidnight - shiftStartMinutesSinceMidnight;
        
        const dayOfWeek = new Date(dateStr).getDay();
        const empWeekends = employee.weekends !== undefined ? employee.weekends : (policy?.weekends || [0, 6]);
        const isWeekend = empWeekends.includes(dayOfWeek);

        let hoursWorked = 0;
        if (punchOut) {
          const inDate = new Date(punchIn);
          const outDate = new Date(punchOut);
          hoursWorked = Number(((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60)).toFixed(2));
        }

        let calculatedStatus: 'on-time' | 'late' | 'half-day' | 'present' = 'present';
        let explanation = '';

        if (isWeekend) {
          calculatedStatus = 'on-time';
          explanation = "Weekend Overtime Shift";
        } else if (punchOut && policy.halfDayAutoMark && hoursWorked < policy.halfDayThresholdHours) {
          calculatedStatus = 'half-day';
          explanation = `Worked ${hoursWorked} hrs (Below policy threshold of ${policy.halfDayThresholdHours} hrs)`;
        } else if (minutesLate > assignedShift.gracePeriodMinutes) {
          calculatedStatus = 'late';
          explanation = `Late check-in by ${minutesLate} mins (Grace: ${assignedShift.gracePeriodMinutes}m)`;
        } else {
          calculatedStatus = 'on-time';
          explanation = punchOut ? `On-Time Duty (${hoursWorked} hrs)` : "Checked-In (No Out Punch Yet)";
        }

        results.push({
          userId: employee.id,
          userName: employee.name,
          userEmail: employee.email,
          date: dateStr,
          punchInTime: punchIn,
          punchOutTime: punchOut,
          shiftId: assignedShift.id,
          shiftName: assignedShift.name,
          hoursWorked: hoursWorked,
          status: calculatedStatus,
          explanation: explanation,
          methodsUsed: Array.from(new Set(logsByEmployeeDate[key].methods)).join(' + ')
        });
      });

      setCalculatedLogs(results);
      setIsCalculating(false);
      setCalculationSuccessMsg(`Successfully calculated ${results.length} biometric punch sets according to Corporate policy!`);
    }, 800);
  };

  const handleImportCalculatedLogsToMaster = () => {
    if (calculatedLogs.length === 0) return;
    
    const formattedLogs: PunchLog[] = calculatedLogs.map(cl => ({
      id: `pl-bio-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: cl.userId,
      userName: cl.userName,
      userEmail: cl.userEmail,
      date: cl.date,
      punchInTime: new Date(cl.punchInTime).toISOString(),
      punchOutTime: cl.punchOutTime ? new Date(cl.punchOutTime).toISOString() : null,
      shiftId: cl.shiftId,
      shiftName: cl.shiftName,
      status: cl.status,
      punchInLocation: { latitude: 0, longitude: 0, name: "Biometric Hardware Device", accuracy: 1 },
      punchOutLocation: cl.punchOutTime ? { latitude: 0, longitude: 0, name: "Biometric Hardware Device", accuracy: 1 } : null,
      notified: true,
      dndSuppressed: false,
      notes: `Biometric Punch Verified (${cl.methodsUsed}). ${cl.explanation}`
    }));

    onAddPunches(formattedLogs);
    setCalculationSuccessMsg(`Successfully imported ${formattedLogs.length} verified biometric logs to the company attendance database!`);
    setCalculatedLogs([]);
  };

  const handleAddBiometricDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName || !newDeviceIp) return;
    
    const newDev = {
      id: `dev-${Date.now()}`,
      name: newDeviceName,
      ip: newDeviceIp,
      port: newDevicePort,
      status: 'online' as const,
      type: newDeviceType,
      lastSync: 'Never synced',
      webhookUrl: `https://api.workspace.com/hardware/v1/${newDeviceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-punches`
    };

    setDevices([...devices, newDev]);
    setShowAddDeviceModal(false);
    setNewDeviceName('');
    setNewDeviceIp('');
    setNewDevicePort(8080);
  };

  // Brand Biometric Services management handlers
  const handleCreateOrUpdateBiometricService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandCustomName || !newBrandApiUrl) return;

    if (editingServiceId) {
      // Update existing
      setBiometricServices(prev => prev.map(s => s.id === editingServiceId ? {
        ...s,
        brandName: newBrandName,
        customName: newBrandCustomName,
        apiUrl: newBrandApiUrl,
        apiKey: newBrandApiKey,
        protocol: newBrandProtocol,
        pollingInterval: newBrandPolling,
        status: newBrandStatus
      } : s));
      setEditingServiceId(null);
    } else {
      // Add new brand service
      const newSrv = {
        id: `srv-${Date.now()}`,
        brandName: newBrandName,
        customName: newBrandCustomName,
        apiUrl: newBrandApiUrl,
        apiKey: newBrandApiKey,
        protocol: newBrandProtocol,
        pollingInterval: newBrandPolling,
        status: newBrandStatus,
        lastSyncStatus: 'never' as const
      };
      setBiometricServices(prev => [...prev, newSrv]);
    }

    // Reset form states
    setShowAddServiceModal(false);
    setNewBrandName('ZKTeco');
    setNewBrandCustomName('');
    setNewBrandApiUrl('');
    setNewBrandApiKey('');
    setNewBrandProtocol('HTTP POST Push');
    setNewBrandPolling('Real-time Webhook');
    setNewBrandStatus('active');
  };

  const handleStartEditService = (service: any) => {
    setEditingServiceId(service.id);
    setNewBrandName(service.brandName);
    setNewBrandCustomName(service.customName);
    setNewBrandApiUrl(service.apiUrl);
    setNewBrandApiKey(service.apiKey);
    setNewBrandProtocol(service.protocol);
    setNewBrandPolling(service.pollingInterval);
    setNewBrandStatus(service.status);
    setShowAddServiceModal(true);
  };

  const handleToggleServiceStatus = (serviceId: string) => {
    setBiometricServices(prev => prev.map(s => s.id === serviceId ? {
      ...s,
      status: s.status === 'active' ? 'inactive' : 'active'
    } : s));
  };

  const handleDeleteBiometricService = (serviceId: string) => {
    setBiometricServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const handleTestHandshake = (serviceId: string) => {
    setIsTestingHandshake(serviceId);
    setHandshakeResult(null);

    const srv = biometricServices.find(s => s.id === serviceId);
    if (!srv) return;

    setTimeout(() => {
      setIsTestingHandshake(null);
      const isSuccess = srv.status === 'active' && srv.apiUrl.startsWith('http');
      if (isSuccess) {
        setBiometricServices(prev => prev.map(s => s.id === serviceId ? { ...s, lastSyncStatus: 'success' } : s));
        setHandshakeResult(`Handshake Successful with ${srv.brandName} (${srv.customName})! API endpoint responded with HTTP 200 OK. Verification payload signature matched successfully.`);
      } else {
        setBiometricServices(prev => prev.map(s => s.id === serviceId ? { ...s, lastSyncStatus: 'failed' } : s));
        setHandshakeResult(`Handshake Failed with ${srv.brandName} (${srv.customName}). Please check if the service is Active, the API URL is valid, or if the API key has expired.`);
      }
    }, 1800);
  };

  const handleSimulateApiLogPush = (brandName: string) => {
    const empId = users[0]?.employeeId || 'EMP-1001';
    const empName = users[0]?.name || 'Puneet Batham';
    
    // Create random timestamp for today
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const randomTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const newLog = {
      id: `rml-${Date.now()}`,
      employeeId: empId,
      name: empName,
      time: randomTime,
      method: brandName === 'ZKTeco' ? 'Face' : brandName === 'Suprema' ? 'Fingerprint' : 'Card',
      ip: '192.168.1.188'
    };

    setRawMachineLogs(prev => [newLog, ...prev]);
    setHandshakeResult(`API SIMULATION SUCCESS: Received valid biometric payload from ${brandName} Cloud Hub! 1 raw punch log registered for employee ${empName} (${empId}) at ${randomTime}. Switch to the 'Terminals & User Credentials' sub-tab and click 'Calculate Policy Data' to see it evaluated!`);
  };

  // Shift customize dispatcher
  const handleShiftEditStart = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setEditStartTime(shift.startTime);
    setEditEndTime(shift.endTime);
    setEditGracePeriod(shift.gracePeriodMinutes);
  };

  const handleShiftEditSave = (shiftId: string) => {
    onUpdateShift(shiftId, editStartTime, editEndTime, editGracePeriod);
    setEditingShiftId(null);
  };

  // Preset freq setup
  const handlePresetFrequencyClick = (freq: 'daily' | 'weekly' | 'monthly' | 'custom') => {
    setReportFrequency(freq);
    const todayStr = new Date().toISOString().split('T')[0];
    if (freq === 'daily') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
      setReportLayout('vertical');
    } else if (freq === 'weekly') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setFilterStartDate(past.toISOString().split('T')[0]);
      setFilterEndDate(todayStr);
      setReportLayout('horizontal');
    } else if (freq === 'monthly') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      setFilterStartDate(past.toISOString().split('T')[0]);
      setFilterEndDate(todayStr);
      setReportLayout('horizontal');
    }
  };

  // Safe list of unique dates for Horizontal Matrix (capped at 31 days)
  const getDatesList = () => {
    const start = filterStartDate;
    const end = filterEndDate;
    if (!start || !end) {
      // if not selected, default to last 30 days
      const dates: string[] = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    }
    
    const dates: string[] = [];
    const curr = new Date(start);
    const last = new Date(end);
    
    const diffMs = last.getTime() - curr.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 31) {
      // if range exceeds 31 days, return the last 31 days to fit visual matrix beautifully
      const limitStart = new Date(last);
      limitStart.setDate(last.getDate() - 30);
      const temp = new Date(limitStart);
      while (temp <= last) {
        dates.push(temp.toISOString().split('T')[0]);
        temp.setDate(temp.getDate() + 1);
      }
      return dates;
    }

    const temp = new Date(curr);
    while (temp <= last) {
      dates.push(temp.toISOString().split('T')[0]);
      temp.setDate(temp.getDate() + 1);
    }
    return dates;
  };

  // Customized punch filtering formula
  const getFilteredPunches = () => {
    return punchLogs.filter(log => {
      // User match
      if (filterUser !== 'all' && log.userId !== filterUser) return false;
      // Shift match
      if (filterShift !== 'all' && log.shiftId !== filterShift) return false;
      // Status match
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      // Date constraints
      if (filterStartDate && log.date < filterStartDate) return false;
      if (filterEndDate && log.date > filterEndDate) return false;
      // Weekend constraints
      if (filterWeekendOnly) {
        const logDate = new Date(log.punchInTime);
        const logDayIdx = logDate.getDay();
        const logUser = users.find(u => u.id === log.userId);
        const userWeekends = logUser?.weekends !== undefined ? logUser.weekends : (policy?.weekends || [0, 6]);
        const isWeekend = userWeekends.includes(logDayIdx);
        if (!isWeekend) return false;
      }
      return true;
    });
  };

  const filteredPunches = getFilteredPunches();

  // Statistics summaries
  const totalEmployees = users.filter(u => u.role === 'employee').length;
  const punchInsCount = punchLogs.length;
  const lateCount = punchLogs.filter(l => l.status === 'late').length;
  const onTimeRatio = punchInsCount > 0 ? Math.round(((punchInsCount - lateCount) / punchInsCount) * 100) : 100;
  
  // DND Suppression highlights
  const suppressedCount = notificationsLog.filter(n => n.status === 'suppressed').length;
  const deliverySuccessRatio = notificationsLog.length > 0 
    ? Math.round(((notificationsLog.length - suppressedCount) / notificationsLog.length) * 100) 
    : 100;

  const getWorkDurationStr = (punchInTime: string, punchOutTime: string | null) => {
    if (!punchOutTime) return 'Active session';
    const diffMs = new Date(punchOutTime).getTime() - new Date(punchInTime).getTime();
    if (isNaN(diffMs) || diffMs < 0) return '0.0 hrs';
    const diffHrs = diffMs / (1000 * 60 * 60);
    return `${diffHrs.toFixed(1)} hrs`;
  };

  // Custom CSV Exporter respecting selected columns only
  const handleDownloadCSV = () => {
    if (filteredPunches.length === 0) return;
    
    if (reportLayout === 'horizontal') {
      const dates = getDatesList();
      const headers = ["Employee Name", "Total Hours", "On-Time Rate", ...dates].map(h => `"${h}"`).join(",");
      let csvContent = "data:text/csv;charset=utf-8," + headers + "\n";
      
      const empUsers = users.filter(u => u.role === 'employee');
      empUsers.forEach(emp => {
        const empLogs = punchLogs.filter(log => log.userId === emp.id && dates.includes(log.date));
        const totalMin = empLogs.reduce((acc, log) => {
          if (log.punchInTime && log.punchOutTime) {
            return acc + Math.round((new Date(log.punchOutTime).getTime() - new Date(log.punchInTime).getTime()) / 60000);
          }
          return acc;
        }, 0);
        const totalHours = (totalMin / 60).toFixed(1) + "h";
        
        const totalPunches = empLogs.length;
        const latePunches = empLogs.filter(log => log.status === 'late').length;
        const rate = totalPunches > 0 ? Math.round(((totalPunches - latePunches) / totalPunches) * 100) + "%" : "100%";
        
        const rowVals = [
          emp.name,
          totalHours,
          rate,
          ...dates.map(d => {
            const logOnDate = empLogs.find(l => l.date === d);
            if (logOnDate) {
              return logOnDate.status.toUpperCase() + (logOnDate.punchOutTime ? ` (${getWorkDurationStr(logOnDate.punchInTime, logOnDate.punchOutTime)})` : " (ACTIVE)");
            } else {
              const dayOfWeek = new Date(d).getDay();
              const userWeekends = emp.weekends !== undefined ? emp.weekends : (policy?.weekends || [0, 6]);
              const isWeekend = userWeekends.includes(dayOfWeek);
              return isWeekend ? "REST" : "ABSENT";
            }
          })
        ].map(val => `"${val.replace(/"/g, '""')}"`);
        
        csvContent += rowVals.join(",") + "\n";
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `horizontal_monthly_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    const columnsToDraw = AVAILABLE_COLUMNS.filter(col => selectedColumns.includes(col.id));
    const csvHeaders = columnsToDraw.map(col => `"${col.label.replace(/"/g, '""')}"`).join(",");
    let csvContent = "data:text/csv;charset=utf-8," + csvHeaders + "\n";
    
    filteredPunches.forEach(p => {
      const u = users.find(user => user.id === p.userId);
      const rowValues = columnsToDraw.map(col => {
        let val = '';
        if (col.id === 'employeeName') val = p.userName;
        else if (col.id === 'employeeId') val = u?.employeeId || 'N/A';
        else if (col.id === 'date') val = p.date;
        else if (col.id === 'punchIn') val = new Date(p.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        else if (col.id === 'punchOut') val = p.punchOutTime ? new Date(p.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';
        else if (col.id === 'shift') val = p.shiftName;
        else if (col.id === 'geotag') val = p.punchInLocation.name;
        else if (col.id === 'status') val = p.status;
        else if (col.id === 'duration') val = getWorkDurationStr(p.punchInTime, p.punchOutTime);
        else if (col.id === 'notes') val = p.notes || '';
        
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvContent += rowValues.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${reportFrequency}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Styled Excel Exporter in .xls HTML format
  const handleDownloadExcel = () => {
    if (filteredPunches.length === 0) return;
    
    if (reportLayout === 'horizontal') {
      const dates = getDatesList();
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
      html += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Monthly Attendance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>`;
      html += `<body style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; color: #334155;">`;
      html += `<h2 style="color: #0284c7; margin-bottom: 5px;">Horizontal Attendance Matrix Report</h2>`;
      html += `<p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Monthly matrix for period: <strong>${filterStartDate || 'Any'} to ${filterEndDate || 'Any'}</strong></p>`;
      html += `<table border="1" cellpadding="8" style="border-collapse: collapse; border: 1px solid #cbd5e1;">`;
      html += `<tr style="background-color: #0284c7; color: #ffffff; text-align: left; font-weight: bold; font-size: 11px;">`;
      html += `<th style="padding: 10px; border: 1px solid #cbd5e1;">Employee Name</th>`;
      html += `<th style="padding: 10px; border: 1px solid #cbd5e1;">Total Hours</th>`;
      html += `<th style="padding: 10px; border: 1px solid #cbd5e1;">On-Time Rate</th>`;
      dates.forEach(d => {
        html += `<th style="padding: 10px; border: 1px solid #cbd5e1; min-width: 80px;">${d}</th>`;
      });
      html += `</tr>`;
      
      const empUsers = users.filter(u => u.role === 'employee');
      empUsers.forEach((emp, idx) => {
        const empLogs = punchLogs.filter(log => log.userId === emp.id && dates.includes(log.date));
        const totalMin = empLogs.reduce((acc, log) => {
          if (log.punchInTime && log.punchOutTime) {
            return acc + Math.round((new Date(log.punchOutTime).getTime() - new Date(log.punchInTime).getTime()) / 60000);
          }
          return acc;
        }, 0);
        const totalHours = (totalMin / 60).toFixed(1) + "h";
        
        const totalPunches = empLogs.length;
        const latePunches = empLogs.filter(log => log.status === 'late').length;
        const rate = totalPunches > 0 ? Math.round(((totalPunches - latePunches) / totalPunches) * 100) + "%" : "100%";
        
        const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
        html += `<tr style="background-color: ${rowBg}; font-size: 11px;">`;
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${emp.name}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${totalHours}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${rate}</td>`;
        
        dates.forEach(d => {
          const logOnDate = empLogs.find(l => l.date === d);
          if (logOnDate) {
            let color = '#10b981'; // green
            if (logOnDate.status === 'late') color = '#f59e0b';
            if (logOnDate.status === 'half-day') color = '#0284c7';
            html += `<td style="padding: 8px; border: 1px solid #cbd5e1; color: ${color}; font-weight: bold; text-align: center;">${logOnDate.status.toUpperCase()}</td>`;
          } else {
            const dayOfWeek = new Date(d).getDay();
            const userWeekends = emp.weekends !== undefined ? emp.weekends : (policy?.weekends || [0, 6]);
            const isWeekend = userWeekends.includes(dayOfWeek);
            if (isWeekend) {
              html += `<td style="padding: 8px; border: 1px solid #cbd5e1; color: #94a3b8; font-style: italic; text-align: center;">Rest</td>`;
            } else {
              html += `<td style="padding: 8px; border: 1px solid #cbd5e1; color: #ef4444; font-weight: bold; text-align: center;">Absent</td>`;
            }
          }
        });
        html += `</tr>`;
      });
      html += `</table></body></html>`;
      
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `horizontal_monthly_report_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    const columnsToDraw = AVAILABLE_COLUMNS.filter(col => selectedColumns.includes(col.id));
    
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Attendance Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>`;
    html += `<body style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; color: #334155;">`;
    html += `<h2 style="color: #0284c7; margin-bottom: 5px;">Operational Attendance Audit Ledger</h2>`;
    html += `<p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Report Preset Frequency: <strong>${reportFrequency.toUpperCase()} ({${filterStartDate || 'Any'} to ${filterEndDate || 'Any'}})</strong> | Extracted: ${new Date().toLocaleString()}</p>`;
    html += `<table border="1" cellpadding="8" style="border-collapse: collapse; border: 1px solid #cbd5e1; min-width: 800px;">`;
    html += `<tr style="background-color: #0284c7; color: #ffffff; text-align: left; font-weight: bold; font-size: 11.5px;">`;
    
    columnsToDraw.forEach(col => {
      html += `<th style="padding: 10px; border: 1px solid #cbd5e1;">${col.label}</th>`;
    });
    html += `</tr>`;
    
    filteredPunches.forEach((p, idx) => {
      const u = users.find(user => user.id === p.userId);
      const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
      html += `<tr style="background-color: ${rowBg}; font-size: 11px;">`;
      
      if (selectedColumns.includes('employeeName')) html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${p.userName}</td>`;
      if (selectedColumns.includes('employeeId')) html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${u?.employeeId || 'N/A'}</td>`;
      if (selectedColumns.includes('date')) html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${p.date}</td>`;
      if (selectedColumns.includes('punchIn')) {
        const timeVal = new Date(p.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${timeVal}</td>`;
      }
      if (selectedColumns.includes('punchOut')) {
        const timeVal = p.punchOutTime ? new Date(p.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Session';
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${timeVal}</td>`;
      }
      if (selectedColumns.includes('shift')) html += `<td style="padding: 8px; border: 1px solid #cbd5e1;">${p.shiftName}</td>`;
      if (selectedColumns.includes('geotag')) html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 10px; color: #475569;">${p.punchInLocation.name}</td>`;
      if (selectedColumns.includes('status')) {
        let color = '#10b981'; // emerald
        if (p.status === 'late') color = '#f59e0b'; // amber
        if (p.status === 'half-day') color = '#0284c7'; // sky
        if (p.status === 'absent') color = '#ef4444'; // red
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; color: ${color}; font-weight: bold; text-transform: uppercase; font-size: 10px;">${p.status}</td>`;
      }
      if (selectedColumns.includes('duration')) {
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${getWorkDurationStr(p.punchInTime, p.punchOutTime)}</td>`;
      }
      if (selectedColumns.includes('notes')) {
        html += `<td style="padding: 8px; border: 1px solid #cbd5e1; color: #64748b; font-style: italic;">${p.notes || ''}</td>`;
      }
      html += `</tr>`;
    });
    
    html += `</table></body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${reportFrequency}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Plain Text formatted table Exporter 
  const handleDownloadTXT = () => {
    if (filteredPunches.length === 0) return;
    
    if (reportLayout === 'horizontal') {
      const dates = getDatesList();
      let txt = `=========================================================================\n`;
      txt += ` HORIZONTAL MONTHLY ATTENDANCE MATRIX - TXT EXPORT\n`;
      txt += ` Generated on: ${new Date().toLocaleString()}\n`;
      txt += ` Period: ${filterStartDate || 'Any'} to ${filterEndDate || 'Any'}\n`;
      txt += ` Codes: O=On-Time, L=Late, H=Half-Day, A=Absent, R=Rest (Weekend)\n`;
      txt += `=========================================================================\n\n`;
      
      const colWidth = 10;
      const firstColWidth = 25;
      
      // Header row
      let headerStr = "Employee Name".padEnd(firstColWidth) + " | Hrs".padEnd(8) + " | Rate".padEnd(8);
      dates.forEach(d => {
        const shortDate = d.substring(5); // MM-DD
        headerStr += " | " + shortDate.padEnd(colWidth);
      });
      txt += headerStr + "\n";
      txt += "-".repeat(headerStr.length) + "\n";
      
      const empUsers = users.filter(u => u.role === 'employee');
      empUsers.forEach(emp => {
        const empLogs = punchLogs.filter(log => log.userId === emp.id && dates.includes(log.date));
        const totalMin = empLogs.reduce((acc, log) => {
          if (log.punchInTime && log.punchOutTime) {
            return acc + Math.round((new Date(log.punchOutTime).getTime() - new Date(log.punchInTime).getTime()) / 60000);
          }
          return acc;
        }, 0);
        const totalHours = (totalMin / 60).toFixed(1) + "h";
        
        const totalPunches = empLogs.length;
        const latePunches = empLogs.filter(log => log.status === 'late').length;
        const rate = totalPunches > 0 ? Math.round(((totalPunches - latePunches) / totalPunches) * 100) + "%" : "100%";
        
        let rowStr = emp.name.padEnd(firstColWidth).substring(0, firstColWidth) + " | " + totalHours.padEnd(5) + " | " + rate.padEnd(5);
        dates.forEach(d => {
          const logOnDate = empLogs.find(l => l.date === d);
          let cellCode = "-";
          if (logOnDate) {
            if (logOnDate.status === 'on-time') cellCode = "O";
            else if (logOnDate.status === 'late') cellCode = "L";
            else if (logOnDate.status === 'half-day') cellCode = "H";
            else cellCode = "A";
          } else {
            const dayOfWeek = new Date(d).getDay();
            const userWeekends = emp.weekends !== undefined ? emp.weekends : (policy?.weekends || [0, 6]);
            const isWeekend = userWeekends.includes(dayOfWeek);
            cellCode = isWeekend ? "R" : "A";
          }
          rowStr += " | " + cellCode.padEnd(colWidth);
        });
        txt += rowStr + "\n";
      });
      
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `horizontal_monthly_matrix_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    let txt = `=========================================================================\n`;
    txt += ` PERSONNEL ATTENDANCE REPORT - ${reportFrequency.toUpperCase()}\n`;
    txt += ` Generated on: ${new Date().toLocaleString()}\n`;
    txt += ` Criteria: User: ${filterUser} | Shift: ${filterShift} | Status: ${filterStatus}\n`;
    txt += ` Target Range: ${filterStartDate || 'Any'} to ${filterEndDate || 'Any'}\n`;
    txt += `=========================================================================\n\n`;
    
    const columnsToDraw = AVAILABLE_COLUMNS.filter(col => selectedColumns.includes(col.id));
    
    // Header Row with tabs
    const headers = columnsToDraw.map(col => col.label.padEnd(20)).join(" | ");
    txt += headers + "\n";
    txt += "-".repeat(headers.length) + "\n";
    
    filteredPunches.forEach(p => {
      const u = users.find(user => user.id === p.userId);
      const rowVals = columnsToDraw.map(col => {
        let val = '';
        if (col.id === 'employeeName') val = p.userName;
        else if (col.id === 'employeeId') val = u?.employeeId || 'N/A';
        else if (col.id === 'date') val = p.date;
        else if (col.id === 'punchIn') val = new Date(p.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        else if (col.id === 'punchOut') val = p.punchOutTime ? new Date(p.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';
        else if (col.id === 'shift') val = p.shiftName;
        else if (col.id === 'geotag') val = p.punchInLocation.name;
        else if (col.id === 'status') val = p.status.toUpperCase();
        else if (col.id === 'duration') val = getWorkDurationStr(p.punchInTime, p.punchOutTime);
        else if (col.id === 'notes') val = p.notes || '';
        
        return val.padEnd(20).substring(0, 20);
      });
      
      txt += rowVals.join(" | ") + "\n";
    });
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${reportFrequency}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Vector Landscape PDF exporter using jsPDF
  const handleDownloadPDF = () => {
    if (filteredPunches.length === 0) return;
    
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      
      if (reportLayout === 'horizontal') {
        const dates = getDatesList();
        
        // Document frame title
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Slate-900 Accent
        doc.text(`HORIZONTAL PERIODIC ATTENDANCE SPREADSHEET MATRIX (PDF)`, 40, 45);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500 Info
        doc.text(`Report Presets: HORIZONTAL MATRIX for range: ${filterStartDate || 'Any'} to ${filterEndDate || 'Any'}`, 40, 60);
        doc.text(`Extracted: ${new Date().toLocaleString()} | Legend: O=On-Time, L=Late, H=Half-day, A=Absent, R=Rest`, 40, 72);
        
        // Horizontal Table Matrix calculation
        const xStart = 40;
        const widthLimit = 762;
        const firstColW = 120; // 120pt for Employee Name
        const summaryColsW = 40 * 2; // 40 for Hours, 40 for Rate
        const remainingW = widthLimit - firstColW - summaryColsW;
        const cellW = remainingW / dates.length; // width of each date column
        
        let currentY = 100;
        
        // Header Row background
        doc.setFillColor(14, 165, 233);
        doc.rect(xStart, currentY - 12, widthLimit, 18, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        
        // Header Text
        doc.text("Employee Name", xStart + 5, currentY);
        doc.text("Hours", xStart + firstColW + 2, currentY);
        doc.text("Rate", xStart + firstColW + 42, currentY);
        
        let headerDateX = xStart + firstColW + summaryColsW;
        dates.forEach(d => {
          const s = d.substring(8); // just day "dd"
          doc.text(s, headerDateX + (cellW / 2) - 4, currentY);
          headerDateX += cellW;
        });
        
        currentY += 16;
        
        const empUsers = users.filter(u => u.role === 'employee');
        empUsers.forEach((emp, eIdx) => {
          if (currentY > 530) {
            doc.addPage();
            currentY = 50;
            
            // Repeat headers
            doc.setFillColor(14, 165, 233);
            doc.rect(xStart, currentY - 12, widthLimit, 18, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text("Employee Name", xStart + 5, currentY);
            doc.text("Hours", xStart + firstColW + 2, currentY);
            doc.text("Rate", xStart + firstColW + 42, currentY);
            
            let dateSubX = xStart + firstColW + summaryColsW;
            dates.forEach(d => {
              const s = d.substring(8);
              doc.text(s, dateSubX + (cellW / 2) - 4, currentY);
              dateSubX += cellW;
            });
            currentY += 16;
          }
          
          // Backing
          if (eIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(xStart, currentY - 10, widthLimit, 14, 'F');
          }
          
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          doc.text(emp.name, xStart + 5, currentY);
          
          const empLogs = punchLogs.filter(log => log.userId === emp.id && dates.includes(log.date));
          const totalMin = empLogs.reduce((acc, log) => {
            if (log.punchInTime && log.punchOutTime) {
              return acc + Math.round((new Date(log.punchOutTime).getTime() - new Date(log.punchInTime).getTime()) / 60000);
            }
            return acc;
          }, 0);
          const totalHours = (totalMin / 60).toFixed(1) + "h";
          
          const totalPunches = empLogs.length;
          const latePunches = empLogs.filter(log => log.status === 'late').length;
          const rate = totalPunches > 0 ? Math.round(((totalPunches - latePunches) / totalPunches) * 100) + "%" : "100%";
          
          doc.setFont('Helvetica', 'normal');
          doc.text(totalHours, xStart + firstColW + 5, currentY);
          doc.text(rate, xStart + firstColW + 45, currentY);
          
          let dateGridX = xStart + firstColW + summaryColsW;
          dates.forEach(d => {
            const logOnDate = empLogs.find(l => l.date === d);
            let code = "-";
            doc.setFont('Helvetica', 'bold');
            if (logOnDate) {
              if (logOnDate.status === 'on-time') {
                code = "O";
                doc.setTextColor(16, 185, 129); // green
              } else if (logOnDate.status === 'late') {
                code = "L";
                doc.setTextColor(245, 158, 11); // amber
              } else if (logOnDate.status === 'half-day') {
                code = "H";
                doc.setTextColor(2, 132, 199); // sky
              } else {
                code = "A";
                doc.setTextColor(239, 68, 68); // red
              }
            } else {
              const dayOfWeek = new Date(d).getDay();
              const userWeekends = emp.weekends !== undefined ? emp.weekends : (policy?.weekends || [0, 6]);
              const isWeekend = userWeekends.includes(dayOfWeek);
              if (isWeekend) {
                code = "R";
                doc.setTextColor(148, 163, 184); // gray slate
              } else {
                code = "A";
                doc.setTextColor(239, 68, 68); // red
              }
            }
            doc.text(code, dateGridX + (cellW / 2) - 3, currentY);
            dateGridX += cellW;
          });
          
          currentY += 14;
        });
        
        doc.save(`horizontal_attendance_matrix_${new Date().toISOString().split('T')[0]}.pdf`);
        return;
      }

      // Document frame title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // Slate-900 Accent
      doc.text(`OPERATIONAL ATTENDANCE AUDIT LEDGER`, 40, 45);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate-500 Info
      doc.text(`Report Presets: ${reportFrequency.toUpperCase()} frequency filter (Range: ${filterStartDate || 'Any'} to ${filterEndDate || 'Any'})`, 40, 62);
      doc.text(`Extracted Record Dossier: ${new Date().toLocaleString()}`, 40, 75);
      doc.text(`Active database compliance scope: Staff: ${filterUser} | Shift: ${filterShift} | Status: ${filterStatus}`, 40, 88);
      
      const columnsToDraw = AVAILABLE_COLUMNS.filter(col => selectedColumns.includes(col.id));
      
      // Proportional widths based on selected columns
      const colWidths: { [key: string]: number } = {
        employeeName: 90,
        employeeId: 65,
        date: 60,
        punchIn: 55,
        punchOut: 55,
        shift: 70,
        geotag: 140,
        status: 60,
        duration: 70,
        notes: 110
      };
      
      const totalRequestedWidth = columnsToDraw.reduce((acc, col) => acc + (colWidths[col.id] || 80), 0);
      const scaleFactor = 762 / totalRequestedWidth; // Available area on landscape A4 is 762 (842 - 80 margin)
      
      const finalColumnLayout = columnsToDraw.map(col => ({
        id: col.id,
        label: col.label,
        width: (colWidths[col.id] || 80) * scaleFactor
      }));

      let currentY = 115;
      
      // Row header rectangle
      doc.setFillColor(14, 165, 233); // Sky-500
      doc.rect(40, currentY - 15, 762, 22, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      
      let headerX = 45;
      finalColumnLayout.forEach(col => {
        doc.text(col.label, headerX, currentY);
        headerX += col.width;
      });
      
      currentY += 15;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85); // Slate-700
      
      filteredPunches.forEach((p, index) => {
        // Handle page wrap bounds
        if (currentY > 530) {
          doc.addPage();
          currentY = 50;
          
          doc.setFillColor(14, 165, 233);
          doc.rect(40, currentY - 15, 762, 22, 'F');
          
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          
          let subX = 45;
          finalColumnLayout.forEach(col => {
            doc.text(col.label, subX, currentY);
            subX += col.width;
          });
          currentY += 15;
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        }
        
        // Odd row colored backing
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.rect(40, currentY - 10, 762, 16, 'F');
        }
        
        const u = users.find(user => user.id === p.userId);
        let cellX = 45;
        
        finalColumnLayout.forEach(col => {
          let cellText = '';
          if (col.id === 'employeeName') cellText = p.userName;
          else if (col.id === 'employeeId') cellText = u?.employeeId || 'N/A';
          else if (col.id === 'date') cellText = p.date;
          else if (col.id === 'punchIn') cellText = new Date(p.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          else if (col.id === 'punchOut') cellText = p.punchOutTime ? new Date(p.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';
          else if (col.id === 'shift') cellText = p.shiftName;
          else if (col.id === 'geotag') cellText = p.punchInLocation.name;
          else if (col.id === 'status') cellText = p.status;
          else if (col.id === 'duration') cellText = getWorkDurationStr(p.punchInTime, p.punchOutTime);
          else if (col.id === 'notes') cellText = p.notes || '';
          
          // Truncation safeguard so text fits bounds
          const charBudget = Math.floor(col.width / 4.8);
          if (cellText.length > charBudget && charBudget > 5) {
            cellText = cellText.substring(0, charBudget - 3) + '...';
          }
          
          if (col.id === 'status') {
            doc.setFont('Helvetica', 'bold');
            if (p.status === 'on-time') doc.setTextColor(16, 185, 129);
            else if (p.status === 'late') doc.setTextColor(245, 158, 11);
            else if (p.status === 'half-day') doc.setTextColor(2, 132, 199);
            else doc.setTextColor(239, 68, 68);
          } else {
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
          }
          
          doc.text(cellText, cellX, currentY);
          cellX += col.width;
        });
        
        currentY += 16;
      });
      
      doc.save(`attendance_report_${reportFrequency}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error("PDF generator failed: ", e);
      alert("Error building vector PDF file. Exporting plain text table instead.");
      handleDownloadTXT();
    }
  };

  // JSON raw logs DB Backup Exporter
  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredPunches, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `attendance_database_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden self-stretch" id="admin-panel-canvas">
      
      {/* Top Banner with Admin Context */}
      <div className="bg-slate-900 px-8 py-5 border-b border-slate-800 flex justify-between items-center" id="admin-view-header">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-400">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Global Admin Workspace</span>
          </div>
          <h2 className="text-2xl font-bold font-sans text-slate-100">Smart Attendance Suite</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60 hidden md:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-slate-300 font-medium">Session: {currentUser.name} (Admin)</span>
          </div>
          <button 
            onClick={handleSystemBackup}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-900/60 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-950/45 hover:text-white transition-all text-xs font-semibold cursor-pointer"
            id="system-backup-btn"
          >
            <Download className="h-3.5 w-3.5" />
            System Backup
          </button>
          <button 
            onClick={onClearLogs}
            className="px-3.5 py-1.5 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-300 hover:bg-rose-950/45 hover:text-white transition-all text-xs font-semibold cursor-pointer"
            id="audit-wipe-logs-btn"
          >
            Clear Records
          </button>
        </div>
      </div>

      {/* Roster tab selector */}
      <div className="bg-slate-50 border-b border-slate-100 px-8 flex gap-2 overflow-x-auto" id="admin-view-tabs">
        {[
          { id: 'analytics', label: 'Dynamic Reports & Trends', icon: Calendar },
          { id: 'reports', label: 'Customize Filter Ledger', icon: FileText },
          { id: 'users', label: 'Employee Profiles & Onboarding', icon: UserPlus },
          { id: 'shifts', label: 'Shift Rules Configurator', icon: Settings },
          { id: 'branches', label: 'Branches & Departments', icon: Globe },
          { id: 'notifications', label: 'DND Notification Logs', icon: VolumeX },
          { id: 'qrcodes', label: 'Workspace QR Station', icon: QrCode },
          { id: 'biometrics', label: 'Hardware Biometrics Hub', icon: Fingerprint },
          { id: 'ai', label: 'Gemini AI Advisory', icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-4 border-b-2 font-semibold text-xs tracking-wide transition-all outline-none focus:outline-none shrink-0 cursor-pointer
                ${isActive 
                  ? 'border-sky-500 text-sky-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
              id={`tab-btn-${tab.id}`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Panel content display */}
      <div className="p-8" id="admin-tab-viewport">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (
            <motion.div
              key="tab-analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
              id="analytics-viewport-card"
            >
              {/* Inner Sub-Tab Selector for Analytics */}
              <div className="flex gap-2 border-b border-slate-100 pb-3" id="analytics-sub-tabs">
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab('gemini')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all border-0 outline-none flex items-center gap-1.5
                    ${analyticsSubTab === 'gemini' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'}`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gemini Weekly AI Analytics Insights</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab('standard')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all border-0 outline-none flex items-center gap-1.5
                    ${analyticsSubTab === 'standard' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'}`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Standard Attendance Reports</span>
                </button>
              </div>

              {analyticsSubTab === 'gemini' ? (
                <GeminiWeeklyAnalytics 
                  users={users} 
                  shifts={shifts} 
                  punchLogs={punchLogs} 
                />
              ) : (
                <>
                  {/* Dynamic KPI summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
                      <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block uppercase">Active Staff</span>
                        <h3 className="text-2xl font-bold font-mono text-slate-800 mt-0.5">{totalEmployees}</h3>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
                      <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-2xl">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block uppercase">Total Punches</span>
                        <h3 className="text-2xl font-bold font-mono text-slate-800 mt-0.5">{punchInsCount}</h3>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
                      <div className={`p-3.5 rounded-2xl ${onTimeRatio > 75 ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block uppercase">On-Time Arrival</span>
                        <h3 className="text-2xl font-bold font-mono text-slate-800 mt-0.5">{onTimeRatio}%</h3>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
                      <div className="p-3.5 bg-amber-50 text-amber-500 rounded-2xl">
                        <VolumeX className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block uppercase">DND Clipped Alerts</span>
                        <h3 className="text-2xl font-bold font-mono text-slate-800 mt-0.5">{suppressedCount}</h3>
                      </div>
                    </div>

                  </div>

                  {/* D3.js Calendar Heatmap Integration */}
                  <AttendanceHeatmap punchLogs={punchLogs} />

                  {/* Recharts 7-Day Interactive Biometric Punch Analytics */}
                  <PunchAnalyticsChart punchLogs={punchLogs} />

                  {/* Responsive SVG Grid Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* SVG Attendance Ratio Trend */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs col-span-2">
                      <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center justify-between">
                        <span>Attendance Logs Timeline (Daily Distribution)</span>
                        <span className="text-[11px] font-medium text-slate-400 font-mono">Roll-up of last 5 days</span>
                      </h4>

                      {/* SVG Chart Drawing */}
                      <div className="w-full h-64 relative font-mono text-[10px]">
                        <svg className="w-full h-full overflow-visible" id="timeline-svg-chart">
                          {/* Grid Lines */}
                          <line x1="40" y1="20" x2="100%" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="80" x2="100%" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="140" x2="100%" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="40" y1="200" x2="100%" y2="200" stroke="#f1f5f9" strokeWidth="1" />

                          {/* Y-Axis Label Texts */}
                          <text x="5" y="24" className="fill-slate-400 font-semibold font-sans">10 Punches</text>
                          <text x="5" y="84" className="fill-slate-400 font-semibold font-sans">5 Punches</text>
                          <text x="5" y="144" className="fill-slate-400 font-semibold font-sans">2 Punches</text>
                          <text x="5" y="204" className="fill-slate-400 font-semibold font-sans">0 Punches</text>

                          {/* Bars Loop
                              Let's draw 5 bars matching the 5 days. 
                              Daily totals: Day 4 (3), Day 3 (3), Day 2 (3), Day 1 (3). Let's simulate beautiful graphic metrics.
                          */}
                          {[
                            { day: "4 Days Ago", ontime: 3, late: 0, index: 0 },
                            { day: "3 Days Ago", ontime: 2, late: 1, index: 1 },
                            { day: "2 Days Ago", ontime: 2, late: 1, index: 2 },
                            { day: "Yesterday", ontime: 1, late: 2, index: 3 },
                            { day: "Today (Sim)", ontime: 2, late: 0, index: 4 }
                          ].map((item, idx) => {
                            const spacingFactor = 160; /***** scaling spacing coordinates on X axis *****/
                            const xOffset = 60 + idx * spacingFactor;
                            
                            // Scale factors: 1 unit = 18px height
                            const onTimeHeight = item.ontime * 18;
                            const lateHeight = item.late * 18;

                            const onTimeY = 200 - onTimeHeight;
                            const lateY = onTimeY - lateHeight;

                            return (
                              <g key={idx}>
                                {/* On-Time Bar segment */}
                                <motion.rect
                                  initial={{ height: 0, y: 200 }}
                                  animate={{ height: onTimeHeight, y: onTimeY }}
                                  transition={{ duration: 1, delay: idx * 0.1 }}
                                  x={xOffset}
                                  width="40"
                                  rx="4"
                                  className="fill-emerald-400 hover:fill-emerald-500 transition-colors"
                                />
                                {/* Late Bar segment */}
                                {item.late > 0 && (
                                  <motion.rect
                                    initial={{ height: 0, y: onTimeY }}
                                    animate={{ height: lateHeight, y: lateY }}
                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                    x={xOffset}
                                    width="40"
                                    rx="4"
                                    className="fill-amber-400 hover:fill-amber-500 transition-all"
                                  />
                                )}

                                {/* Axis Label */}
                                <text x={xOffset + 20} y="220" textAnchor="middle" className="fill-slate-500 font-sans font-medium text-[10px]">
                                  {item.day}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Chart Legend */}
                        <div className="absolute right-0 top-[-40px] flex items-center gap-4 text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-emerald-400 block border border-emerald-500"></span>
                            <span className="text-slate-600 block">On-Time Punch</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-amber-400 block border border-amber-500"></span>
                            <span className="text-slate-600 block">Late Punch</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SVG Shift Allocation Distribution */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                      <h4 className="text-sm font-bold text-slate-800 mb-6">Shift Distribution Share</h4>
                      
                      <div className="h-64 flex flex-col justify-center items-center">
                        {/* Ring circle illustration describing shifts configuration */}
                        <div className="relative w-40 h-40 flex items-center justify-center">
                          <svg className="w-full h-full rotate-[-90deg]">
                            {/* Circle elements */}
                            {/* Morning: 50% radius=60 stroke=12 */}
                            <circle cx="80" cy="80" r="60" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                            <circle cx="80" cy="80" r="60" fill="transparent" stroke="#10b981" strokeWidth="12" 
                              strokeDasharray="377" strokeDashoffset="125" strokeLinecap="round" 
                            />
                            {/* Evening: 30% */}
                            <circle cx="80" cy="80" r="45" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                            <circle cx="80" cy="80" r="45" fill="transparent" stroke="#f59e0b" strokeWidth="10" 
                              strokeDasharray="283" strokeDashoffset="110" strokeLinecap="round" 
                            />
                            {/* Night: 20% */}
                            <circle cx="80" cy="80" r="30" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                            <circle cx="80" cy="80" r="30" fill="transparent" stroke="#6366f1" strokeWidth="8" 
                              strokeDasharray="188" strokeDashoffset="90" strokeLinecap="round" 
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-xs text-slate-400 font-semibold block">Total Active</span>
                            <span className="text-xl font-extrabold text-slate-800 font-mono tracking-tight leading-none block">{punchInsCount}</span>
                          </div>
                        </div>

                        {/* Compact Label lists */}
                        <div className="grid grid-cols-3 gap-2.5 w-full mt-4 text-[10px] text-center font-semibold">
                          <div className="text-emerald-600 block">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
                            <span className="block mt-0.5">Morning (60%)</span>
                          </div>
                          <div className="text-amber-600 block">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block mr-1"></span>
                            <span className="block mt-0.5">Evening (25%)</span>
                          </div>
                          <div className="text-indigo-600 block">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block mr-1"></span>
                            <span className="block mt-0.5">Night (15%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TAB 2: REPORTS */}
          {activeTab === 'reports' && (
            <motion.div
              key="tab-reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="reports-viewport-card"
            >
              {/* Presets and customized ledger banner */}
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 p-6 rounded-2xl border border-sky-100/60 max-w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-sky-500" />
                      <span>Regulatory Report Configurator Suite</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-2xl">
                      Configure daily, weekly, or monthly presets, hide/show columns dynamically, and download custom formatted ledger summaries in PDF, Excel, Plain Text or CSV.
                    </p>
                  </div>
                  
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-3xs shrink-0 select-none">
                    {[
                      { id: 'daily', label: '📅 Daily Report' },
                      { id: 'weekly', label: '📊 Weekly Report' },
                      { id: 'monthly', label: '🗓️ Monthly Report' },
                      { id: 'custom', label: '⚙️ Custom Range' }
                    ].map(btn => {
                      const isActive = reportFrequency === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => handlePresetFrequencyClick(btn.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border-0 outline-none
                            ${isActive ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dynamic Columns Selector Board */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-2.5">
                  <span className="text-[11.5px] text-slate-700 font-extrabold uppercase tracking-wider block">
                    1. Choose Required Tabular Columns
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.id))}
                      className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      Select All Columns
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedColumns(['employeeName', 'date', 'status', 'duration'])}
                      className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      Reset to Simple
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {AVAILABLE_COLUMNS.map(col => {
                    const isChecked = selectedColumns.includes(col.id);
                    return (
                      <label 
                        key={col.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition-all
                          ${isChecked 
                            ? 'bg-sky-50/50 border-sky-300 ring-2 ring-sky-50 text-sky-800 font-bold' 
                            : 'bg-slate-50/30 border-slate-150 text-slate-500 font-medium hover:border-slate-300'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              // keep at least 1 column selected to prevent crashes
                              if (selectedColumns.length > 1) {
                                setSelectedColumns(selectedColumns.filter(c => c !== col.id));
                              }
                            } else {
                              setSelectedColumns([...selectedColumns, col.id]);
                            }
                          }}
                          className="rounded text-sky-500 border-slate-300 focus:ring-sky-400 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Filter controls ledger box */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-6 gap-4" id="custom-reports-filter-bar">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Filter Staff</label>
                  <select 
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none"
                    id="filter-staff-select"
                  >
                    <option value="all">All Personnel</option>
                    {users.filter(u => u.role === 'employee').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Filter Shift</label>
                  <select 
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none"
                    id="filter-shift-select"
                  >
                    <option value="all">All Shifts</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Filter Status</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none"
                    id="filter-status-select"
                  >
                    <option value="all">All States</option>
                    <option value="on-time">On-Time Only</option>
                    <option value="late">Late Arrivals</option>
                    <option value="half-day">Half-Day Only</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Start Date</label>
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setReportFrequency('custom'); // manual update resets preset
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none"
                    id="filter-start-date"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">End Date</label>
                  <input 
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setReportFrequency('custom'); // manual update resets preset
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none"
                    id="filter-end-date"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block select-none">Calendar Filtering</label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 p-2 px-2.5 rounded-xl text-xs font-semibold text-slate-700 h-[38px] select-none hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={filterWeekendOnly}
                      onChange={(e) => setFilterWeekendOnly(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <span>Weekends Only</span>
                  </label>
                </div>

              </div>

              {/* Download Bar holding all requested types (pdf, excel, plain text, csv) */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 p-4 rounded-xl border border-dotted border-slate-200 gap-4" id="custom-reports-exporter-banner">
                <span className="text-xs font-bold text-slate-500">
                  Matches found in ledger database: <span className="font-mono text-slate-800 font-extrabold bg-white px-2 py-1 rounded border border-slate-200">{filteredPunches.length} records</span>
                </span>
                
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={filteredPunches.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl disabled:opacity-40 select-none cursor-pointer border-0 shadow-sm transition-colors"
                    id="download-pdf-btn"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Download PDF File</span>
                  </button>
                  
                  <button 
                    onClick={handleDownloadExcel}
                    disabled={filteredPunches.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-40 select-none cursor-pointer border-0 shadow-sm transition-colors"
                    id="download-excel-btn"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span>Download Excel Sheet</span>
                  </button>

                  <button 
                    onClick={handleDownloadTXT}
                    disabled={filteredPunches.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white rounded-xl disabled:opacity-40 select-none cursor-pointer border-0 shadow-sm transition-colors"
                    id="download-txt-btn"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Download Text File</span>
                  </button>

                  <button 
                    onClick={handleDownloadCSV}
                    disabled={filteredPunches.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-40 select-none cursor-pointer border-0 shadow-sm transition-colors"
                    id="download-csv-btn"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span>Download CSV File</span>
                  </button>
                </div>
              </div>
                     {/* Optional Table Layout Selector Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Report Format Representation</span>
                <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setReportLayout('vertical')}
                    className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all border-0 outline-none ${reportLayout === 'vertical' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Vertical List View
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportLayout('horizontal')}
                    className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all border-0 outline-none ${reportLayout === 'horizontal' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Horizontal Monthly Matrix (Horizontal)
                  </button>
                </div>
              </div>

              {/* Roster database printable layout */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                {reportLayout === 'horizontal' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border-slate-100" id="reports-output-table-horizontal">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          <th className="p-4 pl-6 border-r border-slate-150 min-w-[180px] bg-slate-50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] text-slate-600">Employee Name</th>
                          <th className="p-4 border-r border-slate-150 text-center min-w-[90px] text-slate-600">Total Hours</th>
                          <th className="p-4 border-r border-slate-150 text-center min-w-[100px] text-slate-600">On-Time Rate</th>
                          {getDatesList().map(d => {
                            const dateObj = new Date(d);
                            const dayName = dateObj.toLocaleDateString([], { weekday: 'short' });
                            const dayDate = d.substring(5); // MM-DD
                            return (
                              <th key={d} className="p-3 text-center border-r border-slate-150 min-w-[100px]">
                                <div className="flex flex-col items-center">
                                  <span className="text-slate-700 bg-white px-1.5 py-0.5 rounded text-[10px] border border-slate-200 font-extrabold">{dayDate}</span>
                                  <span className="text-[9px] text-slate-400 mt-0.5 leading-none">{dayName}</span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                        {users.filter(u => u.role === 'employee').length === 0 ? (
                          <tr>
                            <td colSpan={getDatesList().length + 3} className="p-12 text-center text-slate-400 font-medium">
                              No employees found in user base.
                            </td>
                          </tr>
                        ) : (
                          users.filter(u => u.role === 'employee').map((emp, rowIdx) => {
                            const dates = getDatesList();
                            const empLogs = punchLogs.filter(log => log.userId === emp.id && dates.includes(log.date));
                            
                            // Calculate metrics
                            const totalMin = empLogs.reduce((acc, log) => {
                              if (log.punchInTime && log.punchOutTime) {
                                return acc + Math.round((new Date(log.punchOutTime).getTime() - new Date(log.punchInTime).getTime()) / 60000);
                              }
                              return acc;
                            }, 0);
                            const totalHours = (totalMin / 60).toFixed(1) + "h";
                            
                            const totalPunches = empLogs.length;
                            const latePunches = empLogs.filter(log => log.status === 'late').length;
                            const rate = totalPunches > 0 ? Math.round(((totalPunches - latePunches) / totalPunches) * 100) + "%" : "100%";
                            
                            return (
                              <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3.5 pl-6 border-r border-slate-150 bg-white font-bold text-slate-900 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                    <span>{emp.name}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 border-r border-slate-150 text-center font-mono font-bold text-slate-755 bg-slate-50/40">
                                  {totalHours}
                                </td>
                                <td className="p-3.5 border-r border-slate-150 text-center bg-slate-50/40">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${totalPunches > 0 && latePunches > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {rate}
                                  </span>
                                </td>
                                {dates.map(date => {
                                  const logOnDate = empLogs.find(l => l.date === date);
                                  
                                  if (logOnDate) {
                                    return (
                                      <td key={date} className="p-3 border-r border-slate-150 text-center bg-white">
                                        <div className="flex flex-col items-center gap-1">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide
                                            ${logOnDate.status === 'on-time' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                              logOnDate.status === 'late' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                              logOnDate.status === 'half-day' ? 'bg-sky-50 text-sky-600 border border-[#bae6fd]' :
                                              'bg-rose-50 text-rose-600 border border-rose-100'}`}
                                          >
                                            {logOnDate.status}
                                          </span>
                                          <span className="text-[9px] font-mono text-slate-500 font-bold leading-none">
                                            {logOnDate.punchOutTime 
                                              ? getWorkDurationStr(logOnDate.punchInTime, logOnDate.punchOutTime)
                                              : 'Active'
                                            }
                                          </span>
                                        </div>
                                      </td>
                                    );
                                  } else {
                                    const dayOfWeek = new Date(date).getDay();
                                    const userWeekends = emp.weekends !== undefined ? emp.weekends : (policy?.weekends || [0, 6]);
                                    const isWeekend = userWeekends.includes(dayOfWeek);
                                    
                                    return (
                                      <td key={date} className="p-3 border-r border-slate-150 text-center bg-slate-50/20">
                                        {isWeekend ? (
                                          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded italic">REST</span>
                                        ) : (
                                          <span className="text-[10px] text-rose-500 font-bold bg-rose-50/50 px-1.5 py-0.5 rounded">ABSENT</span>
                                        )}
                                      </td>
                                    );
                                  }
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse" id="reports-output-table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        {selectedColumns.includes('employeeName') && <th className="p-4 pl-6">Personnel Name</th>}
                        {selectedColumns.includes('employeeId') && <th className="p-4">Employee ID</th>}
                        {selectedColumns.includes('date') && <th className="p-4">Date</th>}
                        {selectedColumns.includes('punchIn') && <th className="p-4">Punch In Time</th>}
                        {selectedColumns.includes('punchOut') && <th className="p-4">Punch Out Time</th>}
                        {selectedColumns.includes('shift') && <th className="p-4">Assigned Shift</th>}
                        {selectedColumns.includes('geotag') && <th className="p-4">Geotag Coordinates</th>}
                        {selectedColumns.includes('status') && <th className="p-4">Status</th>}
                        {selectedColumns.includes('duration') && <th className="p-4">Duration Worked</th>}
                        {selectedColumns.includes('notes') && <th className="p-4 pr-6">Activity Note</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                      {filteredPunches.length === 0 ? (
                        <tr>
                          <td colSpan={selectedColumns.length} className="p-12 text-center text-slate-400 font-medium">
                            No matching localized logs found in active database. Customize search params above.
                          </td>
                        </tr>
                      ) : (
                        filteredPunches.map((punch) => {
                          const punchUserObj = users.find(user => user.id === punch.userId);
                          return (
                            <tr key={punch.id} className="hover:bg-slate-50/50 transition-colors">
                              {selectedColumns.includes('employeeName') && (
                                <td className="p-4 pl-6 flex items-center gap-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                                  <span className="text-slate-800 font-bold block">{punch.userName}</span>
                                </td>
                              )}
                              {selectedColumns.includes('employeeId') && (
                                <td className="p-4 font-mono text-slate-500 font-bold">
                                  {punchUserObj?.employeeId || 'N/A'}
                                </td>
                              )}
                              {selectedColumns.includes('date') && (
                                <td className="p-4 font-mono text-[11px] font-medium">{punch.date}</td>
                              )}
                              {selectedColumns.includes('punchIn') && (
                                <td className="p-4 font-mono text-[11px]">
                                  {new Date(punch.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </td>
                              )}
                              {selectedColumns.includes('punchOut') && (
                                <td className="p-4 font-mono text-[11px]">
                                  {punch.punchOutTime 
                                    ? new Date(punch.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                    : <span className="text-emerald-500 font-bold tracking-wide uppercase text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 block w-max">Active Live</span>
                                  }
                                </td>
                              )}
                              {selectedColumns.includes('shift') && (
                                <td className="p-4">
                                  <span className="text-[10px] font-sans font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                    {punch.shiftName}
                                  </span>
                                </td>
                              )}
                              {selectedColumns.includes('geotag') && (
                                <td className="p-4">
                                  <div className="flex flex-col gap-0.5 max-w-[150px]">
                                    <span className="text-slate-700 block text-[11px] truncate" title={punch.punchInLocation.name}>
                                      {punch.punchInLocation.name}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-mono">
                                      In radius: {punch.punchInLocation.accuracy < 500 ? 'Verified' : 'Invalid Distance'}
                                    </span>
                                  </div>
                                </td>
                              )}
                              {selectedColumns.includes('status') && (
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase block w-max
                                    ${punch.status === 'on-time' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                      punch.status === 'late' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                      punch.status === 'half-day' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                                      'bg-rose-50 text-rose-600 border border-rose-100'}`}
                                  >
                                    {punch.status}
                                  </span>
                                </td>
                              )}
                              {selectedColumns.includes('duration') && (
                                <td className="p-4 font-mono font-bold text-slate-700">
                                  {getWorkDurationStr(punch.punchInTime, punch.punchOutTime)}
                                </td>
                              )}
                              {selectedColumns.includes('notes') && (
                                <td className="p-4 pr-6">
                                  <span className="text-slate-400 font-light block max-w-[180px] break-words">
                                    {punch.notes || <span className="italic font-mono opacity-40">- no note -</span>}
                                  </span>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: STAFF MANAGER - CREATE USERS */}
          {activeTab === 'users' && (
            <motion.div
              key="tab-users"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              id="staff-viewport-card"
            >
              
              {/* Form panel: Register new Employee */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-max space-y-4 col-span-1" id="create-user-form">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3" id="onboard-method-header">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <UserPlus className="h-5 w-5 text-sky-500 shrink-0" />
                    <span>Onboard Service agency staff</span>
                  </div>
                </div>

                {/* Switchable Onboarding tabs */}
                <div className="flex bg-slate-200 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardMethod('single');
                      setCsvParsedUsers([]);
                      setCsvError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-0
                      ${onboardMethod === 'single'
                        ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
                  >
                    Single Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardMethod('csv')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-0
                      ${onboardMethod === 'csv'
                        ? 'bg-white text-slate-800 shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
                  >
                    Bulk CSV Import
                  </button>
                </div>
                
                {userSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-bold rounded-xl animate-fade-in flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{userSuccessMsg}</span>
                  </div>
                )}

                {onboardMethod === 'single' ? (
                  <form onSubmit={handleAddUserSubmit} className="space-y-4 font-semibold text-xs">
                    
                    {/* General / Core Contact Info Section */}
                    <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-3.5">
                      <span className="text-[10px] text-sky-600 font-extrabold uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                        1. Core Credentials
                      </span>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Full Name *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Rachel Green" 
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none focus:bg-white focus:border-sky-500 transition-colors"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          id="create-new-user-name"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Email Address *</label>
                        <input 
                          type="email" 
                          required
                          placeholder="e.g. rachel@ralphlauren.com" 
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none focus:bg-white focus:border-sky-500 transition-colors"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          id="create-new-user-email"
                        />
                      </div>
                    </div>

                    {/* Professional Allocation & Employment Information */}
                    <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-3.5">
                      <span className="text-[10px] text-sky-600 font-extrabold uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                        2. Employment Allocation
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Employee ID</label>
                          <input 
                            type="text" 
                            placeholder="e.g. EMP-2034" 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none"
                            value={newUserEmployeeId}
                            onChange={(e) => setNewUserEmployeeId(e.target.value)}
                            id="create-new-user-emp-id"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Security Role</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 cursor-pointer outline-none"
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as any)}
                            id="create-new-user-role"
                          >
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Department</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 cursor-pointer outline-none animate-fadeIn"
                            value={newUserDepartment}
                            onChange={(e) => setNewUserDepartment(e.target.value)}
                            id="create-new-user-dept"
                          >
                            <option value="">-- Select Department --</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                            ))}
                            <option value="Other">Other / Unassigned</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Designation</label>
                          <input 
                            type="text" 
                            placeholder="e.g. VP Merchandising" 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none"
                            value={newUserDesignation}
                            onChange={(e) => setNewUserDesignation(e.target.value)}
                            id="create-new-user-desig"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Assigned Branch</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 cursor-pointer outline-none animate-fadeIn"
                            value={newUserBranch}
                            onChange={(e) => setNewUserBranch(e.target.value)}
                            id="create-new-user-branch"
                          >
                            <option value="">-- Select Branch --</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.name}>{b.name} ({b.code})</option>
                            ))}
                            <option value="Other">Other / Unassigned</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Assigned Compliance Shift</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 cursor-pointer outline-none"
                            value={newUserShift}
                            onChange={(e) => setNewUserShift(e.target.value)}
                            id="create-new-user-shift"
                          >
                            {shifts.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Personal Contact Details metadata */}
                    <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-3.5">
                      <span className="text-[10px] text-sky-600 font-extrabold uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                        3. Personal Information
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Phone Code</label>
                          <input 
                            type="tel" 
                            placeholder="e.g. +1 555-0199" 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none"
                            value={newUserPhone}
                            onChange={(e) => setNewUserPhone(e.target.value)}
                            id="create-new-user-phone"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Date of Birth</label>
                          <input 
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none font-mono"
                            value={newUserDob}
                            onChange={(e) => setNewUserDob(e.target.value)}
                            id="create-new-user-dob"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Residential Address</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 45 Greenwich Ave, NYC" 
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none"
                          value={newUserAddress}
                          onChange={(e) => setNewUserAddress(e.target.value)}
                          id="create-new-user-address"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Emergency Contact (Name & Tel)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Monica Geller (+1 555-4491)" 
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none"
                          value={newUserEmergencyContact}
                          onChange={(e) => setNewUserEmergencyContact(e.target.value)}
                          id="create-new-user-emergency"
                        />
                      </div>
                    </div>

                    {/* Employee Custom Avatar / Photo Options */}
                    <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-3">
                      <span className="text-[10px] text-sky-600 font-extrabold uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                        4. Photo & Visual Identity
                      </span>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Visual Photo URL (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Paste image link, or use preset catalog down below..." 
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl p-2 font-medium text-slate-700 outline-none text-[11px]"
                          value={newUserAvatar}
                          onChange={(e) => setNewUserAvatar(e.target.value)}
                          id="create-new-user-avatar"
                        />
                      </div>

                      {/* Presets Grid */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block pb-0.5">Quick-Tap Profile Presets</span>
                        <div className="flex gap-2 items-center flex-wrap">
                          {[
                            { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', desc: '1' },
                            { url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face', desc: '2' },
                            { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', desc: '3' },
                            { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', desc: '4' },
                            { url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&crop=face', desc: '5' }
                          ].map((preset, pIdx) => {
                            const isSelected = newUserAvatar === preset.url;
                            return (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setNewUserAvatar(preset.url)}
                                className={`w-9 h-9 rounded-full overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 shrink-0 block p-0
                                  ${isSelected ? 'border-sky-500 ring-2 ring-sky-100 shadow-md' : 'border-slate-200 hover:border-slate-400'}`}
                              >
                                <img src={preset.url} alt={preset.desc} className="w-full h-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-sky-600 hover:shadow-sky-500/10 text-white font-bold tracking-wide shadow-md transition-all border-0 focus:outline-none cursor-pointer mt-5"
                      id="submit-new-user-btn"
                    >
                      Confirm & Onboard Personnel
                    </button>
                  </form>
                ) : (
                  // Bulk CSV Container
                  <div className="space-y-4 animate-fade-in text-xs font-semibold" id="bulk-csv-panel">
                    <div className="bg-white p-4.5 rounded-xl border border-slate-150 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10.5px] text-sky-600 font-extrabold uppercase tracking-wider">
                          CSV Onboarding Template
                        </span>
                        <button
                          type="button"
                          onClick={downloadCsvTemplate}
                          className="text-[10px] text-sky-600 hover:text-sky-750 flex items-center gap-1 cursor-pointer font-bold bg-transparent border-0 outline-none p-0"
                        >
                          <Download className="h-3.5 w-3.5 text-sky-500" />
                          Template.csv
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-450 leading-relaxed font-normal">
                        Import mass personnel at once. Download the template file, populate your roster spreadsheet, and upload or drop it below.
                      </p>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setCsvIsDragging(true); }}
                      onDragLeave={() => setCsvIsDragging(false)}
                      onDrop={handleCsvDrop}
                      className={`border-2 border-dashed rounded-[18px] p-6 text-center transition-all relative overflow-hidden flex flex-col items-center justify-center gap-2 min-h-[140px]
                        ${csvIsDragging 
                          ? 'border-sky-500 bg-sky-50/50' 
                          : csvParsedUsers.length > 0 
                          ? 'border-emerald-250 bg-emerald-50/10' 
                          : 'border-slate-300 hover:border-slate-400 bg-white'}`}
                      id="csv-drag-drop-zone"
                    >
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={handleCsvFileUpload}
                        className="hidden"
                        id="csv-file-input"
                      />
                      <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-2 w-full h-full select-none">
                        <Upload className={`h-8 w-8 transition-transform duration-300 ${csvParsedUsers.length > 0 ? 'text-emerald-500 scale-110' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold text-slate-700 leading-snug">
                          {csvParsedUsers.length > 0 ? "CSV File Loaded Successful!" : "Drag & Drop CSV file or click to browse"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold leading-none">Supports columns: name, email, employeeId, role, shiftId etc.</span>
                      </label>
                    </div>

                    {csvError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold rounded-xl flex items-center gap-2 animate-fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-550" />
                        <span>{csvError}</span>
                      </div>
                    )}

                    {/* Parsing success state & preview */}
                    {csvParsedUsers.length > 0 && (
                      <div className="space-y-3 animate-fade-in" id="csv-parsed-results">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-150">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">FILE STREAM STATUS</span>
                            <span className="text-emerald-700 font-extrabold text-[11.5px] flex items-center gap-1.5 mt-0.5">
                              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                              Parsed {csvParsedUsers.length} profile rows
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setCsvParsedUsers([]);
                              setCsvError(null);
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors border-0"
                            title="Clear parsed data"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Roster preview list */}
                        <div className="bg-white rounded-xl border border-slate-150 overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 shadow-3xs" id="csv-preview-list">
                          <div className="bg-slate-50 px-3 py-1.5 text-[9px] uppercase tracking-wider font-extrabold text-slate-550 flex justify-between">
                            <span>CSV Row Preview</span>
                            <span>Status</span>
                          </div>
                          {csvParsedUsers.map((p, idx) => (
                            <div key={idx} className="p-2.5 flex items-start gap-2.5 leading-tight">
                              <input 
                                type="checkbox"
                                disabled={!!p.error}
                                checked={p.selected}
                                onChange={(e) => {
                                  const updated = [...csvParsedUsers];
                                  updated[idx].selected = e.target.checked;
                                  setCsvParsedUsers(updated);
                                }}
                                className="mt-1 accent-sky-500 scale-95 shrink-0 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0 space-y-0.5 text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 truncate text-[11px]">{p.name || <span className="italic text-rose-500 font-bold">[Missing Name]</span>}</span>
                                  {p.role === 'admin' && (
                                    <span className="text-[8px] px-1 bg-sky-50 border border-sky-100 text-sky-600 rounded font-bold uppercase">Admin</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium truncate">
                                  {p.email || <span className="italic text-rose-500 font-bold">[Missing Email]</span>}
                                </div>
                                {p.employeeId && (
                                  <div className="text-[9px] text-slate-400 font-mono">
                                    ID: {p.employeeId} · Shift: {p.defaultShiftId}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 text-right">
                                {p.error ? (
                                  <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none" title={p.error}>
                                    <AlertCircle className="h-3 w-3 text-rose-500" />
                                    Error
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none">
                                    <UserCheck className="h-3 w-3 text-emerald-600" />
                                    Ready
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Submit Button */}
                        <button
                          type="button"
                          onClick={handleBulkImportSubmit}
                          disabled={csvParsedUsers.filter(u => u.selected && !u.error).length === 0}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-sky-600 hover:shadow-sky-500/10 text-white font-bold tracking-wide shadow-md transition-all border-0 focus:outline-none cursor-pointer mt-1 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-1.5"
                          id="submit-csv-bulk-btn"
                        >
                          <Plus className="h-4 w-4" />
                          Import {csvParsedUsers.filter(u => u.selected && !u.error).length} Profiles
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grid lists: Current personnel access roster */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs col-span-2">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-slate-800">Operational Onboarding & Directory</h4>
                    <span className="text-[10px] text-slate-400 block font-semibold">Tap any employee row to expand comprehensive file dossiers</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
                    {users.length} profiles registered
                  </span>
                </div>

                <div className="divide-y divide-slate-100" id="staff-directory-list">
                  {users.map(u => {
                    const isExpanded = expandedUserId === u.id;
                    const assignedShift = shifts.find(s => s.id === u.defaultShiftId);
                    
                    return (
                      <div key={u.id} className="transition-all hover:bg-slate-50/20" id={`staff-card-row-${u.id}`}>
                        
                        {/* Main Roster Entry Header Row */}
                        <div 
                          onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                          className="p-4.5 flex justify-between items-center cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={u.avatar} 
                              alt={u.name} 
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 block">{u.name}</span>
                                <span className="text-[8.5px] text-slate-400 font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded-md">
                                  {u.employeeId || 'No ID'}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded-xs text-[8px] font-extrabold uppercase tracking-widest
                                  ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-500'}`}
                                >
                                  {u.role}
                                </span>
                              </div>
                              
                              {/* Job meta lines */}
                              <div className="flex items-center gap-1.5 font-semibold text-[10.5px] text-slate-500 mt-1">
                                <span>{u.designation || 'Staff Member'}</span>
                                {u.department && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                    <span className="text-slate-400 font-bold">{u.department}</span>
                                  </>
                                )}
                                {u.branch && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                    <span className="text-indigo-500 font-bold flex items-center gap-0.5">
                                      <Globe className="w-3 h-3 text-indigo-400 inline" /> {u.branch}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 text-xs font-semibold shrink-0">
                            <div className="text-right hidden sm:block">
                              <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">Default Shift</span>
                              <span className="text-[11px] text-slate-700 block font-bold mt-0.5">
                                {assignedShift?.name || 'FlexibleDuty'}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">Availability</span>
                              <span className="text-[11px] block mt-0.5">
                                {u.status === 'inactive' ? (
                                  <span className="text-slate-400 font-bold">🚫 Inactive</span>
                                ) : u.dndSettings.dndModeActive ? (
                                  <span className="text-amber-500 font-bold flex items-center justify-end gap-0.5"><VolumeX className="h-3 w-3 shrink-0" /> Muted</span>
                                ) : (
                                  <span className="text-emerald-500 font-bold flex items-center justify-end gap-0.5">🔊 Active</span>
                                )}
                              </span>
                            </div>

                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-700 select-none cursor-pointer outline-none p-1 block border-0"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4.5 w-4.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Collapsible dossier tray with absolute profile metadata */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden bg-slate-50/50 border-t border-slate-100 font-medium text-xs text-slate-600 font-sans"
                            >
                              <div className="p-5.5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                
                              {editingUserId === u.id ? (
                                <div className="p-5.5 space-y-4 bg-slate-50/50">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Edit Column 1: Core credentials & Role Management */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-2xs space-y-3.5">
                                      <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                                        1. Core Security & Role Assignment
                                      </span>
                                      
                                      <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Full Name *</label>
                                        <input
                                          type="text"
                                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                          value={editUserForm?.name || ''}
                                          onChange={(e) => setEditUserForm(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Email Address *</label>
                                        <input
                                          type="email"
                                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                          value={editUserForm?.email || ''}
                                          onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Internal ID</label>
                                          <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                            value={editUserForm?.employeeId || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, employeeId: e.target.value }))}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Security Scope (Role)</label>
                                          <select
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-bold text-sky-600 text-xs cursor-pointer focus:bg-white"
                                            value={editUserForm?.role || 'employee'}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value as any }))}
                                          >
                                            <option value="employee">Employee Access</option>
                                            <option value="admin">Admin Access</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Account Status</label>
                                          <select
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-bold text-slate-700 text-xs cursor-pointer focus:bg-white"
                                            value={editUserForm?.status || 'active'}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, status: e.target.value as any }))}
                                          >
                                            <option value="active">🔊 Active</option>
                                            <option value="inactive">🚫 Inactive</option>
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Default Shift</label>
                                          <select
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-bold text-slate-700 text-xs cursor-pointer focus:bg-white"
                                            value={editUserForm?.defaultShiftId || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, defaultShiftId: e.target.value }))}
                                          >
                                            {shifts.map(s => (
                                              <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Edit Column 2: Department/Branch Assignment & Details */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-2xs space-y-3.5">
                                      <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                                        2. Operations & Departmental Allocation
                                      </span>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Department</label>
                                          <select
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs cursor-pointer focus:bg-white"
                                            value={editUserForm?.department || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, department: e.target.value }))}
                                          >
                                            <option value="">-- No Department --</option>
                                            {departments.map(d => (
                                              <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Designation</label>
                                          <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                            value={editUserForm?.designation || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, designation: e.target.value }))}
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Assigned Branch</label>
                                          <select
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs cursor-pointer focus:bg-white"
                                            value={editUserForm?.branch || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, branch: e.target.value }))}
                                          >
                                            <option value="">-- No Branch --</option>
                                            {branches.map(b => (
                                              <option key={b.id} value={b.name}>{b.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Contact Line</label>
                                          <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                            value={editUserForm?.phone || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, phone: e.target.value }))}
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Birth Date</label>
                                          <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                            value={editUserForm?.dob || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, dob: e.target.value }))}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Emergency Contact</label>
                                          <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                            value={editUserForm?.emergencyContact || ''}
                                            onChange={(e) => setEditUserForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block">Home Address</label>
                                        <input
                                          type="text"
                                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-semibold text-slate-700 text-xs focus:bg-white"
                                          value={editUserForm?.address || ''}
                                          onChange={(e) => setEditUserForm(prev => ({ ...prev, address: e.target.value }))}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2.5 justify-end p-5.5 pt-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onUpdateUser && editUserForm) {
                                          onUpdateUser(u.id, editUserForm);
                                        }
                                        setEditingUserId(null);
                                        setEditUserForm(null);
                                      }}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition-all"
                                    >
                                      Save Profile Guidelines
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUserId(null);
                                        setEditUserForm(null);
                                      }}
                                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="p-5.5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    
                                    {/* Onboarding File dossier */}
                                    <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-150 shadow-2xs">
                                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block border-b border-fold border-slate-100 pb-1.5">
                                        Administrative Record Card
                                      </span>
                                      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                        <div>
                                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Internal ID:</span>
                                          <span className="text-slate-700 font-mono font-bold text-[11px]">{u.employeeId || 'N/A'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Security Scope:</span>
                                          <span className="text-sky-600 font-bold text-[11px] capitalize">{u.role} Access</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Designation Group:</span>
                                          <span className="text-slate-700 font-bold pr-1 text-[11px]">{u.designation || 'Staff Member'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Division Unit:</span>
                                          <span className="text-slate-700 font-bold text-[11px]">{u.department || 'General Roster'}</span>
                                        </div>
                                        <div className="col-span-2 border-t border-slate-50 pt-1.5">
                                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Physical Branch:</span>
                                          <span className="text-indigo-600 font-bold text-[11px] flex items-center gap-1">
                                            <Globe className="w-3.5 h-3.5" /> {u.branch || 'Headquarters / Main'}
                                          </span>
                                        </div>
                                        <div className="col-span-2 pt-1 border-t border-slate-50">
                                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Compliance Schedule Policy:</span>
                                          <div className="flex gap-2 items-center mt-1">
                                            <div className="bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                              {assignedShift?.name} Shift ({assignedShift?.startTime} - {assignedShift?.endTime})
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                              (Buffer: {assignedShift?.gracePeriodMinutes}m grace)
                                            </span>
                                          </div>
                                        </div>
                                        <div className="col-span-2 pt-2 border-t border-slate-100">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Custom Weekend Days:</span>
                                            <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                                              {u.weekends === undefined ? 'Global Default' : `${u.weekends.length} Days`}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-7 gap-1 mt-1">
                                            {[
                                              { label: 'Su', val: 0, fullName: 'Sunday' },
                                              { label: 'Mo', val: 1, fullName: 'Monday' },
                                              { label: 'Tu', val: 2, fullName: 'Tuesday' },
                                              { label: 'We', val: 3, fullName: 'Wednesday' },
                                              { label: 'Th', val: 4, fullName: 'Thursday' },
                                              { label: 'Fr', val: 5, fullName: 'Friday' },
                                              { label: 'Sa', val: 6, fullName: 'Saturday' }
                                            ].map((dayObj) => {
                                              const currentWeekends = u.weekends !== undefined ? u.weekends : (policy?.weekends || [0, 6]);
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
                                                    onUpdateUserWeekends(u.id, newWeekends.sort());
                                                  }}
                                                  className={`py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                                                    isSelected
                                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                                  }`}
                                                >
                                                  {dayObj.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          {u.weekends !== undefined && (
                                            <button
                                              type="button"
                                              onClick={() => onUpdateUserWeekends(u.id, undefined as any)}
                                              className="text-[9.5px] text-rose-500 hover:text-rose-600 font-bold mt-1 bg-transparent border-0 p-0 cursor-pointer underline block"
                                            >
                                              Reset to Global Policy Defaults
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Private Personal details dossier */}
                                    <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-150 shadow-2xs">
                                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                                        Personal File & Dossier
                                      </span>
                                      <div className="space-y-2 text-[11px]">
                                        <div className="flex justify-between items-center py-0.5">
                                          <span className="text-slate-400 font-bold text-[10px] uppercase">Registered Email:</span>
                                          <span className="text-slate-700 font-mono font-semibold">{u.email}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                                          <span className="text-slate-400 font-bold text-[10px] uppercase">Contact Line:</span>
                                          <span className="text-slate-700 font-semibold">{u.phone || <em className="text-slate-300 font-light font-sans">No Phone</em>}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                                          <span className="text-slate-400 font-bold text-[10px] uppercase">Birth Date:</span>
                                          <span className="text-slate-700 font-mono font-semibold">
                                            {u.dob ? new Date(u.dob).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : <em className="text-slate-300 font-light font-sans">No Date</em>}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                                          <span className="text-slate-400 font-bold text-[10px] uppercase">Emergency Contact:</span>
                                          <span className="text-slate-700 font-semibold">{u.emergencyContact || <em className="text-slate-300 font-light font-sans">No emergency info</em>}</span>
                                        </div>
                                        <div className="flex justify-between items-start py-0.5 border-t border-slate-50">
                                          <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0 pt-0.5">Home Address:</span>
                                          <span className="text-slate-700 font-semibold text-right max-w-[180px] break-words">
                                            {u.address || <em className="text-slate-300 font-light font-sans">No address stored</em>}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                  </div>

                                  {/* Bottom Edit Action Bar */}
                                  <div className="px-5.5 pb-5.5 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUserId(u.id);
                                        setEditUserForm({ ...u });
                                      }}
                                      className="px-4 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                                    >
                                      ✏️ Edit Employee Profile & Role
                                    </button>
                                  </div>
                                </>
                              )}

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB: BRANCHES & DEPARTMENTS */}
          {activeTab === 'branches' && (
            <motion.div
              key="tab-branches"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
              id="branches-viewport-card"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* 1. BRANCHES OFFICE ZONE MANAGER */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-500" />
                        Physical Branches & Geofences
                      </h3>
                      <p className="text-[11px] text-slate-400 font-semibold">Manage locations, offices, and geofencing coordinates for clock-in verification</p>
                    </div>
                  </div>

                  {/* Branch Form */}
                  <form onSubmit={handleAddOrUpdateBranch} className="bg-slate-50/50 p-4.5 rounded-xl border border-slate-150/60 space-y-4">
                    <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">
                      {branchEditingId ? "⚡ Edit Branch Office details" : "➕ Onboard New Branch Location"}
                    </span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Branch Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. London Office"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-medium text-slate-700 text-xs outline-none"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Branch Code</label>
                        <input 
                          type="text" 
                          placeholder="e.g. BR-LDN"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-medium text-slate-700 text-xs outline-none"
                          value={newBranchCode}
                          onChange={(e) => setNewBranchCode(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-500">Street Address / General Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 10 Downing St, London, UK"
                        className="w-full bg-white border border-slate-150 rounded-xl p-2 font-medium text-slate-700 text-xs outline-none"
                        value={newBranchLocation}
                        onChange={(e) => setNewBranchLocation(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Latitude</label>
                        <input 
                          type="number" 
                          step="any"
                          placeholder="37.7749"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-mono text-slate-700 text-xs outline-none"
                          value={newBranchLat}
                          onChange={(e) => setNewBranchLat(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Longitude</label>
                        <input 
                          type="number" 
                          step="any"
                          placeholder="-122.4194"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-mono text-slate-700 text-xs outline-none"
                          value={newBranchLng}
                          onChange={(e) => setNewBranchLng(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Radius (m)</label>
                        <input 
                          type="number" 
                          placeholder="100"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-mono text-slate-700 text-xs outline-none"
                          value={newBranchRadius}
                          onChange={(e) => setNewBranchRadius(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-between pt-1">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setNewBranchLat("51.5074");
                            setNewBranchLng("-0.1278");
                            setNewBranchLocation("London, UK");
                          }}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-[9px] font-bold rounded text-slate-600 transition-colors cursor-pointer border-0"
                        >
                          London
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewBranchLat("37.7749");
                            setNewBranchLng("-122.4194");
                            setNewBranchLocation("San Francisco, CA");
                          }}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-[9px] font-bold rounded text-slate-600 transition-colors cursor-pointer border-0"
                        >
                          SFO
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewBranchLat("40.7128");
                            setNewBranchLng("-74.0060");
                            setNewBranchLocation("New York, NY");
                          }}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-[9px] font-bold rounded text-slate-600 transition-colors cursor-pointer border-0"
                        >
                          NYC
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {branchEditingId && (
                          <button
                            type="button"
                            onClick={() => {
                              setBranchEditingId(null);
                              setNewBranchName('');
                              setNewBranchCode('');
                              setNewBranchLocation('');
                              setNewBranchLat('37.7749');
                              setNewBranchLng('-122.4194');
                              setNewBranchRadius('100');
                            }}
                            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all border-0 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all border-0 cursor-pointer shadow-xs"
                        >
                          {branchEditingId ? "Update Branch" : "Add Branch"}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Branch List */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium border-collapse" id="branch-directory-table">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-extrabold bg-slate-50/50">
                          <th className="p-3">Branch / Code</th>
                          <th className="p-3">Geofencing parameters</th>
                          <th className="p-3 text-center">Assigned Employees</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {branches.map(branch => {
                          const assignedCount = users.filter(u => u.branch === branch.name).length;
                          return (
                            <tr key={branch.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="p-3">
                                <span className="font-bold text-slate-800 block text-[12px]">{branch.name}</span>
                                <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded mt-0.5 inline-block">{branch.code}</span>
                              </td>
                              <td className="p-3 text-[11px] text-slate-500">
                                <span className="block truncate max-w-[200px] font-semibold" title={branch.location}>{branch.location || "Coordinates Geofenced"}</span>
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                  {branch.latitude.toFixed(4)}°, {branch.longitude.toFixed(4)}° (r={branch.radiusMeters}m)
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${assignedCount > 0 ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-slate-100 text-slate-400'}`}>
                                  {assignedCount} employees
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleEditBranch(branch)}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border-0 cursor-pointer transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBranch(branch.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border-0 cursor-pointer transition-all"
                                    title="Delete Branch"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {branches.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 font-semibold">
                              <Globe className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                              No Branches configured. Add one above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. CORPORATE DEPARTMENTS MANAGER */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Server className="h-5 w-5 text-indigo-500" />
                        Departments & Divisions
                      </h3>
                      <p className="text-[11px] text-slate-400 font-semibold">Configure department divisions, leads, and operational cost centers</p>
                    </div>
                  </div>

                  {/* Dept Form */}
                  <form onSubmit={handleAddOrUpdateDept} className="bg-slate-50/50 p-4.5 rounded-xl border border-slate-150/60 space-y-4">
                    <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">
                      {deptEditingId ? "⚡ Edit Corporate Department Details" : "➕ Setup New Operations Department"}
                    </span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Department Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Quality Assurance"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-medium text-slate-700 text-xs outline-none"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Department Code</label>
                        <input 
                          type="text" 
                          placeholder="e.g. DEPT-QA"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-medium text-slate-700 text-xs outline-none"
                          value={newDeptCode}
                          onChange={(e) => setNewDeptCode(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Cost Center</label>
                        <input 
                          type="text" 
                          placeholder="e.g. CC-QA-902"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-medium text-slate-700 text-xs outline-none"
                          value={newDeptCostCenter}
                          onChange={(e) => setNewDeptCostCenter(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Manager / Lead Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Sarah Connor"
                          className="w-full bg-white border border-slate-150 rounded-xl p-2 font-medium text-slate-700 text-xs outline-none"
                          value={newDeptManager}
                          onChange={(e) => setNewDeptManager(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      {deptEditingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeptEditingId(null);
                            setNewDeptName('');
                            setNewDeptCode('');
                            setNewDeptCostCenter('');
                            setNewDeptManager('');
                          }}
                          className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all border-0 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all border-0 cursor-pointer shadow-xs"
                      >
                        {deptEditingId ? "Update Department" : "Create Department"}
                      </button>
                    </div>
                  </form>

                  {/* Dept List */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium border-collapse" id="department-directory-table">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-extrabold bg-slate-50/50">
                          <th className="p-3">Department / Code</th>
                          <th className="p-3">Manager & Cost Center</th>
                          <th className="p-3 text-center">Division Size</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {departments.map(dept => {
                          const assignedCount = users.filter(u => u.department === dept.name).length;
                          return (
                            <tr key={dept.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="p-3">
                                <span className="font-bold text-slate-800 block text-[12px]">{dept.name}</span>
                                <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded mt-0.5 inline-block">{dept.code}</span>
                              </td>
                              <td className="p-3 text-[11px] text-slate-500">
                                <span className="block truncate max-w-[180px] font-bold text-slate-750">{dept.manager || "Unspecified Head"}</span>
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                  {dept.costCenter || "No Cost Center Assigned"}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${assignedCount > 0 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                  {assignedCount} employees
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleEditDept(dept)}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border-0 cursor-pointer transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDept(dept.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border-0 cursor-pointer transition-all"
                                    title="Delete Department"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {departments.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 font-semibold">
                              <Server className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                              No Departments configured. Create one above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 4: SHIFT CONFIGURATIONS */}
          {activeTab === 'shifts' && (
            <motion.div
              key="tab-shifts"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="shifts-viewport-card"
            >
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-sky-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Dynamic Shift Matching Rules</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    The mobile app identifies and maps active logins to these custom hours based on actual punch-in timestamps. Modifying thresholds will instantly alter late-arrival parameters on subsequent punches!
                  </p>
                </div>
              </div>

              {/* Policy Settings Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="policy-configurators-block">
                
                {/* 1. Multiple Weekends Config */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-sky-600">
                    <Calendar className="h-5 w-5" />
                    <h4 className="text-sm font-bold text-slate-800">Multiple Weekend Day Configurator</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Select which days represent the weekend. Attendance punched on these days will trigger special compliance banners on mobile and heatmaps as weekend presence!
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2 pt-1.5">
                    {[
                      { val: 0, label: "Sunday" },
                      { val: 1, label: "Monday" },
                      { val: 2, label: "Tuesday" },
                      { val: 3, label: "Wednesday" },
                      { val: 4, label: "Thursday" },
                      { val: 5, label: "Friday" },
                      { val: 6, label: "Saturday" }
                    ].map((dayObj) => {
                      const isChecked = (policy?.weekends || [0, 6]).includes(dayObj.val);
                      return (
                        <button
                          key={dayObj.val}
                          type="button"
                          onClick={() => {
                            let newWeekends = [...(policy?.weekends || [0, 6])];
                            if (newWeekends.includes(dayObj.val)) {
                              newWeekends = newWeekends.filter(v => v !== dayObj.val);
                            } else {
                              newWeekends.push(dayObj.val);
                            }
                            onUpdatePolicy({
                              ...policy,
                              weekends: newWeekends.sort()
                            });
                          }}
                          className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all text-center select-none cursor-pointer border-0
                            ${isChecked 
                              ? 'bg-sky-500 text-white shadow-xs' 
                              : 'bg-slate-50 text-slate-600 border-slate-150 hover:bg-slate-100'}`}
                        >
                          {dayObj.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Half Day Policy */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-sky-600">
                    <Clock className="h-5 w-5" />
                    <h4 className="text-sm font-bold text-slate-800">Half-Day Shift Policy Settings</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Configure work duration limits. Personnel checking out early will be auto-flagged as Half-Day. Employees can also select this manually.
                  </p>

                  <div className="space-y-4 pt-1 font-semibold text-xs text-slate-700">
                    {/* Toggle auto duration */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-700 block">Auto-Mark by Duration Worked</span>
                        <span className="text-[9.5px] text-slate-400 font-medium block">If checked out prior to threshold hours limit</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdatePolicy({
                          ...policy,
                          halfDayAutoMark: !policy.halfDayAutoMark
                        })}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none relative outline-none border-0 cursor-pointer
                          ${policy?.halfDayAutoMark ? 'bg-sky-500' : 'bg-slate-300'}`}
                      >
                        <motion.div 
                          layout
                          className="w-4 h-4 bg-white rounded-full shadow-md"
                          animate={{ x: policy?.halfDayAutoMark ? 16 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Hours Threshold Slider or number input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Minimum Shift Hours Threshold:</span>
                        <span className="text-sky-600 font-mono">{(policy?.halfDayThresholdHours || 4)} hrs</span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <input
                          type="range"
                          min="1"
                          max="8"
                          className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-100 rounded-lg appearance-none"
                          value={policy?.halfDayThresholdHours || 4}
                          disabled={!policy?.halfDayAutoMark}
                          onChange={(e) => onUpdatePolicy({
                            ...policy,
                            halfDayThresholdHours: parseInt(e.target.value, 10)
                          })}
                        />
                        <input
                          type="number"
                          min="1"
                          max="12"
                          disabled={!policy?.halfDayAutoMark}
                          className="w-16 bg-slate-50 border border-slate-200 py-1 px-2 rounded-lg text-center font-mono font-bold text-slate-800 focus:outline-none"
                          value={policy?.halfDayThresholdHours || 4}
                          onChange={(e) => onUpdatePolicy({
                            ...policy,
                            halfDayThresholdHours: Math.max(1, parseInt(e.target.value, 10) || 1)
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Development Mode & Security Gate */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Key className="h-5 w-5" />
                    <h4 className="text-sm font-bold text-slate-800">Development Security Gate</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Protect the application workspace. When active, all standard employee logins are disabled/locked, and the admin account requires a secure passcode.
                  </p>

                  <div className="space-y-4 pt-1 font-semibold text-xs text-slate-700">
                    {/* Toggle Restriction */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-700 block">Restrict Access (Admin Only)</span>
                        <span className="text-[9.5px] text-slate-400 font-medium block">Blocks all non-administrator user logins</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdatePolicy({
                          ...policy,
                          devLoginRestricted: !policy.devLoginRestricted
                        })}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none relative outline-none border-0 cursor-pointer
                          ${policy?.devLoginRestricted ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        id="dev-restrict-toggle"
                      >
                        <motion.div 
                          layout
                          className="w-4 h-4 bg-white rounded-full shadow-md"
                          animate={{ x: policy?.devLoginRestricted ? 16 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Admin Passcode Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Admin Access Passcode</label>
                      <input 
                        type="text" 
                        placeholder="e.g. admin123" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500/50"
                        value={policy?.adminPasscode || ''}
                        onChange={(e) => onUpdatePolicy({
                          ...policy,
                          adminPasscode: e.target.value
                        })}
                        id="admin-passcode-field"
                      />
                      <span className="text-[9.5px] text-slate-400 font-medium block">
                        Leave blank to bypass password, or enter a code (e.g. <code className="bg-slate-100 px-1 rounded font-bold">admin123</code>) to enforce credentials.
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Backup & Restore System Ledger Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6 animate-fadeIn" id="backup-restore-management-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Server className="h-5 w-5" />
                      <h4 className="text-base font-extrabold text-slate-800">System Backup & Restore Maintenance Suite</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                      Preserve and recover the entire workspace, employee rosters, geofencing parameters, and active attendance transaction ledgers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSystemBackup}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs tracking-wider uppercase shadow-xs transition-all cursor-pointer border-0"
                      id="shifts-download-backup-btn"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Backup File
                    </button>
                  </div>
                </div>

                {/* Dropzone Container for restoring files */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Import Backup Ledger (.json)</label>
                    
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingBackup(true);
                      }}
                      onDragLeave={() => setIsDraggingBackup(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingBackup(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processBackupFile(file);
                      }}
                      onClick={() => {
                        document.getElementById('backup-file-input')?.click();
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-2
                        ${isDraggingBackup 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-md' 
                          : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-400'}`}
                      id="backup-drag-dropzone"
                    >
                      <input
                        type="file"
                        id="backup-file-input"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processBackupFile(file);
                        }}
                      />
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-2xs">
                        <Upload className="h-6 w-6 text-slate-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-700">Drag & drop your backup file here, or click to browse</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Supports only standard Smart Attendance Suite decrypted JSON exports</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Restore Validation Monitor</span>
                      
                      {restoreSuccessMsg && (
                        <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs font-semibold">
                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                          <p>{restoreSuccessMsg}</p>
                        </div>
                      )}

                      {!restorePreview && !restoreSuccessMsg && (
                        <div className="text-slate-400 flex flex-col items-center justify-center py-6 text-center space-y-1">
                          <AlertCircle className="h-5 w-5 text-slate-400" />
                          <p className="text-[11px] font-semibold">No backup file loaded yet</p>
                        </div>
                      )}

                      {restorePreview && !restorePreview.isValid && (
                        <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-extrabold uppercase text-[10px]">Import Failed</span>
                            <p>{restorePreview.error}</p>
                          </div>
                        </div>
                      )}

                      {restorePreview && restorePreview.isValid && (
                        <div className="space-y-3">
                          <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-indigo-800 text-xs font-bold">
                              <CheckCircle className="h-4 w-4 text-indigo-600" />
                              <span>Valid Backup Signature Found</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-semibold pt-1">
                              <div>Exported: <span className="font-mono font-bold text-slate-850">{new Date(restorePreview.date).toLocaleString()}</span></div>
                              <div>Users/Staff: <span className="font-mono font-bold text-slate-850">{restorePreview.usersCount} records</span></div>
                              <div>Punch logs: <span className="font-mono font-bold text-slate-850">{restorePreview.punchesCount} logs</span></div>
                              <div>Rules: <span className="font-mono font-bold text-slate-850">{restorePreview.shiftsCount} shifts</span></div>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[10.5px] text-amber-800 leading-relaxed font-semibold">
                            ⚠️ <strong>Warning:</strong> Restoring this backup will overwrite all active attendance databases, employee records, and shifts configurations on this device.
                          </div>
                        </div>
                      )}
                    </div>

                    {restorePreview && restorePreview.isValid && (
                      <button
                        type="button"
                        onClick={handleCommitRestore}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase cursor-pointer border-0 shadow-xs transition-all"
                        id="commit-restore-db-btn"
                      >
                        Confirm and Commit Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="shifts-parameters-grid">
                {shifts.map((shift) => {
                  const isEditing = editingShiftId === shift.id;
                  return (
                    <div key={shift.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 block">{shift.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide bg-${shift.color}-50 text-${shift.color}-600`}>
                          Active rule
                        </span>
                      </div>

                      {/* Editing states inputs */}
                      {isEditing ? (
                        <div className="space-y-3 pt-2 font-semibold text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Start Hour</label>
                              <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                                value={editStartTime}
                                onChange={(e) => setEditStartTime(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">End Hour</label>
                              <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                                value={editEndTime}
                                onChange={(e) => setEditEndTime(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Grace Period (Minutes)</label>
                            <input 
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none"
                              value={editGracePeriod}
                              onChange={(e) => setEditGracePeriod(parseInt(e.target.value, 10))}
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button 
                              onClick={() => handleShiftEditSave(shift.id)}
                              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all hover:bg-emerald-600 cursor-pointer border-0"
                            >
                              Save Guidelines
                            </button>
                            <button 
                              onClick={() => setEditingShiftId(null)}
                              className="w-full py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition-all hover:bg-slate-200 cursor-pointer border-0"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-center font-medium">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase block font-semibold">Checks-in After</span>
                              <span className="font-mono font-bold text-slate-800 block text-sm mt-0.5">{shift.startTime}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase block font-semibold">Duty Ends</span>
                              <span className="font-mono font-bold text-slate-800 block text-sm mt-0.5">{shift.endTime}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs font-semibold px-1 text-slate-500">
                            <span>Lateness Grace Buffer:</span>
                            <span className="font-mono text-slate-800">{shift.gracePeriodMinutes} mins</span>
                          </div>

                          <button 
                            onClick={() => handleShiftEditStart(shift)}
                            className="w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 cursor-pointer border-0"
                            id={`edit-shift-btn-${shift.id}`}
                          >
                            Modify Thresholds
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </motion.div>
          )}

          {/* TAB 5: DND NOTIFICATION TRANSACTION LEDGERS */}
          {activeTab === 'notifications' && (
            <motion.div
              key="tab-notifications"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="notifications-viewport-card"
            >
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
                <VolumeX className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Dynamic Notification Muter (DND) Tracking</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    This module audits communication delivery channels. When personnel activate local "Do Not Disturb" on their screen, automated alert payloads are kept on-file but marked as <b className="text-amber-500">suppressed</b> to secure employee peace of mind.
                  </p>
                </div>
              </div>

              {/* Notification audit pipeline */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="text-sm font-bold text-slate-800">Transaction Logs</h4>
                  <div className="flex gap-4 text-xs font-semibold">
                    <span>Delivered Ratio: <b className="text-emerald-600">{deliverySuccessRatio}%</b></span>
                    <span>Suppressed Logs: <b className="text-amber-500">{suppressedCount}</b></span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100" id="notification-audit-list">
                  {notificationsLog.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-medium text-xs">No visual notifications triggered during this session.</div>
                  ) : (
                    notificationsLog.map((item) => (
                      <div key={item.id} className="p-4.5 flex justify-between items-start hover:bg-slate-50/20 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700 block">{item.title}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] text-slate-400 block font-semibold">{item.userName}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-500 max-w-xl">{item.message}</p>
                          <span className="text-[9px] font-mono text-slate-400 block pt-0.5">
                            Timestamp: {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[9px] font-extrabold uppercase tracking-wide">
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {item.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded
                            ${item.status === 'sent' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 6: GEMINI AI HR ADVISORY */}
          {activeTab === 'ai' && (
            <motion.div
              key="tab-ai"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="ai-viewport-card"
            >
              {/* Inner Sub-Tab Selector to flip between AI Dashboard and AI Chat */}
              <div className="flex gap-2 border-b border-slate-100 pb-3" id="ai-sub-tabs">
                <button
                  type="button"
                  onClick={() => setAiSubTab('dashboard')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all border-0 outline-none
                    ${aiSubTab === 'dashboard' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'}`}
                >
                  🔮 Predictive Roster & Scheduler Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setAiSubTab('conversational')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all border-0 outline-none
                    ${aiSubTab === 'conversational' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'}`}
                >
                  💬 Conversational AI HR Advisory Chat
                </button>
              </div>

              {aiSubTab === 'dashboard' ? (
                <AIPredictiveRoster 
                  users={users} 
                  shifts={shifts} 
                  punchLogs={punchLogs} 
                />
              ) : (
                <div className="space-y-6">
                  {/* Promo box */}
                  <div className="bg-gradient-to-r from-slate-900 to-sky-950 p-6 rounded-2xl text-white flex items-center justify-between shadow-md relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-sky-500/10 rounded-full blur-2xl"></div>
                    <div className="space-y-1.5 relative z-10">
                      <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs tracking-widest uppercase">
                        <Sparkles className="h-4 w-4" />
                        <span>Gemini AI Cognitive Desk</span>
                      </div>
                      <h3 className="text-lg font-bold">Roster Optimizer & Analytics Advisor</h3>
                      <p className="text-xs font-semibold text-slate-300 leading-relaxed max-w-2xl">
                        Query Gemini using deep historical data. Identify personnel late patterns, audit coordinate geofencing errors, get suggestions on Grace Periods and shift distributions.
                      </p>
                    </div>
                    <Sparkles className="h-10 w-10 text-sky-400/40 opacity-70 hidden md:block shrink-0" />
                  </div>

                  {/* Action buttons templates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ai-template-shortcuts">
                    {AI_TEMPLATES.map((tpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQueryAI(tpl.prompt)}
                        disabled={aiLoading}
                        className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-left select-none outline-none hover:border-sky-300 transition-all cursor-pointer group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 group-hover:text-sky-600 transition-colors">
                          <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                          <span>{tpl.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold line-clamp-2 mt-1 leading-normal">
                          "{tpl.prompt}"
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Free-form box */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Ask Gemini anything (e.g. Find if David Miller has any geofencing boundary violations or write shift optimization schedule...)"
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-3.5 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-sky-500/50"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQueryAI()}
                        id="ai-prompt-textbox"
                        disabled={aiLoading}
                      />
                      <button
                        onClick={() => handleQueryAI()}
                        disabled={aiLoading || !aiPrompt.trim()}
                        className="px-6 py-3.5 bg-slate-900 border-0 outline-none text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-sky-600 transition-all select-none shadow-md disabled:opacity-40 cursor-pointer shrink-0"
                        id="send-ai-query-btn"
                      >
                        {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span>Query AI</span>
                      </button>
                    </div>
                  </div>

                  {/* Output Result panel */}
                  <AnimatePresence mode="wait">
                    {(aiLoading || aiResponse || aiError) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="p-6 rounded-2xl border border-slate-100 bg-slate-50 shadow-xs space-y-4"
                        id="ai-response-container"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <Sparkles className="h-4 w-4 text-sky-500 animate-pulse" />
                            <span>Dynamic AI Insights Output</span>
                          </div>
                          {aiLoading && (
                            <span className="text-[10px] text-sky-500 font-semibold uppercase animate-pulse flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin shrink-0" /> Generative Analysis Running...
                            </span>
                          )}
                        </div>

                        {/* Rendering text with proper styling */}
                        <div className="text-slate-700 space-y-2 text-xs font-medium leading-relaxed max-w-4xl" id="ai-response-text">
                          {aiLoading && (
                            <div className="space-y-2 py-4">
                              <div className="h-3.5 bg-slate-200 rounded animate-pulse w-3/4"></div>
                              <div className="h-3.5 bg-slate-200 rounded animate-pulse w-5/6"></div>
                              <div className="h-3.5 bg-slate-200 rounded animate-pulse w-2/3"></div>
                            </div>
                          )}
                          
                          {aiError && (
                            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 shrink-0" />
                              <span>Gemini API Node: {aiError} (Check Settings & Secrets in Panel)</span>
                            </div>
                          )}

                          {aiResponse && (
                            <div className="prose prose-xs text-slate-800 whitespace-pre-wrap font-sans font-medium">
                              {aiResponse}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 7: WORKSPACE QR STATION */}
          {activeTab === 'qrcodes' && (
            <motion.div
              key="tab-qrcodes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="qrcodes-viewport-card"
            >
              <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-6 items-center">
                <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-sky-500/10 rounded-full blur-2xl"></div>
                <div className="p-4 bg-sky-500/10 text-sky-400 rounded-2.5xl shrink-0">
                  <QrCode className="h-10 w-10 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400">Security Gate Management</span>
                  <h3 className="text-xl font-bold font-sans">Automated Proximity QR Gate Station</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal max-w-2xl">
                    Deploy physically printed gateway posters at office entrances. When field workers scan these codes via their Employee Portal, the system cross-references their mobile device's mock GPS coordinates against the gateway's authorized coordinates to confirm their spatial presence.
                  </p>
                </div>
              </div>

              {/* Instructions Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="qr-instructions">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 font-extrabold text-xs flex items-center justify-center">1</div>
                  <h4 className="text-xs font-bold text-slate-800">Generate Gateway Payload</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Each geofence is coupled with an encrypted coordinate package containing the site's latitude, longitude, and accuracy boundaries.</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 font-extrabold text-xs flex items-center justify-center">2</div>
                  <h4 className="text-xs font-bold text-slate-800">Deploy QR Clearance Codes</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Print and post the generated QR cards at physical access doors. Scanning them provides instant proof of physical site arrival.</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 font-extrabold text-xs flex items-center justify-center">3</div>
                  <h4 className="text-xs font-bold text-slate-800">Automate Proximity Punch</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">No manual check-in needed! Distance calculation automatically resolves whether to log user arrival (In) or departure (Out).</p>
                </div>
              </div>

              {/* QR List and Live Poster Display */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Workspaces List (Col 1-2) */}
                <div className="xl:col-span-2 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Active Workspaces & Security QR Configurations</h4>
                    
                    <div className="divide-y divide-slate-100">
                      {DEFAULT_GEOFENCES.map((geo) => {
                        const isAnywhere = geo.radiusMeters > 5000;
                        const qrPayload = JSON.stringify({
                          v: "workspace-auth-v1",
                          name: geo.name,
                          lat: geo.latitude,
                          lng: geo.longitude,
                          r: geo.radiusMeters
                        });
                        return (
                          <div key={geo.name} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></span>
                                <h5 className="text-xs font-bold text-slate-800">{geo.name}</h5>
                                {isAnywhere && (
                                  <span className="text-[8px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded uppercase font-bold text-slate-500 animate-pulse">Virtual Zone</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
                                <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3 shrink-0 text-slate-400" /> Lat: {geo.latitude.toFixed(5)} / Lng: {geo.longitude.toFixed(5)}</span>
                                <span className="text-slate-200">|</span>
                                <span>Verifiable Radius: {isAnywhere ? 'Global' : `${geo.radiusMeters} meters`}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPosterGeo(geo);
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer shrink-0 transition-all
                                  ${selectedPosterGeo.name === geo.name 
                                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                              >
                                Select Poster
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(qrPayload);
                                  alert(`Workspace QR Payload copied to clipboard:\n\n${qrPayload}`);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] text-slate-600 font-bold cursor-pointer shrink-0"
                              >
                                Copy Payload
                              </button>
                              <AdminQRCanvas geo={geo} qrPayload={qrPayload} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Printable Access Poster Preview Card (Col 3) */}
                <div className="xl:col-span-1">
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col h-full justify-between space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">Poster Preview</h4>
                      <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                        Laminated gateway poster layout for <span className="font-bold text-slate-700">{selectedPosterGeo.name}</span>.
                      </p>
                    </div>

                    <div className="border-4 border-dashed border-slate-200 rounded-2xl p-5 bg-slate-50/50 text-center relative overflow-hidden space-y-3 shadow-3xs" id="printable-area-poster">
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 leading-none">ACTIVE CORPORATE GEOLOCK GATE</div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-850 uppercase tracking-tight font-sans">WORKSPACE CHECK-IN</h3>
                        <p className="text-[9px] text-slate-450 leading-relaxed font-semibold">Authorized biometric proximity scanner. Point reader at key QR code to clock state.</p>
                      </div>

                      <div className="relative mx-auto w-36 h-36 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2.5">
                        <canvas ref={posterCanvasRef} className="w-full h-full"></canvas>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-extrabold text-sky-600 tracking-wider">RANGE VERIFIED GATEWAY</div>
                        <p className="text-[8px] text-slate-400 px-3 font-bold leading-relaxed italic">
                          Target Location: {selectedPosterGeo.name}
                        </p>
                        <p className="text-[8px] text-slate-400 px-3 font-semibold leading-relaxed">
                          Secure geofence authorization active. Distance check verifies device presence on scan.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="w-full py-2 bg-slate-900 border-0 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer text-center"
                    >
                      Print Selected Poster
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 8: HARDWARE BIOMETRICS HUB */}
          {activeTab === 'biometrics' && (
            <motion.div
              key="tab-biometrics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="biometrics-viewport"
            >
              {/* Header card */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Fingerprint className="h-5 w-5 animate-bounce" />
                    <span className="text-xs font-bold uppercase tracking-widest">Active Hardware Integration Suite</span>
                  </div>
                  <h3 className="text-xl font-bold font-sans">Corporate Hardware Biometrics Hub</h3>
                  <p className="text-xs text-slate-350 max-w-xl">
                    Register, simulate, and configure physical biometric terminals (Face Recognition, Fingerprint Scanners, RFID Cards, and Keypad PIN codes) and compute logs against corporate policies.
                  </p>
                </div>
                <div className="flex gap-2.5 z-10 shrink-0">
                  {biometricsSubTab === 'terminals' ? (
                    <button
                      onClick={() => setShowAddDeviceModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all rounded-xl cursor-pointer border-0 shadow-sm"
                      id="add-biometric-device-btn"
                    >
                      <Plus className="h-4 w-4" />
                      Add Biometric Device
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingServiceId(null);
                        setNewBrandName('ZKTeco');
                        setNewBrandCustomName('');
                        setNewBrandApiUrl('');
                        setNewBrandApiKey('');
                        setNewBrandProtocol('HTTP POST Push');
                        setNewBrandPolling('Real-time Webhook');
                        setNewBrandStatus('active');
                        setShowAddServiceModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all rounded-xl cursor-pointer border-0 shadow-sm"
                      id="add-brand-service-btn"
                    >
                      <Plus className="h-4 w-4" />
                      Add Brand Service API
                    </button>
                  )}
                </div>
              </div>

              {/* Inner Sub-Tab Selector to flip between Terminals and Brand Services */}
              <div className="flex border-b border-slate-200/85 bg-slate-50 p-1.5 rounded-2xl gap-1.5 shadow-3xs" id="biometrics-subtabs">
                <button
                  type="button"
                  onClick={() => setBiometricsSubTab('terminals')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer border-0
                    ${biometricsSubTab === 'terminals' 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  id="subtab-btn-terminals"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Terminals & User Credentials
                </button>
                <button
                  type="button"
                  onClick={() => setBiometricsSubTab('services')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer border-0
                    ${biometricsSubTab === 'services' 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  id="subtab-btn-services"
                >
                  <Server className="h-3.5 w-3.5" />
                  Biometric Brand Services API ({biometricServices.length})
                </button>
              </div>

              {biometricsSubTab === 'terminals' ? (
                <>
                  {/* Grid sections for terminal control & sync */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 1. Terminal Register & Sync */}
                <div className="xl:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Biometric Terminal Register</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Select and operate active network readers</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Active Hardware Terminal</label>
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => {
                            setSelectedDeviceId(e.target.value);
                            setSyncSuccessMsg('');
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                        >
                          {devices.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.ip}:{d.port}) - {d.status.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Display active device details */}
                      {(() => {
                        const activeDev = devices.find(d => d.id === selectedDeviceId);
                        if (!activeDev) return null;
                        return (
                          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-semibold">Sensor Capabilities:</span>
                              <span className="font-bold text-slate-700">{activeDev.type}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-semibold">IP Address Info:</span>
                              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{activeDev.ip}:{activeDev.port}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-semibold">System Webhook:</span>
                              <span className="text-sky-600 font-mono text-[9px] max-w-[150px] truncate block" title={activeDev.webhookUrl}>{activeDev.webhookUrl}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-semibold">Network Connection:</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${activeDev.status === 'online' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${activeDev.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                {activeDev.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-semibold">Last Synced Date:</span>
                              <span className="font-medium text-slate-500 font-mono text-[10px]">{activeDev.lastSync}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Sync actions */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terminal Data Exchange</div>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => simulateSyncBiometrics('upload')}
                        disabled={isSyncing || devices.find(d => d.id === selectedDeviceId)?.status === 'offline'}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-150 disabled:text-slate-400 text-white text-xs font-bold transition-all rounded-xl cursor-pointer border-0 shadow-xs"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload (SW ➜ HW)
                      </button>
                      <button
                        onClick={() => simulateSyncBiometrics('download')}
                        disabled={isSyncing || devices.find(d => d.id === selectedDeviceId)?.status === 'offline'}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:bg-slate-150 disabled:text-slate-400 text-xs font-bold transition-all rounded-xl cursor-pointer border-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download (HW ➜ SW)
                      </button>
                    </div>

                    {/* Sync progress bar */}
                    {isSyncing && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-semibold animate-pulse">{syncMessage}</span>
                          <span className="font-mono font-bold text-indigo-600">{syncProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-indigo-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${syncProgress}%` }}
                            transition={{ duration: 0.15 }}
                          />
                        </div>
                      </div>
                    )}

                    {syncSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-[10px] text-emerald-800 font-medium flex items-start gap-1.5 animate-fadeIn">
                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>{syncSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Raw Machine Logs & Policy Evaluator */}
                <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Raw Terminal Access Log Ledger</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Evaluate machine check-ins against corporate shift & day policies</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCalculateBiometricPolicyData}
                        disabled={isCalculating}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all rounded-xl cursor-pointer border-0 shadow-xs animate-none"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
                        Calculate Policy Data
                      </button>
                    </div>
                  </div>

                  {calculationSuccessMsg && (
                    <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-2xl text-xs text-sky-800 font-semibold flex items-center justify-between animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-sky-600" />
                        <span>{calculationSuccessMsg}</span>
                      </div>
                      {calculatedLogs.length > 0 && (
                        <button
                          onClick={handleImportCalculatedLogsToMaster}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white border-0 rounded-lg text-[10px] font-extrabold cursor-pointer shadow-xs uppercase tracking-wide"
                        >
                          Commit to Ledger
                        </button>
                      )}
                    </div>
                  )}

                  {calculatedLogs.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Calculated Policy Results:</div>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="p-2.5 pl-4">Staff Name</th>
                              <th className="p-2.5">Duty Date</th>
                              <th className="p-2.5">Time Logged</th>
                              <th className="p-2.5">Calculated Status</th>
                              <th className="p-2.5 pr-4">Evaluation Logic</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculatedLogs.map((cl, i) => (
                              <tr key={i} className="border-b border-slate-50 text-[11px] hover:bg-slate-50/50">
                                <td className="p-2.5 pl-4 font-bold text-slate-800">{cl.userName}</td>
                                <td className="p-2.5 font-mono text-slate-500 text-[10px]">{cl.date}</td>
                                <td className="p-2.5 font-semibold text-slate-600 text-[10px]">
                                  {cl.punchInTime.split(' ')[1]} ➜ {cl.punchOutTime ? cl.punchOutTime.split(' ')[1] : 'No Out'}
                                </td>
                                <td className="p-2.5">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide
                                    ${cl.status === 'on-time' ? 'bg-emerald-50 text-emerald-700' : ''}
                                    ${cl.status === 'late' ? 'bg-amber-50 text-amber-700' : ''}
                                    ${cl.status === 'half-day' ? 'bg-sky-50 text-sky-700' : ''}
                                    ${cl.status === 'present' ? 'bg-indigo-50 text-indigo-700' : ''}
                                  `}>
                                    {cl.status}
                                  </span>
                                </td>
                                <td className="p-2.5 pr-4 text-slate-500 font-semibold text-[10px]">{cl.explanation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Raw Unprocessed Machine Logs:</div>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="p-2.5 pl-4">ID</th>
                              <th className="p-2.5">Staff Employee</th>
                              <th className="p-2.5">Terminal Log Timestamp</th>
                              <th className="p-2.5">Method Used</th>
                              <th className="p-2.5 pr-4">Terminal IP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawMachineLogs.map((log) => (
                              <tr key={log.id} className="border-b border-slate-50 text-[11px] hover:bg-slate-50/50">
                                <td className="p-2.5 pl-4 font-mono text-slate-400 text-[10px]">{log.employeeId}</td>
                                <td className="p-2.5 font-bold text-slate-800">{log.name}</td>
                                <td className="p-2.5 font-mono text-slate-600 text-[10px]">{log.time}</td>
                                <td className="p-2.5 font-semibold text-indigo-600 flex items-center gap-1 text-[11px]">
                                  <Fingerprint className="h-3 w-3" />
                                  {log.method}
                                </td>
                                <td className="p-2.5 pr-4 font-mono text-slate-400 text-[10px]">{log.ip}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. User Biometrics Directory */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Employee Biometric Credentials Database</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Verify or register staff Face Templates, Fingerprint indexes, RFID Cards, and PIN Codes</p>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2.5xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-3 pl-6">Employee Name</th>
                        <th className="p-3">Face ID Recognition</th>
                        <th className="p-3">Fingerprint Index</th>
                        <th className="p-3">RFID Card Serial</th>
                        <th className="p-3">Keypad Door PIN</th>
                        <th className="p-3 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const hasFace = u.biometrics?.faceRegistered;
                        const hasFinger = u.biometrics?.fingerRegistered;
                        const cardNum = u.biometrics?.cardNumber;
                        const pinNum = u.biometrics?.pinCode;

                        return (
                          <tr key={u.id} className="border-b border-slate-50 text-xs hover:bg-slate-50/50">
                            <td className="p-3 pl-6 flex items-center gap-2.5">
                              <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-100" referrerPolicy="no-referrer" />
                              <div>
                                <span className="font-bold text-slate-800 block leading-tight">{u.name}</span>
                                <span className="text-[10px] text-slate-400 block font-semibold leading-none">{u.employeeId || 'No ID'}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.75 rounded-full text-[10px] font-bold ${hasFace ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hasFace ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                {hasFace ? 'Registered' : 'Not Configured'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.75 rounded-full text-[10px] font-bold ${hasFinger ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hasFinger ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                {hasFinger ? 'Indexed' : 'Not Configured'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[10px] font-bold text-slate-700">
                              {cardNum ? (
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.75 rounded-lg border border-slate-200">
                                  {cardNum}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">None</span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[10px] font-bold text-slate-700">
                              {pinNum ? (
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.75 rounded-lg border border-slate-200">
                                  •••• {pinNum.substring(pinNum.length - 1)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">None</span>
                              )}
                            </td>
                            <td className="p-3 pr-6 text-right">
                              <button
                                onClick={() => handleStartRegisterBiometrics(u)}
                                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-0 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Modify Credentials
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Future API Dev Center for External Devices */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Third-Party Hardware API Integration Console</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Future-proof Webhook endpoints for ZKTeco, Hikvision, and custom RFID controllers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApiSampleCode(!showApiSampleCode)}
                    className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {showApiSampleCode ? 'Hide API Details' : 'View Integration API'}
                  </button>
                </div>

                {showApiSampleCode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-slate-900 text-slate-300 p-5 rounded-2xl font-mono text-xs space-y-4 overflow-hidden border border-slate-800"
                  >
                    <div>
                      <span className="text-emerald-400 font-bold">// Future Hardware Push Endpoints for custom biometric scanners</span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Any physical door controller or fingerprint scanner can push raw punch records directly to the software server using our open JSON Webhook protocol.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sky-300 font-bold">POST /api/biometrics/punch</div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-300 overflow-x-auto">
{`{
  "deviceId": "dev-0912",
  "apiKey": "sa_hw_sec_key_993421",
  "punches": [
    {
      "employeeId": "EMP-1001",
      "timestamp": "2026-06-23T17:05:10Z",
      "verificationMethod": "face_recognition",
      "terminalIp": "192.168.1.110"
    }
  ]
}`}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold">Standard Device Handshake CURL Sample:</span>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] text-amber-300 overflow-x-auto whitespace-pre">
{`curl -X POST https://api.workspace.com/api/biometrics/punch \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"dev-01","apiKey":"sa_hw_sec_key","punches":[{"employeeId":"EMP-1001","timestamp":"2026-06-23T08:05:00Z","verificationMethod":"fingerprint"}]}'`}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6" id="biometrics-services-panel">
              {/* Handshake connectivity report */}
              {handshakeResult && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl flex items-start gap-3 border ${
                    handshakeResult.includes('SUCCESS') || handshakeResult.includes('Successful') 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-900'
                  }`}
                  id="handshake-result-toast"
                >
                  {handshakeResult.includes('SUCCESS') || handshakeResult.includes('Successful') ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <h5 className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Brand Service Event Log</h5>
                    <p className="text-xs font-semibold leading-relaxed">{handshakeResult}</p>
                  </div>
                  <button 
                    onClick={() => setHandshakeResult(null)}
                    className="text-[10px] font-extrabold uppercase text-slate-500 hover:text-slate-800 bg-transparent border-0 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}

              {/* Subtab main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Brand services connector list */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Active Brand API Connectors</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Manage corporate biometric cloud synchronization pipelines</p>
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {biometricServices.filter(s => s.status === 'active').length} / {biometricServices.length} Active
                      </span>
                    </div>

                    <div className="space-y-4.5">
                      {biometricServices.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 space-y-2">
                          <Server className="h-8 w-8 mx-auto opacity-40 animate-pulse text-slate-400" />
                          <p className="text-xs font-semibold">No Brand Biometric Services configured yet.</p>
                          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Click the 'Add Brand Service API' button above to register ZKTeco, Hikvision, or custom biometric interfaces.</p>
                        </div>
                      ) : (
                        biometricServices.map(s => {
                          const brandColor = s.brandName === 'ZKTeco' ? 'emerald' : s.brandName === 'Hikvision' ? 'rose' : s.brandName === 'Suprema' ? 'sky' : 'indigo';
                          const isTesting = isTestingHandshake === s.id;
                          
                          return (
                            <div 
                              key={s.id} 
                              className={`p-4 border rounded-2xl transition-all duration-200 ${
                                s.status === 'active' 
                                  ? 'bg-slate-50/40 border-slate-100 hover:border-indigo-150' 
                                  : 'bg-slate-100/30 border-slate-200/50 opacity-65'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex items-start gap-3">
                                  <div className={`p-2.5 rounded-xl shrink-0 font-extrabold text-xs uppercase flex items-center justify-center tracking-widest bg-${brandColor}-50 text-${brandColor}-600 border border-${brandColor}-100 w-11 h-11`}>
                                    {s.brandName.substring(0, 2)}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="text-xs font-bold text-slate-800 leading-tight">{s.customName}</h5>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-${brandColor}-100 text-${brandColor}-800 border border-${brandColor}-200/30`}>
                                        {s.brandName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {s.protocol}</span>
                                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.pollingInterval}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  {/* Toggle Switch */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-400">{s.status === 'active' ? 'Active' : 'Disabled'}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleServiceStatus(s.id)}
                                      className={`w-8 h-4.5 rounded-full p-0.5 transition-all relative border-0 cursor-pointer ${
                                        s.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                                      }`}
                                    >
                                      <div className={`w-3.5 h-3.5 bg-white rounded-full transition-all transform ${
                                        s.status === 'active' ? 'translate-x-3.5' : 'translate-x-0'
                                      }`} />
                                    </button>
                                  </div>

                                  {/* Sync Status Badge */}
                                  <div>
                                    {s.lastSyncStatus === 'success' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.75 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-lg border border-emerald-150">
                                        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                        Connected
                                      </span>
                                    ) : s.lastSyncStatus === 'failed' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.75 bg-rose-50 text-rose-700 text-[9px] font-bold rounded-lg border border-rose-150 animate-pulse">
                                        <span className="w-1 h-1 bg-rose-500 rounded-full"></span>
                                        Error
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.75 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-lg border border-slate-200">
                                        <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                        Untested
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* API Key and Url sub-panel */}
                              <div className="mt-3 pt-3 border-t border-slate-100/80 flex flex-col md:flex-row justify-between md:items-center gap-2 text-[10px] font-semibold text-slate-500 bg-slate-50/60 p-2.5 rounded-xl">
                                <div className="space-y-1 overflow-hidden max-w-md">
                                  <div><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block leading-none mb-0.5">API Server Endpoint</span></div>
                                  <div className="font-mono text-slate-600 truncate text-[10px]" title={s.apiUrl}>{s.apiUrl}</div>
                                </div>
                                <div className="space-y-1">
                                  <div><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] block leading-none mb-0.5">Authorization Secret Key</span></div>
                                  <div className="font-mono text-slate-600 flex items-center gap-1.5">
                                    <Key className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>••••••••{s.apiKey ? s.apiKey.substring(s.apiKey.length - 4) : 'xxxx'}</span>
                                  </div>
                                </div>

                                <div className="flex gap-2 shrink-0 md:self-end pt-1.5 md:pt-0">
                                  <button
                                    type="button"
                                    onClick={() => handleTestHandshake(s.id)}
                                    disabled={isTesting || s.status === 'inactive'}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-300 text-indigo-600 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0"
                                  >
                                    <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditService(s)}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBiometricService(s.id)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: brand API format specification explorer and live simulator */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                    
                    <div className="space-y-1.5 z-10 relative">
                      <div className="flex items-center gap-1.5 text-indigo-400">
                        <Activity className="h-4.5 w-4.5" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Brand Webhook Protocol Explorer</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-white">Device Manufacturer JSON Schemas</h4>
                      <p className="text-[10px] text-slate-400">Select any brand to explore their API design and push simulated hardware logs into the corporate platform.</p>
                    </div>

                    {/* Brand select tabs */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                      {['ZKTeco', 'Hikvision', 'Suprema', 'Dahua'].map((brand) => (
                        <button
                          key={brand}
                          onClick={() => setNewDeviceType(brand)} // reusing newDeviceType for visual state context
                          className={`py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border-0
                            ${newDeviceType === brand || (brand === 'ZKTeco' && !['ZKTeco', 'Hikvision', 'Suprema', 'Dahua'].includes(newDeviceType))
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'text-slate-400 hover:text-white bg-transparent'}`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>

                    {/* API schema details view */}
                    {(() => {
                      const selectedBrand = ['ZKTeco', 'Hikvision', 'Suprema', 'Dahua'].includes(newDeviceType) ? newDeviceType : 'ZKTeco';
                      const detailsMap: Record<string, any> = {
                        'ZKTeco': {
                          method: 'POST',
                          endpoint: '/api/biometrics/push',
                          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer zk_sec_xxxx' },
                          payload: `{
  "event_log": {
    "pin": "EMP-1001",
    "time": "2026-06-23 09:05:15",
    "device_sn": "ZK-950002103",
    "verify_type": "face"
  }
}`
                        },
                        'Hikvision': {
                          method: 'POST',
                          endpoint: '/api/biometrics/push',
                          headers: { 'Content-Type': 'application/json', 'X-Hik-Signature': 'hik_auth_key_xxxx' },
                          payload: `{
  "AccessEvent": {
    "employeeNo": "EMP-8821",
    "eventTime": "2026-06-23T09:05:15+08:00",
    "deviceName": "Warehouse Turnstile",
    "verifyMode": "card"
  }
}`
                        },
                        'Suprema': {
                          method: 'POST',
                          endpoint: '/api/biometrics/push',
                          headers: { 'Content-Type': 'application/json', 'bs-session-id': 'suprema_token_xxxx' },
                          payload: `{
  "event": {
    "user_id": "EMP-4491",
    "date_time": "2026-06-23T09:05:15.000Z",
    "device_id": 9921,
    "type": "fingerprint"
  }
}`
                        },
                        'Dahua': {
                          method: 'POST',
                          endpoint: '/api/biometrics/push',
                          headers: { 'Content-Type': 'application/json', 'X-Dahua-Auth': 'dahua_token_xxxx' },
                          payload: `{
  "record": {
    "userId": "EMP-1001",
    "time": "1782294315",
    "readerId": "South_Gate",
    "mode": "pin_code"
  }
}`
                        }
                      };

                      const currentDetail = detailsMap[selectedBrand];

                      return (
                        <div className="space-y-3.5 z-10 relative">
                          <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px]">
                            <div className="flex gap-2 items-center">
                              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-md font-extrabold uppercase">{currentDetail.method}</span>
                              <span className="font-mono text-slate-300 font-bold">{currentDetail.endpoint}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">JSON schema</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">HTTP Auth Headers</span>
                            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[9px] font-mono text-slate-350 space-y-1">
                              {Object.entries(currentDetail.headers).map(([k, v]) => (
                                <div key={k} className="flex gap-1.5"><span className="text-indigo-400">{k}:</span> <span className="text-slate-400">"{v}"</span></div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Payload Request Template</span>
                            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[10px] text-slate-300 font-mono overflow-x-auto select-all max-h-[170px]">
                              {currentDetail.payload}
                            </pre>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSimulateApiLogPush(selectedBrand)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 border-0 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Trigger Mock {selectedBrand} API Push
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </div>
          )}

              {/* Inline Setup / Edit Modal for Biometric editing */}
              <AnimatePresence>
                {editingBiometricUserId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Fingerprint className="h-5 w-5 text-indigo-600" />
                          <h4 className="font-bold text-slate-800 text-sm">Register Employee Credentials</h4>
                        </div>
                        <button
                          onClick={() => setEditingBiometricUserId(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-lg border-0 bg-transparent cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* 1. Face Recognition Toggle */}
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">Face Recognition Template</span>
                            <button
                              onClick={() => setTempFaceReg(!tempFaceReg)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border-0
                                ${tempFaceReg ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-650'}`}
                            >
                              {tempFaceReg ? 'Enabled' : 'Disabled'}
                            </button>
                          </div>
                          {tempFaceReg && (
                            <input
                              type="text"
                              value={tempFaceUrl}
                              placeholder="Face photo URL (Optional)"
                              onChange={(e) => setTempFaceUrl(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[11px] font-medium outline-none text-slate-700"
                            />
                          )}
                        </div>

                        {/* 2. Fingerprint Index Toggle */}
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">Fingerprint Identification</span>
                            <button
                              onClick={() => setTempFingerReg(!tempFingerReg)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border-0
                                ${tempFingerReg ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-650'}`}
                            >
                              {tempFingerReg ? 'Enabled' : 'Disabled'}
                            </button>
                          </div>
                          {tempFingerReg && (
                            <input
                              type="text"
                              value={tempFingerprintHash}
                              placeholder="Fingerprint template SHA256 Hash (Optional)"
                              onChange={(e) => setTempFingerprintHash(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[11px] font-medium outline-none text-slate-700"
                            />
                          )}
                        </div>

                        {/* 3. Card serial */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">RFID Card Number</label>
                          <input
                            type="text"
                            value={tempCardNum}
                            placeholder="e.g. 10029348 (8-digit RFID code)"
                            onChange={(e) => setTempCardNum(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700"
                          />
                        </div>

                        {/* 4. PIN code */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Keypad PIN Access Code</label>
                          <input
                            type="text"
                            value={tempPinCode}
                            placeholder="e.g. 4392"
                            maxLength={6}
                            onChange={(e) => setTempPinCode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          onClick={handleSaveUserBiometrics}
                          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 border-0 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                        >
                          Save Credentials
                        </button>
                        <button
                          onClick={() => setEditingBiometricUserId(null)}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border-0 text-slate-600 font-semibold rounded-xl text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Add Biometric Terminal Modal */}
              <AnimatePresence>
                {showAddDeviceModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-5 w-5 text-indigo-600" />
                          <h4 className="font-bold text-slate-800 text-sm">Register Biometric Hardware Terminal</h4>
                        </div>
                        <button
                          onClick={() => setShowAddDeviceModal(false)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-lg border-0 bg-transparent cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>

                      <form onSubmit={handleAddBiometricDevice} className="space-y-3.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Terminal Device Name</label>
                          <input
                            type="text"
                            required
                            value={newDeviceName}
                            placeholder="e.g. South Entry Gate Reader"
                            onChange={(e) => setNewDeviceName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Device IP Address</label>
                            <input
                              type="text"
                              required
                              value={newDeviceIp}
                              placeholder="e.g. 192.168.1.120"
                              onChange={(e) => setNewDeviceIp(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Port</label>
                            <input
                              type="number"
                              required
                              value={newDevicePort}
                              placeholder="8080"
                              onChange={(e) => setNewDevicePort(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Terminal Sensor Capabilities</label>
                          <select
                            value={newDeviceType}
                            onChange={(e) => setNewDeviceType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                          >
                            <option value="Multi-modal (Face/Finger/Card)">Multi-modal (Face/Finger/Card)</option>
                            <option value="Face Recognition Scanner">Face Recognition Scanner</option>
                            <option value="Fingerprint Biometric Reader">Fingerprint Biometric Reader</option>
                            <option value="RFID Card & PIN Code Terminal">RFID Card & PIN Code Terminal</option>
                          </select>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 border-0 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                          >
                            Register Device
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddDeviceModal(false)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border-0 text-slate-600 font-semibold rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Add/Edit Biometric Brand API Service Modal */}
              <AnimatePresence>
                {showAddServiceModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Server className="h-5 w-5 text-indigo-600" />
                          <h4 className="font-bold text-slate-800 text-sm">
                            {editingServiceId ? 'Edit Brand API Service' : 'Configure Brand API Service'}
                          </h4>
                        </div>
                        <button
                          onClick={() => setShowAddServiceModal(false)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-lg border-0 bg-transparent cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>

                      <form onSubmit={handleCreateOrUpdateBiometricService} className="space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Hardware Brand</label>
                            <select
                              value={newBrandName}
                              onChange={(e) => {
                                setNewBrandName(e.target.value);
                                if (!newBrandCustomName) {
                                  setNewBrandCustomName(`${e.target.value} Service Integration`);
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                            >
                              <option value="ZKTeco">ZKTeco</option>
                              <option value="Hikvision">Hikvision</option>
                              <option value="Suprema">Suprema</option>
                              <option value="Dahua">Dahua</option>
                              <option value="Matrix">Matrix COSEC</option>
                              <option value="Custom">Custom Brand</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Service Status</label>
                            <select
                              value={newBrandStatus}
                              onChange={(e) => setNewBrandStatus(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                            >
                              <option value="active">Active Sync</option>
                              <option value="inactive">Disabled</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Service Custom Name</label>
                          <input
                            type="text"
                            required
                            value={newBrandCustomName}
                            placeholder="e.g. ZKTeco Main Lobby Cloud Hub"
                            onChange={(e) => setNewBrandCustomName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">API Base URL / Endpoint</label>
                          <input
                            type="url"
                            required
                            value={newBrandApiUrl}
                            placeholder="e.g. https://api.zkteco.workspace/v1"
                            onChange={(e) => setNewBrandApiUrl(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">API Secret Token / Key</label>
                          <input
                            type="text"
                            value={newBrandApiKey}
                            placeholder="e.g. zk_sec_token_9934"
                            onChange={(e) => setNewBrandApiKey(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Sync Protocol</label>
                            <select
                              value={newBrandProtocol}
                              onChange={(e) => setNewBrandProtocol(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                            >
                              <option value="HTTP POST Push">HTTP POST Push</option>
                              <option value="REST API Polling">REST API Polling</option>
                              <option value="SOAP XML Webservice">SOAP XML Webservice</option>
                              <option value="Direct TCP/IP SDK Client">Direct TCP/IP SDK Client</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Polling Interval</label>
                            <select
                              value={newBrandPolling}
                              onChange={(e) => setNewBrandPolling(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                            >
                              <option value="Real-time Webhook">Real-time Webhook</option>
                              <option value="Every 5 mins">Every 5 mins</option>
                              <option value="Every 15 mins">Every 15 mins</option>
                              <option value="Hourly">Hourly</option>
                              <option value="Manual Sync Only">Manual Sync Only</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 border-0 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                          >
                            {editingServiceId ? 'Update Brand Connector' : 'Register Brand Service'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddServiceModal(false)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border-0 text-slate-600 font-semibold rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}

function AdminQRCanvas({ geo, qrPayload }: { geo: any, qrPayload: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrPayload, {
        width: 100,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error("Error generating local QR element:", err);
      });
    }
  }, [qrPayload]);

  return (
    <div className="flex flex-col items-center gap-1 p-1 bg-white rounded-lg border border-slate-100 shadow-3xs scale-90 duration-200 hover:scale-100 shrink-0">
      <canvas ref={canvasRef} className="w-12 h-12" />
      <span className="text-[8px] font-mono text-slate-450 block font-bold leading-none">{geo.radiusMeters > 5000 ? 'Global' : `${geo.radiusMeters}m`}</span>
    </div>
  );
}
