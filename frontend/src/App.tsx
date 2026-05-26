import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Key,
  Terminal,
  BookOpen,
  CreditCard,
  LogOut,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  Loader2,
  Zap,
  FileText,
  Camera,
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const API_BASE = 'http://localhost:5000';

interface User {
  id: string;
  email: string;
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'SCALE';
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
}

interface RecentRequest {
  id: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
}

interface AnalyticsData {
  metrics: {
    totalRequests: number;
    avgLatency: number;
    successRate: number;
  };
  chartData: Array<{
    date: string;
    Scrape: number;
    Screenshot: number;
    PDF: number;
  }>;
  recentRequests: RecentRequest[];
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('omni_token'));
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'playground' | 'docs' | 'pricing'>('overview');
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // API Keys State
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [keysLoading, setKeysLoading] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Playground State
  const [pgKey, setPgKey] = useState('');
  const [pgUrl, setPgUrl] = useState('https://example.com');
  const [pgAction, setPgAction] = useState<'scrape' | 'screenshot' | 'pdf'>('scrape');
  const [pgLoading, setPgLoading] = useState(false);
  const [pgResult, setPgResult] = useState<any>(null);
  const [pgResponseHeaders, setPgResponseHeaders] = useState<Record<string, string>>({});
  const [pgStatus, setPgStatus] = useState<number | null>(null);
  const [pgLatency, setPgLatency] = useState<number | null>(null);

  // Documentation code language
  const [docLang, setDocLang] = useState<'curl' | 'js' | 'python'>('curl');

  // Copy status animations
  const [copiedRawKey, setCopiedRawKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load user profile and analytics when token is available
  useEffect(() => {
    if (token) {
      localStorage.setItem('omni_token', token);
      fetchUserData();
      fetchKeys();
      fetchAnalytics();
    } else {
      localStorage.removeItem('omni_token');
      setUser(null);
    }
  }, [token]);

  // Refresh analytics periodically when on overview page
  useEffect(() => {
    if (token && activeTab === 'overview') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKeys = async () => {
    setKeysLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
        if (data.length > 0 && !pgKey) {
          // pre-select first key in playground
          setPgKey(data[0].keyPrefix); // Note: we'll check it in selection list
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setKeysLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? 'login' : 'register';
    try {
      const res = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
      } else {
        setAuthError(data.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setAuthError('Cannot reach the API server. Make sure the backend is running.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@company.com');
    setPassword('password123');
    setAuthError('');
    setAuthLoading(true);

    try {
      // Try registering first, if user exists, just log in
      let res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@company.com', password: 'password123' }),
      });
      
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'demo@company.com', password: 'password123' }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
      } else {
        setAuthError(data.error || 'Demo login failed.');
      }
    } catch (err) {
      setAuthError('Cannot reach the API server. Make sure the backend is running.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('omni_token');
    setUser(null);
    setKeys([]);
    setAnalytics(null);
    setCreatedRawKey(null);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedRawKey(data.key);
        setNewKeyName('');
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? All applications using it will lose access.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPlan = async (plan: 'FREE' | 'STARTER' | 'GROWTH' | 'SCALE') => {
    try {
      const res = await fetch(`${API_BASE}/api/user/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => (prev ? { ...prev, plan: data.plan } : null));
        alert(`Successfully upgraded to the ${plan} plan! (Demo simulation)`);
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runPlaygroundRequest = async () => {
    if (!pgKey) {
      alert('Please create and copy an API key first.');
      return;
    }
    if (!pgUrl) {
      alert('Please provide a URL.');
      return;
    }

    setPgLoading(true);
    setPgResult(null);
    setPgStatus(null);
    setPgLatency(null);

    const startTime = Date.now();
    const endpointMap = {
      scrape: `/v1/scrape?url=${encodeURIComponent(pgUrl)}`,
      screenshot: `/v1/screenshot?url=${encodeURIComponent(pgUrl)}`,
      pdf: `/v1/pdf?url=${encodeURIComponent(pgUrl)}`,
    };

    try {
      const res = await fetch(`${API_BASE}${endpointMap[pgAction]}`, {
        headers: {
          'X-API-Key': pgKey,
        },
      });

      setPgStatus(res.status);
      setPgLatency(Date.now() - startTime);

      // Read response headers
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      setPgResponseHeaders(headers);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setPgResult({ error: res.statusText, message: json.message || 'Request failed.' });
        return;
      }

      if (pgAction === 'scrape') {
        const data = await res.json();
        setPgResult(data);
      } else if (pgAction === 'screenshot') {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPgResult({ type: 'image', url: objectUrl });
      } else if (pgAction === 'pdf') {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPgResult({ type: 'pdf', url: objectUrl });
      }
    } catch (error: any) {
      setPgStatus(500);
      setPgResult({ error: 'Request Failed', message: error.message || 'Network error.' });
    } finally {
      setPgLoading(false);
    }
  };

  const copyToClipboard = (text: string, isRawKey = false, isCode = false) => {
    navigator.clipboard.writeText(text);
    if (isRawKey) {
      setCopiedRawKey(true);
      setTimeout(() => setCopiedRawKey(false), 2000);
    } else if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Generate code block code string based on language
  const getDocCode = () => {
    const activeKeyVal = keys.length > 0 ? 'os_your_api_key_here' : 'YOUR_API_KEY';
    const cleanUrl = pgUrl || 'https://example.com';
    
    if (docLang === 'curl') {
      if (pgAction === 'scrape') {
        return `curl -X GET "${API_BASE}/v1/scrape?url=${encodeURIComponent(cleanUrl)}"\n  -H "X-API-Key: ${activeKeyVal}"`;
      } else if (pgAction === 'screenshot') {
        return `curl -X GET "${API_BASE}/v1/screenshot?url=${encodeURIComponent(cleanUrl)}"\n  -H "X-API-Key: ${activeKeyVal}"\n  --output screenshot.png`;
      } else {
        return `curl -X GET "${API_BASE}/v1/pdf?url=${encodeURIComponent(cleanUrl)}"\n  -H "X-API-Key: ${activeKeyVal}"\n  --output document.pdf`;
      }
    }
    
    if (docLang === 'js') {
      if (pgAction === 'scrape') {
        return `// Install Node-Fetch or run in modern browser
fetch("${API_BASE}/v1/scrape?url=${encodeURIComponent(cleanUrl)}", {
  headers: {
    "X-API-Key": "${activeKeyVal}"
  }
})
  .then(res => res.json())
  .then(data => console.log(data.markdown))
  .catch(err => console.error(err));`;
      } else if (pgAction === 'screenshot') {
        return `// Capture screenshot and save or display
fetch("${API_BASE}/v1/screenshot?url=${encodeURIComponent(cleanUrl)}", {
  headers: {
    "X-API-Key": "${activeKeyVal}"
  }
})
  .then(res => res.blob())
  .then(imageBlob => {
    const imageUrl = URL.createObjectURL(imageBlob);
    document.getElementById("preview").src = imageUrl;
  });`;
      } else {
        return `// Generate PDF document and download
fetch("${API_BASE}/v1/pdf?url=${encodeURIComponent(cleanUrl)}", {
  headers: {
    "X-API-Key": "${activeKeyVal}"
  }
})
  .then(res => res.blob())
  .then(pdfBlob => {
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "document.pdf";
    a.click();
  });`;
      }
    }

    if (docLang === 'python') {
      if (pgAction === 'scrape') {
        return `import requests

url = "${API_BASE}/v1/scrape"
headers = {
    "X-API-Key": "${activeKeyVal}"
}
params = {
    "url": "${cleanUrl}"
}

response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    data = response.json()
    print("Page Title:", data["title"])
    print("Markdown Content:\\n", data["markdown"])
else:
    print("Error:", response.status_code, response.text)`;
      } else if (pgAction === 'screenshot') {
        return `import requests

url = "${API_BASE}/v1/screenshot"
headers = {
    "X-API-Key": "${activeKeyVal}"
}
params = {
    "url": "${cleanUrl}"
}

response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    with open("screenshot.png", "wb") as file:
        file.write(response.content)
    print("Screenshot saved as screenshot.png")`;
      } else {
        return `import requests

url = "${API_BASE}/v1/pdf"
headers = {
    "X-API-Key": "${activeKeyVal}"
}
params = {
    "url": "${cleanUrl}"
}

response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    with open("document.pdf", "wb") as file:
        file.write(response.content)
    print("PDF saved as document.pdf")`;
      }
    }
    return '';
  };

  // Auth Screen Render
  if (!token) {
    return (
      <div className="auth-container">
        <div className="card auth-card card-glow">
          <div className="flex-center mb-3">
            <span className="logo" style={{ marginBottom: 0 }}>
              <Zap style={{ color: 'var(--secondary)' }} /> OmniScrape API
            </span>
          </div>

          <h2 className="mb-1 text-center" style={{ fontSize: '1.25rem' }}>
            {authMode === 'login' ? 'Welcome Back Developer' : 'Create Developer Account'}
          </h2>
          <p className="text-center mb-3" style={{ fontSize: '0.9rem' }}>
            {authMode === 'login' ? 'Sign in to access your API keys and analytics.' : 'Get started with 100 free requests per month.'}
          </p>

          {authError && (
            <div className="badge badge-red mb-2 w-full text-center" style={{ padding: '0.6rem' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex-col">
            <div className="flex-col" style={{ gap: '0.25rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
              />
            </div>
            <div className="flex-col" style={{ gap: '0.25rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={authLoading}>
              {authLoading ? <Loader2 className="animate-spin" size={18} /> : authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-3 flex-center flex-col" style={{ gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <a
                href="#"
                style={{ color: 'var(--secondary)', textDecoration: 'none' }}
                onClick={(e) => {
                  e.preventDefault();
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
              >
                {authMode === 'login' ? 'Create one' : 'Sign in'}
              </a>
            </span>

            <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', margin: '0.5rem 0' }}></div>

            <button
              onClick={handleDemoLogin}
              className="btn btn-secondary w-full glowing-accent"
              style={{ borderColor: 'var(--secondary)', display: 'flex', gap: '0.5rem' }}
            >
              <Zap size={16} style={{ color: 'var(--secondary)' }} />
              Quick Demo Login (Pre-filled)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo">
          <Zap size={22} style={{ color: 'var(--secondary)', fill: 'var(--secondary)' }} />
          <span>OmniScrape API</span>
        </div>

        <ul className="menu-list" style={{ flexGrow: 1 }}>
          <li
            className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </li>
          <li
            className={`menu-item ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
          >
            <Key size={18} />
            <span>API Keys</span>
          </li>
          <li
            className={`menu-item ${activeTab === 'playground' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('playground');
              if (keys.length > 0 && !pgKey) {
                // Pre-select a key when navigating to playground
                setPgKey(keys[0].id); // Wait, pgKey requires full key or key hash/prefix. Let's make sure they copy it.
              }
            }}
          >
            <Terminal size={18} />
            <span>API Playground</span>
          </li>
          <li
            className={`menu-item ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <BookOpen size={18} />
            <span>Documentation</span>
          </li>
          <li
            className={`menu-item ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <CreditCard size={18} />
            <span>Billing / Plan</span>
          </li>
        </ul>

        {/* User Card at bottom of Sidebar */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <div className="flex-col" style={{ gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </span>
            <div className="flex-between">
              <span className={`badge ${
                user?.plan === 'FREE' ? 'badge-blue' :
                user?.plan === 'STARTER' ? 'badge-purple' :
                user?.plan === 'GROWTH' ? 'badge-green' : 'badge-gold'
              }`}>
                {user?.plan} PLAN
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '6px' }}
                title="Sign Out"
              >
                <LogOut size={14} style={{ color: 'var(--error)' }} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Space */}
      <main className="main-content">
        
        {/* ====================================================
            TAB: OVERVIEW / DASHBOARD
            ==================================================== */}
        {activeTab === 'overview' && (
          <div>
            <div className="flex-between mb-3">
              <div>
                <h1>Developer Dashboard</h1>
                <p>Monitor API usage, traffic stats, and response metrics in real-time.</p>
              </div>
              <button onClick={fetchAnalytics} className="btn btn-secondary" disabled={analyticsLoading}>
                {analyticsLoading ? <Loader2 className="animate-spin" size={16} /> : 'Sync Data'}
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid-3 mb-3">
              <div className="card card-glow">
                <span className="flex-row" style={{ color: 'var(--primary)' }}>
                  <TrendingUp size={16} /> API Requests (30d)
                </span>
                <div className="stat-value">{analytics?.metrics?.totalRequests ?? 0}</div>
                <span className="stat-trend trend-up">
                  {user?.plan === 'FREE' ? 'Limit: 100/mo' : 
                   user?.plan === 'STARTER' ? 'Limit: 10,000/mo' :
                   user?.plan === 'GROWTH' ? 'Limit: 50,000/mo' : 'Limit: 250,000/mo'}
                </span>
              </div>
              <div className="card">
                <span className="flex-row" style={{ color: 'var(--secondary)' }}>
                  <Clock size={16} /> Avg. Latency
                </span>
                <div className="stat-value">
                  {analytics?.metrics?.avgLatency ?? 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>ms</span>
                </div>
                <span className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
                  Headless browser execution
                </span>
              </div>
              <div className="card">
                <span className="flex-row" style={{ color: 'var(--success)' }}>
                  <CheckCircle size={16} /> Success Rate
                </span>
                <div className="stat-value">{analytics?.metrics?.successRate ?? 100}%</div>
                <span className="stat-trend trend-up">All active endpoints</span>
              </div>
            </div>

            {/* Recharts Usage Graph */}
            <div className="card mb-3" style={{ padding: '1.5rem 1.5rem 0.5rem 1rem' }}>
              <h3 className="mb-2" style={{ paddingLeft: '1rem' }}>API Call Distribution</h3>
              <div style={{ width: '100%', height: 260 }}>
                {analytics && analytics.chartData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorScrape" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorScreenshot" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorPdf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--success)" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                      <Area type="monotone" dataKey="Scrape" stroke="var(--primary)" fillOpacity={1} fill="url(#colorScrape)" />
                      <Area type="monotone" dataKey="Screenshot" stroke="var(--secondary)" fillOpacity={1} fill="url(#colorScreenshot)" />
                      <Area type="monotone" dataKey="PDF" stroke="var(--success)" fillOpacity={1} fill="url(#colorPdf)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>
                    No request data recorded yet. Send a request using your API key to populate graphs.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Requests Table */}
            <div className="card">
              <h3 className="mb-2">Recent Requests</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Endpoint</th>
                      <th style={{ padding: '0.75rem 1rem' }}>HTTP Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Response Time</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics && analytics.recentRequests.length > 0 ? (
                      analytics.recentRequests.map((req) => (
                        <tr key={req.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>{req.endpoint}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className={`badge ${req.statusCode < 300 ? 'badge-green' : 'badge-red'}`}>
                              {req.statusCode} {req.statusCode < 300 ? 'OK' : 'ERR'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>{req.responseTimeMs} ms</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                            {new Date(req.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No recent logs. Try triggering the API in the Playground tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: API KEYS MANAGER
            ==================================================== */}
        {activeTab === 'keys' && (
          <div>
            <h1>API Keys</h1>
            <p className="mb-3">Generate secret API tokens to authorize requests sent to the scraping engine.</p>

            <div className="grid-1-2">
              {/* Create new key card */}
              <div className="card card-glow" style={{ height: 'fit-content' }}>
                <h3>Generate API Key</h3>
                <p className="mb-2" style={{ fontSize: '0.85rem' }}>Give your key a label to track where it is used.</p>

                <form onSubmit={handleCreateKey} className="flex-col">
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Web Crawler"
                  />
                  <button type="submit" className="btn btn-primary w-full">
                    <Plus size={16} /> Create API Key
                  </button>
                </form>
              </div>

              {/* API Keys Table */}
              <div className="card">
                <h3>Active API Keys</h3>
                
                {createdRawKey && (
                  <div className="card mb-3 glowing-accent" style={{ backgroundColor: 'rgba(6, 182, 212, 0.05)', borderColor: 'var(--secondary)' }}>
                    <div className="flex-between">
                      <h4 style={{ color: 'var(--secondary)' }}>Secret Key Created</h4>
                      <button
                        onClick={() => copyToClipboard(createdRawKey, true)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }}
                      >
                        {copiedRawKey ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                        {copiedRawKey ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="mt-1 mb-2">
                      Copy this key now. For your security, it will not be shown again.
                    </p>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        padding: '0.6rem 0.8rem',
                        backgroundColor: 'var(--bg-main)',
                        borderRadius: '6px',
                        border: '1px dashed var(--secondary)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        wordBreak: 'break-all'
                      }}
                    >
                      {createdRawKey}
                    </div>
                  </div>
                )}

                {keysLoading ? (
                  <div className="flex-center" style={{ padding: '2rem' }}>
                    <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} />
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Prefix</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Created</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keys.length > 0 ? (
                          keys.map((k) => (
                            <tr key={k.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{k.name}</td>
                              <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>{k.keyPrefix}...</td>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                                {new Date(k.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleRevokeKey(k.id)}
                                  className="btn btn-danger"
                                  style={{ padding: '0.4rem', borderRadius: '6px' }}
                                  title="Revoke API Key"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              No API keys found. Generate a key on the left to start testing.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: INTERACTIVE API PLAYGROUND
            ==================================================== */}
        {activeTab === 'playground' && (
          <div>
            <h1>API Playground</h1>
            <p className="mb-3">Test all endpoint functionalities directly in your web browser before writing code.</p>

            <div className="grid-2">
              {/* Form config card */}
              <div className="card">
                <h3>Request Configuration</h3>
                <div className="flex-col mt-2">
                  
                  {/* API Key selector */}
                  <div className="flex-col" style={{ gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select API Key</label>
                    {keys.length === 0 ? (
                      <div className="badge badge-red w-full text-center" style={{ padding: '0.5rem' }}>
                        No API Key found. Go to API Keys tab to create one.
                      </div>
                    ) : (
                      <input
                        type="password"
                        placeholder="Paste your secret API key (os_...)"
                        value={pgKey}
                        onChange={(e) => setPgKey(e.target.value)}
                        style={{ borderStyle: 'dashed' }}
                      />
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Note: You must paste the full secret key you copied during creation.
                    </span>
                  </div>

                  {/* Target URL */}
                  <div className="flex-col" style={{ gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target URL</label>
                    <input
                      type="url"
                      value={pgUrl}
                      onChange={(e) => setPgUrl(e.target.value)}
                      placeholder="e.g. https://news.ycombinator.com"
                    />
                  </div>

                  {/* Endpoint/Action selection */}
                  <div className="flex-col" style={{ gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>API Endpoint</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      <button
                        onClick={() => setPgAction('scrape')}
                        className={`btn ${pgAction === 'scrape' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem' }}
                      >
                        <FileText size={16} /> Markdown
                      </button>
                      <button
                        onClick={() => setPgAction('screenshot')}
                        className={`btn ${pgAction === 'screenshot' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem' }}
                      >
                        <Camera size={16} /> Screenshot
                      </button>
                      <button
                        onClick={() => setPgAction('pdf')}
                        className={`btn ${pgAction === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.5rem' }}
                      >
                        <ExternalLink size={16} /> PDF
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={runPlaygroundRequest}
                    disabled={pgLoading}
                    className="btn btn-primary w-full mt-2"
                    style={{ background: 'linear-gradient(135deg, var(--secondary), #0891b2)' }}
                  >
                    {pgLoading ? <Loader2 className="animate-spin" size={18} /> : (
                      <>
                        <Send size={16} />
                        <span>Send API Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Response inspector card */}
              <div className="card flex-col" style={{ minHeight: '400px' }}>
                <div className="flex-between">
                  <h3>Response Inspector</h3>
                  {pgStatus && (
                    <div className="flex-row">
                      <span className={`badge ${pgStatus < 300 ? 'badge-green' : 'badge-red'}`}>
                        Status: {pgStatus}
                      </span>
                      {pgLatency && (
                        <span className="badge badge-blue">
                          {pgLatency} ms
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {pgLoading ? (
                  <div className="flex-center" style={{ flexGrow: 1, flexDirection: 'column', gap: '0.5rem' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--secondary)' }} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Launching headless Chromium sandbox...
                    </p>
                  </div>
                ) : pgResult ? (
                  <div className="flex-col" style={{ flexGrow: 1, gap: '1rem' }}>
                    
                    {/* Headers display */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="mb-1">Response Headers</h4>
                      <pre style={{
                        backgroundColor: 'var(--bg-main)',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        border: '1px solid var(--border-color)',
                        maxHeight: '100px',
                        overflowY: 'auto'
                      }}>
                        {Object.entries(pgResponseHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')}
                      </pre>
                    </div>

                    {/* Result Content renderer */}
                    <div style={{ flexGrow: 1 }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="mb-1">Response Payload</h4>
                      
                      {pgAction === 'scrape' && (
                        <div className="preview-pane" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <strong>Title:</strong> {pgResult.title}
                          </div>
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{pgResult.markdown}</pre>
                        </div>
                      )}

                      {pgAction === 'screenshot' && pgResult.type === 'image' && (
                        <div className="preview-pane" style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#000' }}>
                          <img
                            src={pgResult.url}
                            alt="Scraped Screenshot"
                            style={{ maxWidth: '100%', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                        </div>
                      )}

                      {pgAction === 'pdf' && pgResult.type === 'pdf' && (
                        <div className="preview-pane flex-center flex-col" style={{ gap: '1rem' }}>
                          <FileText size={48} style={{ color: 'var(--secondary)' }} />
                          <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                            PDF document successfully rendered.
                          </p>
                          <a href={pgResult.url} download="page.pdf" className="btn btn-primary">
                            Download Generated PDF
                          </a>
                        </div>
                      )}

                      {pgResult.error && (
                        <div className="preview-pane" style={{ color: 'var(--error)' }}>
                          <strong>{pgResult.error}</strong>
                          <pre className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>{pgResult.message}</pre>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="flex-center" style={{ flexGrow: 1, color: 'var(--text-muted)', textAlign: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                    <HelpCircle size={36} />
                    <p style={{ fontSize: '0.9rem' }}>
                      Configure the URL and parameters on the left and trigger the API request.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: DOCUMENTATION
            ==================================================== */}
        {activeTab === 'docs' && (
          <div>
            <h1>Developer Documentation</h1>
            <p className="mb-3">Integrate OmniScrape API endpoints directly into your codebase. View simple integration scripts.</p>

            <div className="grid-1-2">
              <div className="card flex-col" style={{ height: 'fit-content', gap: '1.25rem' }}>
                <h3>Endpoints Reference</h3>
                
                <div>
                  <div className="flex-row">
                    <span className="badge badge-green" style={{ fontFamily: 'var(--font-mono)' }}>GET</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>/v1/scrape</strong>
                  </div>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Scrapes a webpage, strips advertising and styles, and translates standard articles to Markdown.
                  </p>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }}></div>

                <div>
                  <div className="flex-row">
                    <span className="badge badge-green" style={{ fontFamily: 'var(--font-mono)' }}>GET</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>/v1/screenshot</strong>
                  </div>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Launches a viewport frame and captures high resolution PNG images. Returns binary screenshot image.
                  </p>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }}></div>

                <div>
                  <div className="flex-row">
                    <span className="badge badge-green" style={{ fontFamily: 'var(--font-mono)' }}>GET</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>/v1/pdf</strong>
                  </div>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Renders an A4 PDF document layout from target web contents. Returns binary PDF file.
                  </p>
                </div>
              </div>

              {/* Code Snippets Panel */}
              <div className="card">
                <div className="flex-between mb-2">
                  <h3>Code Integration Snippets</h3>
                  
                  {/* Language Selector */}
                  <div className="flex-row" style={{ gap: '0.25rem' }}>
                    <button
                      onClick={() => setDocLang('curl')}
                      className={`btn ${docLang === 'curl' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                    >
                      cURL
                    </button>
                    <button
                      onClick={() => setDocLang('js')}
                      className={`btn ${docLang === 'js' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                    >
                      JavaScript
                    </button>
                    <button
                      onClick={() => setDocLang('python')}
                      className={`btn ${docLang === 'python' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                    >
                      Python
                    </button>
                  </div>
                </div>

                {/* Snippet display Box */}
                <div className="code-block-container">
                  <div className="code-header">
                    <span>{docLang.toUpperCase()} - {pgAction.toUpperCase()} ENDPOINT</span>
                    <button
                      onClick={() => copyToClipboard(getDocCode(), false, true)}
                      className="copy-btn"
                    >
                      {copiedCode ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{getDocCode()}</pre>
                </div>

                <div className="mt-3">
                  <h4>Required Request Headers</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.5rem' }}>Header</th>
                        <th style={{ padding: '0.5rem' }}>Type</th>
                        <th style={{ padding: '0.5rem' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>X-API-Key</td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>String</td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>Your secret API key. Required.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: PRICING PLANS
            ==================================================== */}
        {activeTab === 'pricing' && (
          <div>
            <h1>Subscription Pricing Model</h1>
            <p>Simulate pricing selections to test plan upgrades and limits logic.</p>

            <div className="pricing-grid">
              
              {/* FREE Plan */}
              <div className={`card pricing-card ${user?.plan === 'FREE' ? 'popular' : ''}`}>
                <div>
                  <span className="badge badge-blue">Developer Trial</span>
                  <div className="price">$0<span> / month</span></div>
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>Perfect for prototyping and light scraping requirements.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 100 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Scraping & Markdown</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Latency metrics access</li>
                    <li style={{ opacity: 0.4 }}><CheckCircle size={14} /> Full Screenshot rendering</li>
                    <li style={{ opacity: 0.4 }}><CheckCircle size={14} /> A4 PDF layouts</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan('FREE')}
                  disabled={user?.plan === 'FREE'}
                  className={`btn w-full ${user?.plan === 'FREE' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {user?.plan === 'FREE' ? 'Current Plan' : 'Choose Free'}
                </button>
              </div>

              {/* STARTER Plan */}
              <div className={`card pricing-card ${user?.plan === 'STARTER' ? 'popular' : ''}`}>
                <div>
                  <span className="badge badge-purple">Starter Plan</span>
                  <div className="price">$19<span> / month</span></div>
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>For developers scaling simple applications and AI ingestion pipelines.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 10,000 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Markdown + Screenshots</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Standard response speeds</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> PDF file printing</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Email support channel</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan('STARTER')}
                  disabled={user?.plan === 'STARTER'}
                  className={`btn w-full ${user?.plan === 'STARTER' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {user?.plan === 'STARTER' ? 'Current Plan' : 'Select Starter'}
                </button>
              </div>

              {/* GROWTH Plan */}
              <div className={`card pricing-card ${user?.plan === 'GROWTH' ? 'popular' : ''}`}>
                <div>
                  <span className="badge badge-green">Growth Tier</span>
                  <div className="price">$49<span> / month</span></div>
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>Ideal for growing SaaS applications and scraping workflows.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 50,000 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Unlimited active keys</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Premium proxy rotation</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Screenshots + PDFs</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Priority ticket response</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan('GROWTH')}
                  disabled={user?.plan === 'GROWTH'}
                  className={`btn w-full ${user?.plan === 'GROWTH' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {user?.plan === 'GROWTH' ? 'Current Plan' : 'Select Growth'}
                </button>
              </div>

              {/* SCALE Plan */}
              <div className={`card pricing-card ${user?.plan === 'SCALE' ? 'popular' : ''}`}>
                <div>
                  <span className="badge badge-gold">Enterprise Scale</span>
                  <div className="price">$149<span> / month</span></div>
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>For heavy data collection and enterprise-grade LLM applications.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 250,000 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Concurrent request lines</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Dedicated proxy networks</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 99.9% SLA uptime guarantee</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 24/7 Slack support channel</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSelectPlan('SCALE')}
                  disabled={user?.plan === 'SCALE'}
                  className={`btn w-full ${user?.plan === 'SCALE' ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {user?.plan === 'SCALE' ? 'Current Plan' : 'Select Scale'}
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
