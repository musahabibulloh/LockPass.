import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Key, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Folder, 
  ExternalLink, 
  Globe, 
  LogOut, 
  User, 
  Mail, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  Info,
  ChevronDown
} from 'lucide-react';

export default function App() {
  // Authentication & Master PIN State
  const [isLocked, setIsLocked] = useState(true);
  const [masterPin, setMasterPin] = useState('');
  const [hasMasterPinSet, setHasMasterPinSet] = useState(false);
  const [typedPin, setTypedPin] = useState('');
  
  // Setup PIN states (if resetting)
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  
  // Vault Data State
  const [passwords, setPasswords] = useState([]);
  
  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' | 'generator' | 'audit' | 'backup'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'name' | 'security'
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = add new, object = editing
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    username: '',
    password: '',
    category: 'Media Sosial',
    notes: ''
  });
  
  // UI Interactive States
  const [revealedPasswords, setRevealedPasswords] = useState({}); // { id: boolean }
  const [copiedStates, setCopiedStates] = useState({}); // { id_field: boolean }
  const [toasts, setToasts] = useState([]);
  const [isPinInputFocused, setIsPinInputFocused] = useState(false);
  
  // Lockout / Brute Force Prevention state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0); // in seconds

  // Password Generator State
  const [genLength, setGenLength] = useState(16);
  const [genOptions, setGenOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  const [generatedPass, setGeneratedPass] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const pinInputRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  // Initialize and check if a PIN has been set
  useEffect(() => {
    const verifyToken = localStorage.getItem('lockpass_verify');
    if (verifyToken) {
      setHasMasterPinSet(true);
    } else {
      setHasMasterPinSet(false);
    }

    // Check for existing Lockout on page load
    const lockoutUntil = localStorage.getItem('lockpass_lockout_until');
    if (lockoutUntil) {
      const remaining = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTimeLeft(remaining);
      } else {
        localStorage.removeItem('lockpass_lockout_until');
      }
    }
  }, []);

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimeLeft(prev => {
        if (prev <= 1) {
          localStorage.removeItem('lockpass_lockout_until');
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  // Inactivity Auto-Lock timer management
  const resetInactivityTimer = () => {
    if (isLocked) return;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      handleLockVault();
      showToast('info', 'Brankas dikunci otomatis karena tidak ada aktivitas.');
    }, 3 * 60 * 1000);
  };

  useEffect(() => {
    if (isLocked) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      return;
    }

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isLocked]);

  // Auto-focus PIN field when locked screen is visible and not locked out
  useEffect(() => {
    if (isLocked && hasMasterPinSet && pinInputRef.current && lockoutTimeLeft <= 0) {
      setTimeout(() => {
        pinInputRef.current.focus();
      }, 300);
    }
  }, [isLocked, hasMasterPinSet, lockoutTimeLeft]);

  // Sync state to local storage when passwords list changes
  const saveVaultToLocalStorage = (updatedPasswords, activeKey = masterPin) => {
    if (!activeKey) return;
    try {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(updatedPasswords), 
        activeKey
      ).toString();
      localStorage.setItem('lockpass_encrypted_data', encryptedData);
    } catch (error) {
      showToast('error', 'Gagal mengenkripsi dan menyimpan data vault.');
    }
  };

  // Toast Notification System
  const showToast = (type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text, id, fieldType) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    const key = `${id}_${fieldType}`;
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    showToast('success', `${fieldType === 'username' ? 'Username' : 'Password'} disalin ke clipboard!`);
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Setup PIN (First run / Resetting)
  const handleSetupPin = (e) => {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(setupPin)) {
      showToast('error', 'PIN harus terdiri dari 6 digit angka.');
      return;
    }
    if (setupPin !== confirmSetupPin) {
      showToast('error', 'Konfirmasi PIN tidak cocok.');
      return;
    }

    try {
      const verifyToken = CryptoJS.AES.encrypt('LOCKPASS_VERIFIED', setupPin).toString();
      localStorage.setItem('lockpass_verify', verifyToken);
      
      setMasterPin(setupPin);
      setHasMasterPinSet(true);
      setIsLocked(false);
      setFailedAttempts(0);
      
      // Seed default placeholder accounts encrypted with the user's custom PIN
      const seedData = [
        {
          id: 'seed-1',
          title: 'Instagram',
          url: 'https://instagram.com',
          username: 'username_anda',
          password: 'PasswordUnikAnda123!',
          category: 'Media Sosial',
          notes: 'Contoh akun Instagram personal.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'seed-2',
          title: 'GitHub',
          url: 'https://github.com',
          username: 'username_github',
          password: 'gh_token_github_anda',
          category: 'Pekerjaan',
          notes: 'Contoh token repositori coding.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(seedData), 
        setupPin
      ).toString();
      
      localStorage.setItem('lockpass_encrypted_data', encryptedData);
      setPasswords(seedData);
      
      setSetupPin('');
      setConfirmSetupPin('');
      showToast('success', 'PIN Brankas berhasil dibuat!');
    } catch (err) {
      showToast('error', 'Gagal menyiapkan PIN.');
    }
  };

  // Unlock Vault Logic with Brute Force Protection
  const handleUnlockWithPin = (pinValue) => {
    if (lockoutTimeLeft > 0) return;

    const verifyToken = localStorage.getItem('lockpass_verify');
    if (!verifyToken) return;

    try {
      const bytes = CryptoJS.AES.decrypt(verifyToken, pinValue);
      const decryptedVerify = bytes.toString(CryptoJS.enc.Utf8);

      if (decryptedVerify === 'LOCKPASS_VERIFIED') {
        setMasterPin(pinValue);
        setIsLocked(false);
        setFailedAttempts(0);
        
        // Decrypt password records
        const encryptedData = localStorage.getItem('lockpass_encrypted_data');
        if (encryptedData) {
          const dataBytes = CryptoJS.AES.decrypt(encryptedData, pinValue);
          const decryptedData = JSON.parse(dataBytes.toString(CryptoJS.enc.Utf8));
          setPasswords(decryptedData);
        } else {
          setPasswords([]);
        }
        
        setTypedPin('');
        showToast('success', 'PIN benar. Brankas berhasil dibuka.');
      } else {
        handleFailedAttempts();
      }
    } catch (error) {
      handleFailedAttempts();
    }
  };

  // Failed Attempts Counter & Cooldown Lockout
  const handleFailedAttempts = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setTypedPin('');

    if (nextAttempts >= 5) {
      const lockoutDuration = 5 * 60 * 1000; 
      const lockUntil = Date.now() + lockoutDuration;
      localStorage.setItem('lockpass_lockout_until', lockUntil.toString());
      setLockoutTimeLeft(300);
      showToast('error', 'Batas percobaan habis! Brankas dikunci sementara selama 5 menit.');
    } else if (nextAttempts >= 3) {
      const lockoutDuration = 30 * 1000; 
      const lockUntil = Date.now() + lockoutDuration;
      localStorage.setItem('lockpass_lockout_until', lockUntil.toString());
      setLockoutTimeLeft(30);
      showToast('error', 'Salah PIN 3 kali! Brankas dikunci sementara selama 30 detik.');
    } else {
      showToast('error', `PIN salah! Percobaan gagal: ${nextAttempts}/5.`);
    }
  };

  // Monitor PIN length
  useEffect(() => {
    if (typedPin.length === 6) {
      handleUnlockWithPin(typedPin);
    }
  }, [typedPin]);

  // Lock vault back
  const handleLockVault = () => {
    setMasterPin('');
    setPasswords([]);
    setIsLocked(true);
    setTypedPin('');
    setRevealedPasswords({});
    showToast('info', 'Brankas telah dikunci kembali.');
  };

  // Reset entire vault - Requires current PIN & text confirmation
  const handleResetVault = () => {
    const confirmPin = window.prompt("Peringatan Kritis: Anda akan menghapus seluruh data password secara permanen.\n\nUntuk melanjutkan, masukkan PIN Brankas saat ini:");
    if (confirmPin === null) return;
    
    if (confirmPin === masterPin) {
      const confirmPhrase = window.prompt('Ketik "HAPUS PERMANEN" (huruf besar) untuk menghapus brankas:');
      if (confirmPhrase === "HAPUS PERMANEN") {
        localStorage.removeItem('lockpass_verify');
        localStorage.removeItem('lockpass_encrypted_data');
        localStorage.removeItem('lockpass_lockout_until');
        setPasswords([]);
        setMasterPin('');
        setHasMasterPinSet(false);
        setIsLocked(true);
        setTypedPin('');
        setFailedAttempts(0);
        showToast('warning', 'Brankas Anda telah direset total ke setelan awal.');
      } else {
        showToast('error', 'Frase konfirmasi salah! Reset brankas dibatalkan.');
      }
    } else {
      showToast('error', 'PIN salah! Reset brankas dibatalkan.');
    }
  };

  // Password generator logic
  const handleGeneratePassword = () => {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let pool = '';
    if (genOptions.uppercase) pool += uppercaseChars;
    if (genOptions.lowercase) pool += lowercaseChars;
    if (genOptions.numbers) pool += numberChars;
    if (genOptions.symbols) pool += symbolChars;

    if (!pool) {
      showToast('warning', 'Pilih minimal satu opsi karakter.');
      setGeneratedPass('');
      return;
    }

    let generated = '';
    for (let i = 0; i < genLength; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      generated += pool[idx];
    }
    setGeneratedPass(generated);
  };

  // Generate on load or option change
  useEffect(() => {
    if (activeTab === 'generator' || isModalOpen) {
      handleGeneratePassword();
    }
  }, [genLength, genOptions, activeTab]);

  // Insert generated password into Add/Edit form
  const applyGeneratedPassword = () => {
    if (!generatedPass) return;
    setFormData(prev => ({ ...prev, password: generatedPass }));
    showToast('success', 'Password hasil generator diterapkan ke form.');
  };

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Kosong', class: 'weak' };
    let score = 0;
    
    // Length checks
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (pass.length >= 16) score += 1;
    
    // Character type checks
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 3) {
      return { score, label: 'Lemah ⚠️', class: 'weak' };
    } else if (score <= 5) {
      return { score, label: 'Sedang 🛡️', class: 'medium' };
    } else {
      return { score, label: 'Kuat 🔥', class: 'strong' };
    }
  };

  // Toggle visible password
  const toggleRevealPassword = (id) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Create / Edit operations
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      url: '',
      username: '',
      password: '',
      category: 'Media Sosial',
      notes: ''
    });
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let pool = uppercaseChars + lowercaseChars + numberChars + symbolChars;
    let generated = '';
    for (let i = 0; i < 16; i++) {
      generated += pool[Math.floor(Math.random() * pool.length)];
    }
    setFormData(prev => ({ ...prev, password: generated }));
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      url: item.url,
      username: item.username,
      password: item.password,
      category: item.category || 'Lainnya',
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.username || !formData.password) {
      showToast('error', 'Nama Layanan, Username, dan Password wajib diisi.');
      return;
    }

    let updatedPasswords;
    if (editingItem) {
      updatedPasswords = passwords.map(item => 
        item.id === editingItem.id 
          ? { 
              ...item, 
              ...formData, 
              updatedAt: new Date().toISOString() 
            } 
          : item
      );
      showToast('success', 'Akun berhasil diperbarui.');
    } else {
      const newItem = {
        id: 'pass_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedPasswords = [newItem, ...passwords];
      showToast('success', 'Akun baru ditambahkan ke brankas.');
    }

    setPasswords(updatedPasswords);
    saveVaultToLocalStorage(updatedPasswords);
    setIsModalOpen(false);
  };

  // Delete Password - REQUIRES PIN confirmation
  const handleDeletePassword = (id, title) => {
    const confirmPin = window.prompt(`Keamanan Tambahan: Masukkan PIN Brankas untuk menghapus password "${title}":`);
    if (confirmPin === null) return;
    
    if (confirmPin === masterPin) {
      const updatedPasswords = passwords.filter(item => item.id !== id);
      setPasswords(updatedPasswords);
      saveVaultToLocalStorage(updatedPasswords);
      showToast('success', `Password "${title}" berhasil dihapus.`);
    } else {
      showToast('error', 'PIN salah! Penghapusan akun dibatalkan.');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Export Encrypted Backup - REQUIRES PIN verification
  const handleExportData = () => {
    const confirmPin = window.prompt("Keamanan Tambahan: Masukkan PIN Brankas Anda untuk melakukan ekspor data:");
    if (confirmPin === null) return;
    
    if (confirmPin === masterPin) {
      try {
        const encryptedData = localStorage.getItem('lockpass_encrypted_data') || '';
        const backupPayload = {
          app: 'LockPass',
          version: '1.0',
          timestamp: new Date().toISOString(),
          verify: localStorage.getItem('lockpass_verify'),
          vault: encryptedData
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `lockpass_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('success', 'Backup brankas berhasil diekspor!');
      } catch (error) {
        showToast('error', 'Gagal mengekspor data.');
      }
    } else {
      showToast('error', 'PIN salah! Ekspor data dibatalkan.');
    }
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedJson = JSON.parse(event.target.result);
        
        if (importedJson.app !== 'LockPass' || !importedJson.verify || !importedJson.vault) {
          showToast('error', 'Format file cadangan LockPass tidak valid.');
          return;
        }

        if (window.confirm("Mengimpor data baru akan menimpa seluruh data password saat ini. Apakah Anda yakin?")) {
          localStorage.setItem('lockpass_verify', importedJson.verify);
          localStorage.setItem('lockpass_encrypted_data', importedJson.vault);
          
          setHasMasterPinSet(true);
          setIsLocked(true);
          setMasterPin('');
          setPasswords([]);
          setTypedPin('');
          setFailedAttempts(0);
          
          showToast('success', 'Data cadangan diimpor! Masukkan PIN dari cadangan untuk membuka.');
        }
      } catch (err) {
        showToast('error', 'Gagal memproses file JSON cadangan.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const auditAnalysis = () => {
    const weakList = [];
    const reusedMap = {};
    const reusedList = [];

    passwords.forEach(item => {
      const strength = getPasswordStrength(item.password);
      if (strength.class === 'weak') {
        weakList.push(item);
      }

      if (item.password) {
        if (!reusedMap[item.password]) {
          reusedMap[item.password] = [];
        }
        reusedMap[item.password].push(item);
      }
    });

    Object.keys(reusedMap).forEach(pass => {
      if (reusedMap[pass].length > 1) {
        reusedList.push({
          password: pass,
          accounts: reusedMap[pass]
        });
      }
    });

    let totalScore = 100;
    if (passwords.length > 0) {
      const weakDeduction = (weakList.length / passwords.length) * 40;
      const reusedCount = reusedList.reduce((acc, curr) => acc + curr.accounts.length, 0);
      const reusedDeduction = (reusedCount / passwords.length) * 60;
      totalScore = Math.max(0, Math.round(100 - (weakDeduction + reusedDeduction)));
    }

    return {
      score: totalScore,
      weakList,
      reusedList
    };
  };

  const auditData = auditAnalysis();
  const totalCount = passwords.length;
  const strongCount = passwords.filter(item => getPasswordStrength(item.password).class === 'strong').length;
  const weakCount = passwords.filter(item => getPasswordStrength(item.password).class === 'weak').length;
  const reusedAlertCount = auditData.reusedList.reduce((acc, curr) => acc + curr.accounts.length, 0);

  const getFilteredPasswords = () => {
    let result = [...passwords];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.username && item.username.toLowerCase().includes(q)) ||
        (item.url && item.url.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'Semua') {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'security') {
      result.sort((a, b) => {
        const scoreA = getPasswordStrength(a.password).score;
        const scoreB = getPasswordStrength(b.password).score;
        return scoreA - scoreB;
      });
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  };

  const filteredPasswords = getFilteredPasswords();

  const getServiceColor = (title) => {
    if (!title) return '#6366f1';
    const firstLetter = title.toLowerCase()[0];
    const colors = {
      a: '#e11d48', b: '#2563eb', c: '#0891b2', d: '#ea580c', e: '#16a34a',
      f: '#1d4ed8', g: '#db4437', h: '#1e1b4b', i: '#c084fc', j: '#0d9488',
      k: '#4f46e5', l: '#059669', m: '#e11d48', n: '#4338ca', o: '#ea580c',
      p: '#ec4899', q: '#7c3aed', r: '#e11d48', s: '#16a34a', t: '#2563eb',
      u: '#4f46e5', v: '#0891b2', w: '#0284c7', x: '#0f172a', y: '#ca8a04',
      z: '#b91c1c'
    };
    return colors[firstLetter] || '#6366f1';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const cleanUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const handlePinContainerClick = () => {
    if (pinInputRef.current && lockoutTimeLeft <= 0) {
      pinInputRef.current.focus();
    }
  };

  return (
    <div className="app-layout">
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' && <ShieldCheck size={18} />}
            {toast.type === 'error' && <ShieldAlert size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* LOCK SCREEN */}
      {isLocked ? (
        <div className="lock-container">
          {!hasMasterPinSet ? (
            /* SETUP NEW PIN (DISPLAYED ON FIRST RUN) */
            <div className="lock-card animate-scale">
              <div className="lock-logo-wrapper">
                <Shield size={32} />
              </div>
              <h2 className="lock-title">Buat PIN LockPass Baru</h2>
              <p className="lock-desc">
                Penyimpanan lokal belum terenkripsi. Silakan buat 6 digit PIN untuk mengunci brankas pribadi Anda.
              </p>
              
              <form onSubmit={handleSetupPin}>
                <div className="form-group">
                  <label className="form-label">PIN Baru (6 Digit Angka)</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Lock size={18} /></span>
                    <input 
                      type="password" 
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-input" 
                      placeholder="Masukkan 6 angka PIN..."
                      value={setupPin}
                      onChange={(e) => setSetupPin(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Konfirmasi PIN Baru</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Lock size={18} /></span>
                    <input 
                      type="password" 
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-input" 
                      placeholder="Ketik ulang PIN..."
                      value={confirmSetupPin}
                      onChange={(e) => setConfirmSetupPin(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                  <Key size={18} /> Simpan PIN & Buka Brankas
                </button>
              </form>
              
              <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                🔒 <strong>Penting:</strong> LockPass tidak mengirim data Anda ke server manapun. Jika PIN dilupakan, data brankas Anda tidak bisa dibuka kembali.
              </div>
            </div>
          ) : (
            /* UNLOCK VAULT SCREEN */
            <div className="lock-card animate-scale">
              <div className="lock-logo-wrapper">
                <Lock size={32} />
              </div>
              <h2 className="lock-title">LockPass Terkunci</h2>
              <p className="lock-desc">
                {lockoutTimeLeft > 0 
                  ? "Cobalah beberapa saat lagi." 
                  : "Masukkan 6 digit PIN untuk mendekripsi dan membuka brankas Anda."}
              </p>
              
              {lockoutTimeLeft > 0 ? (
                /* LOCKOUT ACTIVE CONTAINER */
                <div style={{ 
                  background: 'rgba(244, 63, 94, 0.1)', 
                  border: '1px solid rgba(244, 63, 94, 0.2)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '20px', 
                  margin: '24px 0', 
                  textAlign: 'center' 
                }}>
                  <AlertTriangle size={24} style={{ color: 'var(--accent-rose)', marginBottom: '8px' }} />
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px' }}>Brankas Dikunci Sementara</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                    Terlalu banyak percobaan PIN salah. Silakan tunggu:
                  </div>
                  <div style={{ fontSize: '28px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '10px' }}>
                    {Math.floor(lockoutTimeLeft / 60)}:{String(lockoutTimeLeft % 60).padStart(2, '0')}
                  </div>
                </div>
              ) : (
                /* PIN BOXES CONTAINER */
                <div style={{ position: 'relative' }}>
                  <div 
                    className="pin-input-container" 
                    onClick={handlePinContainerClick}
                  >
                    <input
                      ref={pinInputRef}
                      type="password"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      value={typedPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setTypedPin(val);
                      }}
                      onFocus={() => setIsPinInputFocused(true)}
                      onBlur={() => setIsPinInputFocused(false)}
                      className="pin-hidden-input"
                      autoFocus
                    />
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const char = typedPin[idx] || '';
                      const isFocused = isPinInputFocused && typedPin.length === idx;
                      return (
                        <div 
                          key={idx} 
                          className={`pin-box ${char ? 'filled' : ''} ${isFocused ? 'focused' : ''}`}
                        >
                          {char ? '•' : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                🛡️ Brute-force protection aktif. Salah memasukkan PIN berulang kali akan memicu penguncian waktu.
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VAULT DASHBOARD */
        <div className="app-container">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="sidebar">
            <a href="#" className="sidebar-brand">
              <Shield className="brand-icon" size={26} />
              <span>LockPass<span style={{color: 'var(--primary)', fontSize: '24px'}}>.</span></span>
            </a>

            <nav className="sidebar-nav">
              <button 
                onClick={() => setActiveTab('vault')}
                className={`nav-item ${activeTab === 'vault' ? 'active' : ''}`}
              >
                <Key size={18} />
                <span>Semua Password</span>
              </button>

              <button 
                onClick={() => setActiveTab('generator')}
                className={`nav-item ${activeTab === 'generator' ? 'active' : ''}`}
              >
                <RefreshCw size={18} />
                <span>Password Generator</span>
              </button>

              <button 
                onClick={() => setActiveTab('audit')}
                className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
              >
                <ShieldAlert size={18} />
                <span>Audit Keamanan</span>
                {weakCount + (reusedAlertCount > 0 ? 1 : 0) > 0 && (
                  <span style={{ 
                    marginLeft: 'auto', 
                    background: 'var(--accent-rose)', 
                    color: 'white', 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: '99px',
                    fontWeight: 700
                  }}>
                    {weakCount + (reusedAlertCount > 0 ? 1 : 0)}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('backup')}
                className={`nav-item ${activeTab === 'backup' ? 'active' : ''}`}
              >
                <Download size={18} />
                <span>Cadangkan & Impor</span>
              </button>
            </nav>

            <div className="sidebar-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--accent-emerald)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent-emerald)' }}></div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Enkripsi AES-256 Aktif</span>
              </div>
              <button onClick={handleLockVault} className="btn btn-secondary" style={{ width: '100%' }}>
                <LogOut size={16} /> Kunci Vault
              </button>
            </div>
          </aside>

          {/* MAIN PAGE AREA */}
          <main className="main-content">
            
            {/* VIEW TAB 1: PASSWORD LIST VAULT */}
            {activeTab === 'vault' && (
              <div className="animate-fade">
                <div className="main-header">
                  <div className="page-title-group">
                    <h1>Brankas Sandi Anda</h1>
                    <p>Simpan dan kelola seluruh password akun digital Anda dengan aman secara lokal.</p>
                  </div>
                  <div className="header-actions">
                    <button onClick={openAddModal} className="btn btn-primary">
                      <Plus size={18} /> Tambah Akun
                    </button>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="stats-grid">
                  <div className="stat-card total">
                    <div className="stat-icon">
                      <Key size={20} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{totalCount}</span>
                      <span className="stat-label">Total Akun</span>
                    </div>
                  </div>

                  <div className="stat-card strong">
                    <div className="stat-icon">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{strongCount}</span>
                      <span className="stat-label">Sandi Kuat</span>
                    </div>
                  </div>

                  <div className="stat-card weak">
                    <div className="stat-icon">
                      <ShieldAlert size={20} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{weakCount}</span>
                      <span className="stat-label">Sandi Lemah</span>
                    </div>
                  </div>

                  <div className="stat-card alerts">
                    <div className="stat-icon">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-value">{reusedAlertCount}</span>
                      <span className="stat-label">Dipakai Ulang</span>
                    </div>
                  </div>
                </div>

                {/* Control Panel */}
                <div className="control-panel">
                  <div className="search-filter-row">
                    <div className="search-wrapper input-wrapper">
                      <span className="input-icon"><Search size={18} /></span>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Cari berdasarkan nama layanan, username, URL, atau catatan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', minWidth: '200px' }}>
                      <select 
                        className="form-input form-input-no-icon" 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ paddingRight: '28px', cursor: 'pointer' }}
                      >
                        <option value="latest">Terbaru Ditambahkan</option>
                        <option value="name">Nama Layanan (A-Z)</option>
                        <option value="security">Tingkat Keamanan (Terlemah)</option>
                      </select>
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="category-scroll">
                    {['Semua', 'Media Sosial', 'Keuangan', 'Pekerjaan', 'Personal', 'Lainnya'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vault Grid Records */}
                {filteredPasswords.length > 0 ? (
                  <div className="vault-grid">
                    {filteredPasswords.map((item) => {
                      const strength = getPasswordStrength(item.password);
                      const isRevealed = !!revealedPasswords[item.id];
                      
                      return (
                        <div key={item.id} className="vault-card animate-fade">
                          <div>
                            <div className="card-header">
                              <div className="service-badge">
                                <div 
                                  className="service-icon-placeholder" 
                                  style={{ backgroundColor: getServiceColor(item.title) }}
                                >
                                  {item.title ? item.title.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="service-info">
                                  <span className="service-title">{item.title}</span>
                                  <span className="service-cat">{item.category || 'Lainnya'}</span>
                                </div>
                              </div>
                              
                              <div className="card-actions">
                                <button 
                                  onClick={() => openEditModal(item)} 
                                  className="btn-icon" 
                                  title="Edit Akun"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePassword(item.id, item.title)} 
                                  className="btn-icon" 
                                  style={{ color: '#fda4af' }}
                                  title="Hapus Sandi"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="card-body">
                              <div className="credential-row">
                                <span className="credential-label">User</span>
                                <span className="credential-value" title={item.username}>
                                  {item.username}
                                </span>
                                <button 
                                  onClick={() => handleCopyToClipboard(item.username, item.id, 'username')}
                                  className="credential-btn"
                                  title="Salin Username"
                                >
                                  {copiedStates[`${item.id}_username`] ? <Check size={13} style={{color: 'var(--accent-emerald)'}} /> : <Copy size={13} />}
                                </button>
                              </div>

                              <div className="credential-row">
                                <span className="credential-label">Sandi</span>
                                <span className="credential-value password-text">
                                  {isRevealed ? item.password : '••••••••••••••••'}
                                </span>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  <button 
                                    onClick={() => toggleRevealPassword(item.id)}
                                    className="credential-btn"
                                    title={isRevealed ? "Sembunyikan" : "Tampilkan"}
                                  >
                                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                  </button>
                                  <button 
                                    onClick={() => handleCopyToClipboard(item.password, item.id, 'password')}
                                    className="credential-btn"
                                    title="Salin Sandi"
                                  >
                                    {copiedStates[`${item.id}_password`] ? <Check size={13} style={{color: 'var(--accent-emerald)'}} /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            {item.notes && (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: '12px' }}>
                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>Catatan:</div>
                                {item.notes}
                              </div>
                            )}

                            <div className="card-footer">
                              <span className={`strength-tag ${strength.class}`}>
                                {strength.label}
                              </span>
                              
                              {item.url ? (
                                <a 
                                  href={cleanUrl(item.url)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="card-link"
                                >
                                  Kunjungi <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>M. Diperbarui: {formatDate(item.updatedAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Search size={28} />
                    </div>
                    <h3 className="empty-title">Tidak Ada Hasil</h3>
                    <p className="empty-desc">
                      {passwords.length === 0 
                        ? "Anda belum menyimpan password apapun di dalam brankas."
                        : "Tidak ada data password yang cocok dengan pencarian atau filter Anda."}
                    </p>
                    {passwords.length === 0 && (
                      <button onClick={openAddModal} className="btn btn-primary">
                        <Plus size={16} /> Buat Password Pertama Anda
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}


            {/* VIEW TAB 2: PASSWORD GENERATOR */}
            {activeTab === 'generator' && (
              <div className="animate-fade" style={{ maxWidth: '640px', margin: '0 auto' }}>
                <div className="main-header">
                  <div className="page-title-group">
                    <h1>Password Generator</h1>
                    <p>Buat password yang kuat, acak, dan sulit didebak untuk meningkatkan keamanan akun Anda.</p>
                  </div>
                </div>

                <div className="generator-box">
                  <div className="generator-preview-row">
                    <div className="generator-preview">
                      <span className="password-text" style={{ wordBreak: 'break-all', fontSize: '18px' }}>
                        {generatedPass || "Klik tombol untuk generate"}
                      </span>
                      {generatedPass && (
                        <button 
                          onClick={() => handleCopyToClipboard(generatedPass, 'gen', 'password')}
                          className="btn-icon"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                          title="Salin Sandi Baru"
                        >
                          {copiedStates['gen_password'] ? <Check size={16} style={{color: 'var(--accent-emerald)'}} /> : <Copy size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="generator-settings">
                    <div className="generator-row">
                      <span className="generator-label">Panjang Password</span>
                      <div className="slider-wrapper">
                        <input 
                          type="range" 
                          min="8" 
                          max="32" 
                          className="range-slider"
                          value={genLength}
                          onChange={(e) => setGenLength(parseInt(e.target.value))}
                        />
                        <span className="slider-val">{genLength}</span>
                      </div>
                    </div>

                    <div className="generator-row" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                      <span className="generator-label">Huruf Besar (A-Z)</span>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={genOptions.uppercase}
                          onChange={(e) => setGenOptions(prev => ({ ...prev, uppercase: e.target.checked }))}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="generator-row">
                      <span className="generator-label">Huruf Kecil (a-z)</span>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={genOptions.lowercase}
                          onChange={(e) => setGenOptions(prev => ({ ...prev, lowercase: e.target.checked }))}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="generator-row">
                      <span className="generator-label">Angka (0-9)</span>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={genOptions.numbers}
                          onChange={(e) => setGenOptions(prev => ({ ...prev, numbers: e.target.checked }))}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="generator-row" style={{ paddingBottom: '8px' }}>
                      <span className="generator-label">Karakter Khusus (!@#$...)</span>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={genOptions.symbols}
                          onChange={(e) => setGenOptions(prev => ({ ...prev, symbols: e.target.checked }))}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={handleGeneratePassword} 
                        className="btn btn-primary"
                        style={{ flexGrow: 1 }}
                      >
                        <RefreshCw size={16} /> Acak Ulang
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-lg)', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} /> Rekomendasi Keamanan Siber
                  </div>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>Disarankan menggunakan minimal <strong>12-16 karakter</strong> untuk menjaga kebal enkripsi brute-force.</li>
                    <li>Jangan pernah menggunakan kembali (re-use) satu password di beberapa situs web yang berbeda.</li>
                    <li>Aktifkan <strong>Autentikasi Dua Faktor (2FA)</strong> pada layanan penting seperti email, keuangan, dan sosial media.</li>
                  </ul>
                </div>
              </div>
            )}


            {/* VIEW TAB 3: SECURITY AUDIT */}
            {activeTab === 'audit' && (
              <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="main-header">
                  <div className="page-title-group">
                    <h1>Audit Keamanan Brankas</h1>
                    <p>Menganalisis password Anda secara instan untuk mendeteksi kerentanan potensial.</p>
                  </div>
                </div>

                {passwords.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Shield size={28} /></div>
                    <h3 className="empty-title">Tidak Ada Data Audit</h3>
                    <p className="empty-desc">Simpan password terlebih dahulu ke dalam brankas untuk melakukan analisis keamanan.</p>
                    <button onClick={openAddModal} className="btn btn-primary"><Plus size={16} /> Tambah Akun</button>
                  </div>
                ) : (
                  <div>
                    {/* Security Score Meter */}
                    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', marginBottom: '32px', gap: '16px', textAlign: 'center' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                        <div style={{ 
                          width: '120px', 
                          height: '120px', 
                          borderRadius: '50%', 
                          background: `conic-gradient(${auditData.score > 75 ? 'var(--accent-emerald)' : auditData.score > 40 ? 'var(--accent-amber)' : 'var(--accent-rose)'} ${auditData.score}%, rgba(255,255,255,0.05) 0)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.6)'
                        }}>
                          <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <span style={{ fontSize: '28px', fontWeight: 800 }}>{auditData.score}</span>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Skor Vault</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                          Status Keamanan: {auditData.score >= 80 ? "Sangat Aman ✨" : auditData.score >= 50 ? "Perlu Peningkatan ⚠️" : "Bahaya 🚨"}
                        </h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '480px' }}>
                          {auditData.score >= 80 
                            ? "Brankas Anda memiliki tingkat pertahanan yang sangat baik. Pertahankan!" 
                            : "Beberapa password Anda dinilai lemah atau digunakan di banyak tempat. Segera ganti demi keamanan."}
                        </p>
                      </div>
                    </div>

                    <div className="audit-list">
                      {/* Section 1: Reused Passwords */}
                      <div className={`audit-item ${auditData.reusedList.length > 0 ? 'warning' : ''}`}>
                        <div className="audit-icon">
                          {auditData.reusedList.length > 0 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
                        </div>
                        <div className="audit-content">
                          <h3 className="audit-title">Password yang Dipakai Ulang</h3>
                          <p className="audit-desc">
                            {auditData.reusedList.length > 0 
                              ? `Ditemukan ${auditData.reusedList.length} kelompok password yang dipakai bersama di beberapa akun. Peretas yang berhasil membobol satu akun dapat mengakses akun lainnya.`
                              : 'Hebat! Tidak ada password yang Anda gunakan berulang kali.'}
                          </p>
                          
                          {auditData.reusedList.length > 0 && (
                            <div className="audit-badged-items">
                              {auditData.reusedList.map((group, idx) => (
                                <div key={idx} style={{ 
                                  background: 'rgba(245, 158, 11, 0.05)', 
                                  border: '1px solid rgba(245, 158, 11, 0.2)', 
                                  borderRadius: 'var(--radius-md)', 
                                  padding: '12px',
                                  width: '100%',
                                  marginTop: '8px'
                                }}>
                                  <div style={{ fontSize: '12px', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '6px' }}>
                                    Password: <span style={{ fontFamily: 'var(--font-mono)' }}>{group.password.charAt(0) + '•'.repeat(group.password.length - 2) + group.password.slice(-1)}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {group.accounts.map(acc => (
                                      <span key={acc.id} className="audit-badge">
                                        <strong>{acc.title}</strong> ({acc.username})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Weak Passwords */}
                      <div className={`audit-item ${auditData.weakList.length > 0 ? 'danger' : ''}`}>
                        <div className="audit-icon">
                          {auditData.weakList.length > 0 ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                        </div>
                        <div className="audit-content">
                          <h3 className="audit-title">Password Lemah (Kurang Aman)</h3>
                          <p className="audit-desc">
                            {auditData.weakList.length > 0 
                              ? `Ditemukan ${auditData.weakList.length} password yang sangat lemah. Password di bawah ini mudah ditebak melalui serangan dictionary atau brute-force.`
                              : 'Bagus! Seluruh password Anda memiliki kriteria kekuatan sedang hingga sangat kuat.'}
                          </p>

                          {auditData.weakList.length > 0 && (
                            <div className="audit-badged-items" style={{ gap: '8px', marginTop: '10px' }}>
                              {auditData.weakList.map(item => (
                                <div key={item.id} className="audit-badge" style={{ padding: '8px 12px', justifyContent: 'space-between', width: '100%', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                  <div>
                                    <strong>{item.title}</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>({item.username})</span>
                                  </div>
                                  <button onClick={() => openEditModal(item)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                    Perbarui Sandi
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* VIEW TAB 4: BACKUP & RESTORE */}
            {activeTab === 'backup' && (
              <div className="animate-fade" style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div className="main-header">
                  <div className="page-title-group">
                    <h1>Cadangkan & Pulihkan Vault</h1>
                    <p>Ekspor brankas Anda sebagai file terenkripsi untuk cadangan di luar browser, atau impor kembali di sini.</p>
                  </div>
                </div>

                <div className="stat-card" style={{ display: 'block', padding: '24px', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={16} style={{ color: 'var(--primary)' }} /> Keamanan Ekspor/Impor Data
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    File cadangan (.json) yang Anda ekspor dari LockPass akan tetap terenkripsi menggunakan <strong>PIN Anda saat ini (AES-256)</strong>. Data tersebut aman disimpan karena tidak dapat dibuka tanpa mengetahui kunci 6 digit PIN Anda.
                  </p>
                </div>

                <div className="backup-zone">
                  <div onClick={handleExportData} className="backup-card">
                    <div className="backup-card-icon">
                      <Download size={24} />
                    </div>
                    <div className="backup-card-title">Ekspor Cadangan</div>
                    <div className="backup-card-desc">
                      Unduh file cadangan terenkripsi (.json) yang berisi seluruh sandi Anda di aplikasi ini. (Memerlukan konfirmasi PIN)
                    </div>
                  </div>

                  <div onClick={() => fileInputRef.current && fileInputRef.current.click()} className="backup-card">
                    <div className="backup-card-icon">
                      <Upload size={24} />
                    </div>
                    <div className="backup-card-title">Impor Cadangan</div>
                    <div className="backup-card-desc">
                      Unggah file cadangan LockPass (.json) untuk memulihkan password Anda di browser ini.
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="file-input-hidden" 
                      accept=".json"
                      onChange={handleImportData}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-light)', paddingTop: '24px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--accent-rose)', fontWeight: 700, marginBottom: '8px' }}>Zona Bahaya</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', maxWidth: '440px', margin: '0 auto 16px' }}>
                    Menyetel ulang brankas akan menghapus seluruh data password yang tersimpan secara lokal dan menghapus setelan PIN di browser ini.
                  </p>
                  <button onClick={handleResetVault} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Sapu Bersih Semua Data Vault
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* FLOATING CREATION / EDITING FORM MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale">
            
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? 'Edit Informasi Akun' : 'Tambah Akun Sandi Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                
                {/* Service Title */}
                <div className="form-group">
                  <label className="form-label">Nama Layanan / Situs</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Globe size={16} /></span>
                    <input 
                      type="text" 
                      name="title"
                      className="form-input" 
                      placeholder="Contoh: Instagram, Gmail, Tokopedia..."
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* URL */}
                <div className="form-group">
                  <label className="form-label">URL Website</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Globe size={16} /></span>
                    <input 
                      type="text" 
                      name="url"
                      className="form-input" 
                      placeholder="Contoh: https://instagram.com..."
                      value={formData.url}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Username / Email */}
                <div className="form-group">
                  <label className="form-label">Username atau Email</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={16} /></span>
                    <input 
                      type="text" 
                      name="username"
                      className="form-input" 
                      placeholder="Username atau email login..."
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Password field with toggle & strength bar */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between' }}>
                    <span>Password</span>
                    <span style={{ fontSize: '11px', textTransform: 'none' }}>
                      Kekuatan: {getPasswordStrength(formData.password).label}
                    </span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Lock size={16} /></span>
                    <input 
                      type="text" 
                      name="password"
                      className="form-input" 
                      placeholder="Ketik password..."
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      style={{ paddingRight: '48px' }}
                    />
                  </div>
                  {formData.password && (
                    <div className="strength-indicator-bar">
                      <div className={`strength-fill ${getPasswordStrength(formData.password).class}`} />
                    </div>
                  )}
                </div>

                {/* Password Generator Helper */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '12px 14px', 
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Butuh Sandi Kuat?</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hasil generator: {generatedPass ? generatedPass.slice(0, 14) + '...' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      type="button" 
                      onClick={handleGeneratePassword} 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                    >
                      <RefreshCw size={11} /> Generate
                    </button>
                    <button 
                      type="button" 
                      onClick={applyGeneratedPassword} 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      disabled={!generatedPass}
                    >
                      Pakai Sandi
                    </button>
                  </div>
                </div>

                {/* Category Selector */}
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Folder size={16} /></span>
                    <select 
                      name="category"
                      className="form-input" 
                      value={formData.category}
                      onChange={handleInputChange}
                      style={{ appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="Media Sosial">Media Sosial</option>
                      <option value="Keuangan">Keuangan</option>
                      <option value="Pekerjaan">Pekerjaan</option>
                      <option value="Personal">Personal</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    <span style={{ position: 'absolute', right: '14px', pointerEvents: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      <ChevronDown size={16} />
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Catatan Tambahan (Opsional)</label>
                  <textarea 
                    name="notes"
                    className="form-input form-input-no-icon" 
                    placeholder="Masukkan detail tambahan..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Simpan Akun
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
