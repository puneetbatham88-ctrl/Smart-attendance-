import { User, Shift, PunchLog, GeofenceConfig, NotificationLog, Branch, Department } from '../types';

export const DEFAULT_SHIFTS: Shift[] = [
  {
    id: 'morning',
    name: 'Morning Shift',
    startTime: '08:00',
    endTime: '16:00',
    gracePeriodMinutes: 15,
    color: 'emerald'
  },
  {
    id: 'evening',
    name: 'Evening Shift',
    startTime: '16:00',
    endTime: '00:00',
    gracePeriodMinutes: 15,
    color: 'amber'
  },
  {
    id: 'night',
    name: 'Night Shift',
    startTime: '00:00',
    endTime: '08:00',
    gracePeriodMinutes: 15,
    color: 'indigo'
  }
];

export const DEFAULT_GEOFENCES: GeofenceConfig[] = [
  {
    name: 'Main Headquarters (HQ)',
    latitude: 37.7749,
    longitude: -122.4194,
    radiusMeters: 200
  },
  {
    name: 'Downtown Office Annex',
    latitude: 37.7894,
    longitude: -122.4014,
    radiusMeters: 150
  },
  {
    name: 'Silicon Valley Labs',
    latitude: 37.4275,
    longitude: -122.1697,
    radiusMeters: 300
  },
  {
    name: 'Anywhere (Field/Remote Work)',
    latitude: 0,
    longitude: 0,
    radiusMeters: 9999999 // Virtual unconstrained zone
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Admiral Admin',
    email: 'admin@company.com',
    role: 'admin',
    defaultShiftId: 'morning',
    joinedDate: '2025-01-10',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    dndSettings: {
      smsEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      dndModeActive: false
    },
    status: 'active',
    department: 'Management',
    branch: 'Main Headquarters (HQ)'
  },
  {
    id: 'u-2',
    name: 'David Miller',
    email: 'david@company.com',
    role: 'employee',
    defaultShiftId: 'morning',
    joinedDate: '2025-02-15',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    dndSettings: {
      smsEnabled: true,
      emailEnabled: false,
      pushEnabled: true,
      dndModeActive: false
    },
    status: 'active',
    department: 'Engineering',
    branch: 'Downtown Office Annex'
  },
  {
    id: 'u-3',
    name: 'Sarah Connor',
    email: 'sarah@company.com',
    role: 'employee',
    defaultShiftId: 'evening',
    joinedDate: '2025-03-01',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    dndSettings: {
      smsEnabled: false,
      emailEnabled: false,
      pushEnabled: false,
      dndModeActive: true
    },
    status: 'active',
    department: 'Operations',
    branch: 'Main Headquarters (HQ)'
  },
  {
    id: 'u-4',
    name: 'Neo Reeves',
    email: 'neo@company.com',
    role: 'employee',
    defaultShiftId: 'night',
    joinedDate: '2025-04-12',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    dndSettings: {
      smsEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
      dndModeActive: false
    },
    status: 'active',
    department: 'Engineering',
    branch: 'Silicon Valley Labs'
  },
  {
    id: 'u-5',
    name: 'Ripley Weaver',
    email: 'ripley@company.com',
    role: 'employee',
    defaultShiftId: 'morning',
    joinedDate: '2025-05-20',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
    dndSettings: {
      smsEnabled: false,
      emailEnabled: true,
      pushEnabled: true,
      dndModeActive: false
    },
    status: 'active',
    department: 'Operations',
    branch: 'Silicon Valley Labs'
  }
];

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'b-1',
    name: 'Main Headquarters (HQ)',
    code: 'HQ-SF',
    address: '100 Market St, San Francisco, CA 94105',
    phone: '+1 (415) 555-0100',
    manager: 'Admiral Admin',
    geofenceRadiusMeters: 200
  },
  {
    id: 'b-2',
    name: 'Downtown Office Annex',
    code: 'ANNEX-DT',
    address: '555 Montgomery St, San Francisco, CA 94111',
    phone: '+1 (415) 555-0220',
    manager: 'David Miller',
    geofenceRadiusMeters: 150
  },
  {
    id: 'b-3',
    name: 'Silicon Valley Labs',
    code: 'LABS-SV',
    address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043',
    phone: '+1 (650) 253-0000',
    manager: 'Neo Reeves',
    geofenceRadiusMeters: 300
  }
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'd-1',
    name: 'Engineering',
    code: 'ENG',
    headOfDepartment: 'David Miller',
    budget: '$1,200,000',
    employeeCount: 2
  },
  {
    id: 'd-2',
    name: 'Operations',
    code: 'OPS',
    headOfDepartment: 'Sarah Connor',
    budget: '$850,000',
    employeeCount: 2
  },
  {
    id: 'd-3',
    name: 'Management',
    code: 'MGMT',
    headOfDepartment: 'Admiral Admin',
    budget: '$450,000',
    employeeCount: 1
  },
  {
    id: 'd-4',
    name: 'Sales & Marketing',
    code: 'SALES',
    headOfDepartment: 'Ripley Weaver',
    budget: '$600,000',
    employeeCount: 0
  },
  {
    id: 'd-5',
    name: 'Human Resources',
    code: 'HR',
    headOfDepartment: 'Ripley Weaver',
    budget: '$300,000',
    employeeCount: 0
  }
];

