import { format } from 'date-fns';

// Demo data
const demoUsers = [
  { id: 1, username: 'admin', password: 'Admin123!', role: 'Admin', name: 'System Administrator', lastLogin: new Date('2024-12-01T10:00:00') },
  { id: 2, username: 'pv_user1', password: 'Pharma123!', role: 'Pharmacovigilance', name: 'John Smith', lastLogin: new Date('2024-12-01T09:30:00') },
  { id: 3, username: 'pv_user2', password: 'Pharma123!', role: 'Pharmacovigilance', name: 'Sarah Johnson', lastLogin: new Date('2024-12-01T08:45:00') },
  { id: 4, username: 'auditor', password: 'Audit123!', role: 'Sponsor/Auditor', name: 'Michael Brown', lastLogin: new Date('2024-11-30T16:20:00') }
];

const demoDrugs = [
  { 
    id: 1, 
    name: 'Aspirin', 
    manufacturer: 'Bayer AG', 
    query: 'aspirin[tiab] AND ("adverse event"[tiab] OR "side effect"[tiab])', 
    rsi: 'RSI-ASP-001', 
    nextSearchDate: '2024-12-15',
    status: 'Active'
  },
  { 
    id: 2, 
    name: 'Metformin', 
    manufacturer: 'Merck KGaA', 
    query: 'metformin[tiab] AND ("adverse event"[tiab] OR "safety"[tiab])', 
    rsi: 'RSI-MET-001', 
    nextSearchDate: '2024-12-16',
    status: 'Active'
  },
  { 
    id: 3, 
    name: 'Lisinopril', 
    manufacturer: 'AstraZeneca', 
    query: 'lisinopril[tiab] AND ("adverse event"[tiab] OR "toxicity"[tiab])', 
    rsi: 'RSI-LIS-001', 
    nextSearchDate: '2024-12-17',
    status: 'Active'
  }
];

const demoStudies = [
  {
    id: 1,
    pmid: '38901234',
    drugName: 'Aspirin',
    title: 'Long-term cardiovascular effects of aspirin in elderly patients',
    retrievalDate: '2024-12-01',
    processingDate: '2024-12-01',
    status: 'Pending Review',
    aiClassification: {
      hasHumanSubjects: true,
      hasAdverseEvents: true,
      confidence: 0.92,
      summary: 'Study involving 500 elderly patients examining cardiovascular outcomes. Reports gastrointestinal bleeding events in 12% of subjects.',
      keyPoints: [
        'Large cohort study (n=500)',
        'Gastrointestinal bleeding observed in 12% of patients',
        'Increased bleeding risk in patients >75 years',
        'Cardiovascular benefits confirmed'
      ]
    },
    comments: [],
    url: `https://pubmed.ncbi.nlm.nih.gov/38901234/`
  },
  {
    id: 2,
    pmid: '38901235',
    drugName: 'Metformin',
    title: 'Metformin-associated lactic acidosis: A systematic review',
    retrievalDate: '2024-12-01',
    processingDate: '2024-12-01',
    status: 'Under Review',
    aiClassification: {
      hasHumanSubjects: true,
      hasAdverseEvents: true,
      confidence: 0.98,
      summary: 'Systematic review analyzing cases of lactic acidosis associated with metformin use. Identified 45 confirmed cases.',
      keyPoints: [
        'Systematic review of 45 confirmed cases',
        'Lactic acidosis mortality rate: 50%',
        'Risk factors: renal impairment, dehydration',
        'Requires immediate discontinuation'
      ]
    },
    comments: [
      {
        id: 1,
        userId: 2,
        userName: 'John Smith',
        comment: 'High-priority case for ICSR reporting. Mortality rate is concerning.',
        timestamp: '2024-12-01T10:30:00',
        type: 'review'
      }
    ],
    url: `https://pubmed.ncbi.nlm.nih.gov/38901235/`
  },
  {
    id: 3,
    pmid: '38901236',
    drugName: 'Lisinopril',
    title: 'ACE inhibitor-induced cough: mechanisms and management',
    retrievalDate: '2024-11-30',
    processingDate: '2024-11-30',
    status: 'Approved',
    aiClassification: {
      hasHumanSubjects: true,
      hasAdverseEvents: true,
      confidence: 0.87,
      summary: 'Review of ACE inhibitor-induced cough mechanisms. Reports incidence of 10-20% in treated patients.',
      keyPoints: [
        'Cough incidence: 10-20% of patients',
        'More common in women and non-smokers',
        'Mechanism involves bradykinin accumulation',
        'Reversible upon drug discontinuation'
      ]
    },
    comments: [
      {
        id: 1,
        userId: 2,
        userName: 'John Smith',
        comment: 'Well-documented adverse event. Include in periodic safety update.',
        timestamp: '2024-11-30T14:20:00',
        type: 'review'
      },
      {
        id: 2,
        userId: 3,
        userName: 'Sarah Johnson',
        comment: 'Approved for AOI reporting. Standard adverse event.',
        timestamp: '2024-11-30T15:45:00',
        type: 'approval'
      }
    ],
    url: `https://pubmed.ncbi.nlm.nih.gov/38901236/`
  }
];

const demoAuditLog = [
  {
    id: 1,
    userId: 1,
    userName: 'System Administrator',
    action: 'login',
    details: 'User admin logged in with role Admin',
    timestamp: '2024-12-01T08:00:00'
  },
  {
    id: 2,
    userId: 2,
    userName: 'John Smith',
    action: 'login',
    details: 'User pv_user1 logged in with role Pharmacovigilance',
    timestamp: '2024-12-01T09:30:00'
  },
  {
    id: 3,
    userId: 2,
    userName: 'John Smith',
    action: 'comment',
    details: 'Added comment to study PMID: 38901235',
    timestamp: '2024-12-01T10:30:00'
  },
  {
    id: 4,
    userId: 3,
    userName: 'Sarah Johnson',
    action: 'approval',
    details: 'Approved study PMID: 38901236 for AOI reporting',
    timestamp: '2024-11-30T15:45:00'
  },
  {
    id: 5,
    userId: 1,
    userName: 'System Administrator',
    action: 'drug_update',
    details: 'Updated drug information for Aspirin',
    timestamp: '2024-11-30T11:15:00'
  }
];

// Utility function to simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Format date as dd-mmm-yyyy as specified in SRS
const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd-MMM-yyyy');
};

export const demoApi = {
  // Authentication
  login: async (username, password, role) => {
    await delay(800); // Simulate network delay
    
    const user = demoUsers.find(u => 
      u.username === username && 
      u.password === password && 
      u.role === role
    );
    
    if (user) {
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          lastLogin: user.lastLogin
        }
      };
    } else {
      return {
        success: false,
        message: 'Invalid credentials or unauthorized role access'
      };
    }
  },

  // Drug Management
  getDrugs: async () => {
    await delay(500);
    return demoDrugs;
  },

  addDrug: async (drugData) => {
    await delay(1000);
    const newDrug = {
      id: demoDrugs.length + 1,
      ...drugData,
      status: 'Active'
    };
    demoDrugs.push(newDrug);
    return { success: true, drug: newDrug };
  },

  updateDrug: async (id, drugData) => {
    await delay(800);
    const index = demoDrugs.findIndex(d => d.id === id);
    if (index !== -1) {
      demoDrugs[index] = { ...demoDrugs[index], ...drugData };
      return { success: true, drug: demoDrugs[index] };
    }
    return { success: false, message: 'Drug not found' };
  },

  deleteDrug: async (id) => {
    await delay(500);
    const index = demoDrugs.findIndex(d => d.id === id);
    if (index !== -1) {
      demoDrugs.splice(index, 1);
      return { success: true };
    }
    return { success: false, message: 'Drug not found' };
  },

  // Study Management
  getStudies: async (filters = {}) => {
    await delay(1000);
    let filteredStudies = [...demoStudies];
    
    if (filters.drugName) {
      filteredStudies = filteredStudies.filter(s => 
        s.drugName.toLowerCase().includes(filters.drugName.toLowerCase())
      );
    }
    
    if (filters.status) {
      filteredStudies = filteredStudies.filter(s => s.status === filters.status);
    }
    
    if (filters.dateFrom) {
      filteredStudies = filteredStudies.filter(s => 
        new Date(s.retrievalDate) >= new Date(filters.dateFrom)
      );
    }
    
    if (filters.dateTo) {
      filteredStudies = filteredStudies.filter(s => 
        new Date(s.retrievalDate) <= new Date(filters.dateTo)
      );
    }
    
    return filteredStudies;
  },

  addStudyComment: async (studyId, comment, userId, userName) => {
    await delay(600);
    const study = demoStudies.find(s => s.id === studyId);
    if (study) {
      const newComment = {
        id: study.comments.length + 1,
        userId,
        userName,
        comment,
        timestamp: new Date().toISOString(),
        type: 'review'
      };
      study.comments.push(newComment);
      return { success: true, comment: newComment };
    }
    return { success: false, message: 'Study not found' };
  },

  approveStudy: async (studyId, userId, userName) => {
    await delay(500);
    const study = demoStudies.find(s => s.id === studyId);
    if (study) {
      study.status = 'Approved';
      const approvalComment = {
        id: study.comments.length + 1,
        userId,
        userName,
        comment: 'Study approved for reporting',
        timestamp: new Date().toISOString(),
        type: 'approval'
      };
      study.comments.push(approvalComment);
      return { success: true };
    }
    return { success: false, message: 'Study not found' };
  },

  // User Management
  getUsers: async () => {
    await delay(600);
    return demoUsers.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      lastLogin: user.lastLogin
    }));
  },

  addUser: async (userData) => {
    await delay(1000);
    const newUser = {
      id: demoUsers.length + 1,
      ...userData,
      lastLogin: null
    };
    demoUsers.push(newUser);
    return { success: true, user: newUser };
  },

  updateUser: async (id, userData) => {
    await delay(800);
    const index = demoUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      demoUsers[index] = { ...demoUsers[index], ...userData };
      return { success: true, user: demoUsers[index] };
    }
    return { success: false, message: 'User not found' };
  },

  deleteUser: async (id) => {
    await delay(500);
    const index = demoUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      demoUsers.splice(index, 1);
      return { success: true };
    }
    return { success: false, message: 'User not found' };
  },

  // Audit Trail
  getAuditLog: async (filters = {}) => {
    await delay(800);
    let filteredLog = [...demoAuditLog];
    
    if (filters.userId) {
      filteredLog = filteredLog.filter(log => log.userId === filters.userId);
    }
    
    if (filters.action) {
      filteredLog = filteredLog.filter(log => log.action === filters.action);
    }
    
    if (filters.dateFrom) {
      filteredLog = filteredLog.filter(log => 
        new Date(log.timestamp) >= new Date(filters.dateFrom)
      );
    }
    
    if (filters.dateTo) {
      filteredLog = filteredLog.filter(log => 
        new Date(log.timestamp) <= new Date(filters.dateTo)
      );
    }
    
    return filteredLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  logActivity: async (action, details, userId = null) => {
    // In a real app, this would send to the backend
    const logEntry = {
      id: demoAuditLog.length + 1,
      userId: userId || (JSON.parse(localStorage.getItem('liase_user') || '{}')?.id),
      userName: (JSON.parse(localStorage.getItem('liase_user') || '{}')?.name) || 'System',
      action,
      details,
      timestamp: new Date().toISOString()
    };
    demoAuditLog.unshift(logEntry);
    return { success: true };
  },

  // Dashboard Statistics
  getDashboardStats: async () => {
    await delay(1000);
    return {
      totalStudies: demoStudies.length,
      pendingReview: demoStudies.filter(s => s.status === 'Pending Review').length,
      underReview: demoStudies.filter(s => s.status === 'Under Review').length,
      approved: demoStudies.filter(s => s.status === 'Approved').length,
      activeDrugs: demoDrugs.filter(d => d.status === 'Active').length,
      recentActivity: demoAuditLog.slice(0, 5)
    };
  },

  // Simulate AI processing (long-running task)
  processStudies: async (drugName) => {
    await delay(3000); // Simulate 30-45 second processing time (shortened for demo)
    
    // In real implementation, this would trigger the LLM API
    const newStudy = {
      id: demoStudies.length + 1,
      pmid: `38${Math.floor(Math.random() * 900000) + 100000}`,
      drugName,
      title: `New study on ${drugName} safety profile`,
      retrievalDate: format(new Date(), 'yyyy-MM-dd'),
      processingDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'Pending Review',
      aiClassification: {
        hasHumanSubjects: Math.random() > 0.3,
        hasAdverseEvents: Math.random() > 0.4,
        confidence: Math.random() * 0.3 + 0.7,
        summary: `AI-generated summary for ${drugName} study`,
        keyPoints: [
          'Key finding 1',
          'Key finding 2',
          'Key finding 3'
        ]
      },
      comments: [],
      url: `https://pubmed.ncbi.nlm.nih.gov/38${Math.floor(Math.random() * 900000) + 100000}/`
    };
    
    demoStudies.unshift(newStudy);
    return { success: true, study: newStudy };
  }
};

export { formatDate };