// Helper to construct recent dates
const getPastDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const getPastDateTimeISO = (daysAgo: number, timeStr: string): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const [hours, minutes] = timeStr.split(':');
  d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return d.toISOString();
};

export const INITIAL_PUNCH_LOGS: PunchLog[] = [
  // --- Days Ago: 4 ---
  {
    id: 'p-1',
    userId: 'u-2',
    userName: 'David Miller',
    userEmail: 'david@company.com',
    date: getPastDateString(4),
    punchInTime: getPastDateTimeISO(4, '07:54'),
    punchOutTime: getPastDateTimeISO(4, '16:02'),
    shiftId: 'morning',
    shiftName: 'Morning Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.7750, longitude: -122.4195, name: 'Main Headquarters (HQ)', accuracy: 12 },
    punchOutLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 15 },
    notified: true,
    dndSuppressed: false,
    notes: 'Arrived early. Good day overall.'
  },
  {
    id: 'p-2',
    userId: 'u-3',
    userName: 'Sarah Connor',
    userEmail: 'sarah@company.com',
    date: getPastDateString(4),
    punchInTime: getPastDateTimeISO(4, '15:55'),
    punchOutTime: getPastDateTimeISO(4, '23:58'),
    shiftId: 'evening',
    shiftName: 'Evening Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.7895, longitude: -122.4015, name: 'Downtown Office Annex', accuracy: 8 },
    punchOutLocation: { latitude: 37.7894, longitude: -122.4014, name: 'Downtown Office Annex', accuracy: 5 },
    notified: false, // DND was active
    dndSuppressed: true,
    notes: 'No issues.'
  },
  {
    id: 'p-3',
    userId: 'u-4',
    userName: 'Neo Reeves',
    userEmail: 'neo@company.com',
    date: getPastDateString(4),
    punchInTime: getPastDateTimeISO(4, '23:45'),
    punchOutTime: getPastDateTimeISO(4, '08:05'),
    shiftId: 'night',
    shiftName: 'Night Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.4274, longitude: -121.1696, name: 'Silicon Valley Labs', accuracy: 25 },
    punchOutLocation: { latitude: 37.4275, longitude: -122.1697, name: 'Silicon Valley Labs', accuracy: 14 },
    notified: true,
    dndSuppressed: false,
    notes: 'Secured servers during shift.'
  },

  // --- Days Ago: 3 ---
  {
    id: 'p-4',
    userId: 'u-2',
    userName: 'David Miller',
    userEmail: 'david@company.com',
    date: getPastDateString(3),
    punchInTime: getPastDateTimeISO(3, '08:24'), // Late (> 8:15)
    punchOutTime: getPastDateTimeISO(3, '16:15'),
    shiftId: 'morning',
    shiftName: 'Morning Shift',
    status: 'late',
    punchInLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 10 },
    punchOutLocation: { latitude: 37.7748, longitude: -122.4195, name: 'Main Headquarters (HQ)', accuracy: 9 },
    notified: true,
    dndSuppressed: false,
    notes: 'Delayed due to heavy traffic on the Golden Gate bridge.'
  },
  {
    id: 'p-5',
    userId: 'u-3',
    userName: 'Sarah Connor',
    userEmail: 'sarah@company.com',
    date: getPastDateString(3),
    punchInTime: getPastDateTimeISO(3, '15:50'),
    punchOutTime: getPastDateTimeISO(3, '23:55'),
    shiftId: 'evening',
    shiftName: 'Evening Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.7894, longitude: -122.4014, name: 'Downtown Office Annex', accuracy: 11 },
    punchOutLocation: { latitude: 37.7894, longitude: -122.4014, name: 'Downtown Office Annex', accuracy: 12 },
    notified: false,
    dndSuppressed: true,
    notes: 'Normal shift operations.'
  },
  {
    id: 'p-6',
    userId: 'u-5',
    userName: 'Ripley Weaver',
    userEmail: 'ripley@company.com',
    date: getPastDateString(3),
    punchInTime: getPastDateTimeISO(3, '07:59'),
    punchOutTime: getPastDateTimeISO(3, '16:04'),
    shiftId: 'morning',
    shiftName: 'Morning Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 12 },
    punchOutLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 13 },
    notified: true,
    dndSuppressed: false,
    notes: 'Back in action.'
  },

  // --- Days Ago: 2 ---
  {
    id: 'p-7',
    userId: 'u-2',
    userName: 'David Miller',
    userEmail: 'david@company.com',
    date: getPastDateString(2),
    punchInTime: getPastDateTimeISO(2, '07:51'),
    punchOutTime: getPastDateTimeISO(2, '16:01'),
    shiftId: 'morning',
    shiftName: 'Morning Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 10 },
    punchOutLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 10 },
    notified: true,
    dndSuppressed: false,
    notes: ''
  },
  {
    id: 'p-8',
    userId: 'u-3',
    userName: 'Sarah Connor',
    userEmail: 'sarah@company.com',
    date: getPastDateString(2),
    punchInTime: getPastDateTimeISO(2, '16:35'), // Late (> 16:15)
    punchOutTime: getPastDateTimeISO(2, '23:59'),
    shiftId: 'evening',
    shiftName: 'Evening Shift',
    status: 'late',
    punchInLocation: { latitude: 37.7894, longitude: -122.4014, name: 'Downtown Office Annex', accuracy: 5 },
    punchOutLocation: { latitude: 37.7894, longitude: -122.4014, name: 'Downtown Office Annex', accuracy: 5 },
    notified: false,
    dndSuppressed: true,
    notes: 'Urgent family doctor appointment.'
  },
  {
    id: 'p-9',
    userId: 'u-4',
    userName: 'Neo Reeves',
    userEmail: 'neo@company.com',
    date: getPastDateString(2),
    punchInTime: getPastDateTimeISO(2, '23:59'),
    punchOutTime: getPastDateTimeISO(2, '08:01'),
    shiftId: 'night',
    shiftName: 'Night Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.4275, longitude: -122.1697, name: 'Silicon Valley Labs', accuracy: 15 },
    punchOutLocation: { latitude: 37.4275, longitude: -122.1697, name: 'Silicon Valley Labs', accuracy: 12 },
    notified: true,
    dndSuppressed: false,
    notes: 'Routine debugs.'
  },

  // --- Days Ago: 1 ---
  {
    id: 'p-10',
    userId: 'u-2',
    userName: 'David Miller',
    userEmail: 'david@company.com',
    date: getPastDateString(1),
    punchInTime: getPastDateTimeISO(1, '08:02'),
    punchOutTime: getPastDateTimeISO(1, '16:00'),
    shiftId: 'morning',
    shiftName: 'Morning Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 14 },
    punchOutLocation: { latitude: 37.7749, longitude: -122.4194, name: 'Main Headquarters (HQ)', accuracy: 15 },
    notified: true,
    dndSuppressed: false,
    notes: 'Quiet Friday work'
  },
  {
    id: 'p-11',
    userId: 'u-3',
    userName: 'Sarah Connor',
    userEmail: 'sarah@company.com',
    date: getPastDateString(1),
    punchInTime: getPastDateTimeISO(1, '15:58'),
    punchOutTime: null, // Left active! For simulation
    shiftId: 'evening',
    shiftName: 'Evening Shift',
    status: 'on-time',
    punchInLocation: { latitude: 37.7894, longitude: -122.4014, name: 'Downtown Office Annex', accuracy: 11 },
    punchOutLocation: null,
    notified: false,
    dndSuppressed: true,
    notes: 'Continuing tasks over shift transition.'
  },
  {
    id: 'p-12',
    userId: 'u-5',
    userName: 'Ripley Weaver',
    userEmail: 'ripley@company.com',
    date: getPastDateString(1),
    punchInTime: getPastDateTimeISO(1, '08:45'), // Late
    punchOutTime: getPastDateTimeISO(1, '16:30'),
    shiftId: 'morning',
    shiftName: 'Morning Shift',
    status: 'late',
    punchInLocation: { latitude: 34.0522, longitude: -118.2437, name: 'Out of Bounds (Simulated)', accuracy: 1500 }, // Geo validation failed
    punchOutLocation: { latitude: 34.0522, longitude: -118.2437, name: 'Out of Bounds (Simulated)', accuracy: 1500 },
    notified: true,
    dndSuppressed: false,
    notes: 'Worked from out-of-radius LA center.'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationLog[] = [
  {
    id: 'n-1',
    userId: 'u-2',
    userName: 'David Miller',
    title: 'Punch-In Successful',
    message: 'Punch-In recorded at 07:54 AM for Morning Shift.',
    timestamp: getPastDateTimeISO(4, '07:54'),
    type: 'sms',
    status: 'sent'
  },
  {
    id: 'n-2',
    userId: 'u-3',
    userName: 'Sarah Connor',
    title: 'Punch-In Successful',
    message: 'Punch-In recorded at 15:55 PM for Evening Shift.',
    timestamp: getPastDateTimeISO(4, '15:55'),
    type: 'push',
    status: 'suppressed' // Stopped because of DND
  },
  {
    id: 'n-3',
    userId: 'u-4',
    userName: 'Neo Reeves',
    title: 'Punch-In Successful',
    message: 'Punch-In recorded at 23:45 PM for Night Shift.',
    timestamp: getPastDateTimeISO(4, '23:45'),
    type: 'email',
    status: 'sent'
  }
];
