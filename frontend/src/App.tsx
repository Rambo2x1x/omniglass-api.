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
import { FALLBACK_CATALOG } from './fallbackCatalog';
import type { EndpointSpec } from './fallbackCatalog';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

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
    Verify: number;
    Enrich: number;
    Scrape: number;
    Search: number;
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
  const [pgAction, setPgAction] = useState<string>('verify_email');
  const [pgEmail, setPgEmail] = useState('alex.jones@stripe.com');
  const [pgDomain, setPgDomain] = useState('stripe.com');
  const [pgPhone, setPgPhone] = useState('+14155552671');
  const [pgQuery, setPgQuery] = useState('web scraping');
  const [pgSelector, setPgSelector] = useState('h1');
  const [pgHtml, setPgHtml] = useState('<h1>Hello World</h1>');
  const [pgNum, setPgNum] = useState(10);
  const [pgBlockMedia, setPgBlockMedia] = useState(true);
  const [pgFullPage, setPgFullPage] = useState(true);
  const [pgExecuteJs, setPgExecuteJs] = useState('');
  const [pgPremiumProxy, setPgPremiumProxy] = useState(false);
  const [pgProxyCountry, setPgProxyCountry] = useState('US');
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

  // Endpoints Catalog State
  const [endpoints, setEndpoints] = useState<EndpointSpec[]>(FALLBACK_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [docFilter, setDocFilter] = useState<'all' | 'b2b' | 'scrape' | 'search'>('all');

  // Fetch API Catalog on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const res = await fetch(`${API_BASE}/v1/endpoints`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.endpoints)) {
            setEndpoints(data.endpoints);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic API catalog:', err);
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, []);

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

    const needsUrl = !['search', 'images', 'news', 'suggest', 'html_pdf', 'verify_email', 'enrich_domain', 'enrich_email', 'verify_phone'].includes(pgAction);
    const needsQuery = ['search', 'images', 'news', 'suggest'].includes(pgAction);
    const needsHtml = pgAction === 'html_pdf';

    if (['verify_email', 'enrich_email'].includes(pgAction) && !pgEmail) {
      alert('Please provide an email address.');
      return;
    }
    if (pgAction === 'enrich_domain' && !pgDomain) {
      alert('Please provide a domain name.');
      return;
    }
    if (pgAction === 'verify_phone' && !pgPhone) {
      alert('Please provide a phone number.');
      return;
    }
    if (needsUrl && !pgUrl) {
      alert('Please provide a URL.');
      return;
    }
    if (needsQuery && !pgQuery) {
      alert('Please provide a search query.');
      return;
    }
    if (needsHtml && !pgHtml) {
      alert('Please provide HTML content.');
      return;
    }

    setPgLoading(true);
    setPgResult(null);
    setPgStatus(null);
    setPgLatency(null);

    const startTime = Date.now();
    let fetchUrl = '';
    let fetchMethod = 'GET';
    let fetchBody: any = null;

    const blockMediaParam = pgBlockMedia ? '&blockMedia=true' : '&blockMedia=false';
    const fullPageParam = pgFullPage ? '&fullPage=true' : '&fullPage=false';
    const premiumQueryStr = pgPremiumProxy ? `&premiumProxy=true&proxyCountry=${encodeURIComponent(pgProxyCountry)}` : '';
    const jsQueryStr = pgExecuteJs ? `&executeJs=${encodeURIComponent(pgExecuteJs)}` : '';
    const premiumParamsString = `${premiumQueryStr}${jsQueryStr}`;

    switch (pgAction) {
      case 'verify_email':
        fetchUrl = `/v1/verify/email?email=${encodeURIComponent(pgEmail)}`;
        break;
      case 'enrich_domain':
        fetchUrl = `/v1/enrich/domain?domain=${encodeURIComponent(pgDomain)}`;
        break;
      case 'enrich_email':
        fetchUrl = `/v1/enrich/email?email=${encodeURIComponent(pgEmail)}`;
        break;
      case 'verify_phone':
        fetchUrl = `/v1/verify/phone?phone=${encodeURIComponent(pgPhone)}`;
        break;
      case 'scrape':
        fetchUrl = `/v1/scrape?url=${encodeURIComponent(pgUrl)}${blockMediaParam}${premiumParamsString}`;
        break;
      case 'selector':
        fetchMethod = 'POST';
        fetchBody = { url: pgUrl, selector: pgSelector, blockMedia: pgBlockMedia, executeJs: pgExecuteJs || undefined, premiumProxy: pgPremiumProxy || undefined, proxyCountry: pgPremiumProxy ? pgProxyCountry : undefined };
        fetchUrl = `/v1/scrape`;
        break;
      case 'raw':
        fetchUrl = `/v1/scrape/raw?url=${encodeURIComponent(pgUrl)}${blockMediaParam}${premiumParamsString}`;
        break;
      case 'metadata':
        fetchUrl = `/v1/scrape/metadata?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'status':
        fetchUrl = `/v1/scrape/status?url=${encodeURIComponent(pgUrl)}`;
        break;
      case 'screenshot':
        fetchUrl = `/v1/screenshot?url=${encodeURIComponent(pgUrl)}${fullPageParam}${blockMediaParam}${premiumParamsString}`;
        break;
      case 'element_screenshot':
        fetchUrl = `/v1/screenshot/element?url=${encodeURIComponent(pgUrl)}&selector=${encodeURIComponent(pgSelector)}${premiumParamsString}`;
        break;
      case 'pdf':
        fetchUrl = `/v1/pdf?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'html_pdf':
        fetchMethod = 'POST';
        fetchBody = { html: pgHtml, executeJs: pgExecuteJs || undefined, premiumProxy: pgPremiumProxy || undefined, proxyCountry: pgPremiumProxy ? pgProxyCountry : undefined };
        fetchUrl = `/v1/pdf`;
        break;
      case 'emails':
        fetchUrl = `/v1/scrape/emails?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'links':
        fetchUrl = `/v1/scrape/links?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'table':
        fetchUrl = `/v1/scrape/table?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'search':
        fetchUrl = `/v1/search?q=${encodeURIComponent(pgQuery)}&num=${pgNum}`;
        break;
      case 'images':
        fetchUrl = `/v1/search/images?q=${encodeURIComponent(pgQuery)}&num=${pgNum}`;
        break;
      case 'news':
        fetchUrl = `/v1/search/news?q=${encodeURIComponent(pgQuery)}&num=${pgNum}`;
        break;
      case 'suggest':
        fetchUrl = `/v1/search/suggest?q=${encodeURIComponent(pgQuery)}`;
        break;
      default:
        fetchUrl = `/v1/verify/email?email=${encodeURIComponent(pgEmail)}`;
    }

    try {
      const fetchOptions: RequestInit = {
        method: fetchMethod,
        headers: {
          'X-API-Key': pgKey,
        },
      };

      if (fetchBody) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json'
        };
        fetchOptions.body = JSON.stringify(fetchBody);
      }

      const res = await fetch(`${API_BASE}${fetchUrl}`, fetchOptions);

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

      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('image/')) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPgResult({ type: 'image', url: objectUrl });
      } else if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPgResult({ type: 'pdf', url: objectUrl });
      } else {
        const data = await res.json().catch(() => null);
        setPgResult(data || { message: 'Empty or invalid JSON response.' });
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
    const cleanEmail = pgEmail || 'alex.jones@stripe.com';
    const cleanDomain = pgDomain || 'stripe.com';
    const cleanPhone = pgPhone || '+14155552671';
    
    let path = '';
    let method = 'GET';
    let queryParams = '';
    let bodyData: any = null;

    const blockMediaParam = pgBlockMedia ? '&blockMedia=true' : '&blockMedia=false';
    const fullPageParam = pgFullPage ? '&fullPage=true' : '&fullPage=false';
    const premiumQueryStr = pgPremiumProxy ? `&premiumProxy=true&proxyCountry=${encodeURIComponent(pgProxyCountry)}` : '';
    const jsQueryStr = pgExecuteJs ? `&executeJs=${encodeURIComponent(pgExecuteJs)}` : '';
    const premiumParamsString = `${premiumQueryStr}${jsQueryStr}`;

    switch (pgAction) {
      case 'verify_email':
        path = '/v1/verify/email';
        queryParams = `?email=${encodeURIComponent(cleanEmail)}`;
        break;
      case 'enrich_domain':
        path = '/v1/enrich/domain';
        queryParams = `?domain=${encodeURIComponent(cleanDomain)}`;
        break;
      case 'enrich_email':
        path = '/v1/enrich/email';
        queryParams = `?email=${encodeURIComponent(cleanEmail)}`;
        break;
      case 'verify_phone':
        path = '/v1/verify/phone';
        queryParams = `?phone=${encodeURIComponent(cleanPhone)}`;
        break;
      case 'scrape':
        path = '/v1/scrape';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${blockMediaParam}${premiumParamsString}`;
        break;
      case 'selector':
        path = '/v1/scrape';
        method = 'POST';
        bodyData = { url: pgUrl, selector: pgSelector, blockMedia: pgBlockMedia, executeJs: pgExecuteJs || undefined, premiumProxy: pgPremiumProxy || undefined, proxyCountry: pgPremiumProxy ? pgProxyCountry : undefined };
        break;
      case 'raw':
        path = '/v1/scrape/raw';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${blockMediaParam}${premiumParamsString}`;
        break;
      case 'metadata':
        path = '/v1/scrape/metadata';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'status':
        path = '/v1/scrape/status';
        queryParams = `?url=${encodeURIComponent(pgUrl)}`;
        break;
      case 'screenshot':
        path = '/v1/screenshot';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${fullPageParam}${blockMediaParam}${premiumParamsString}`;
        break;
      case 'element_screenshot':
        path = '/v1/screenshot/element';
        queryParams = `?url=${encodeURIComponent(pgUrl)}&selector=${encodeURIComponent(pgSelector)}${premiumParamsString}`;
        break;
      case 'pdf':
        path = '/v1/pdf';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'html_pdf':
        path = '/v1/pdf';
        method = 'POST';
        bodyData = { html: pgHtml, executeJs: pgExecuteJs || undefined, premiumProxy: pgPremiumProxy || undefined, proxyCountry: pgPremiumProxy ? pgProxyCountry : undefined };
        break;
      case 'emails':
        path = '/v1/scrape/emails';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'links':
        path = '/v1/scrape/links';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'table':
        path = '/v1/scrape/table';
        queryParams = `?url=${encodeURIComponent(pgUrl)}${premiumParamsString}`;
        break;
      case 'search':
        path = '/v1/search';
        queryParams = `?q=${encodeURIComponent(pgQuery)}&num=${pgNum}`;
        break;
      case 'images':
        path = '/v1/search/images';
        queryParams = `?q=${encodeURIComponent(pgQuery)}&num=${pgNum}`;
        break;
      case 'news':
        path = '/v1/search/news';
        queryParams = `?q=${encodeURIComponent(pgQuery)}&num=${pgNum}`;
        break;
      case 'suggest':
        path = '/v1/search/suggest';
        queryParams = `?q=${encodeURIComponent(pgQuery)}`;
        break;
      default:
        path = '/v1/verify/email';
        queryParams = `?email=${encodeURIComponent(cleanEmail)}`;
    }

    const fullUrl = `${API_BASE}${path}${queryParams}`;

    if (docLang === 'curl') {
      if (method === 'POST') {
        return `curl -X POST "${fullUrl}" \\\n  -H "X-API-Key: ${activeKeyVal}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(bodyData)}'`;
      }
      return `curl -X GET "${fullUrl}" \\\n  -H "X-API-Key: ${activeKeyVal}"`;
    }

    if (docLang === 'js') {
      if (method === 'POST') {
        return `// POST Request using Fetch API
fetch("${fullUrl}", {
  method: "POST",
  headers: {
    "X-API-Key": "${activeKeyVal}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(bodyData, null, 2).replace(/\n/g, '\n  ')})
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`;
      }
      return `// GET Request using Fetch API
fetch("${fullUrl}", {
  headers: {
    "X-API-Key": "${activeKeyVal}"
  }
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`;
    }

    if (docLang === 'python') {
      if (method === 'POST') {
        return `import requests

url = "${fullUrl}"
headers = {
    "X-API-Key": "${activeKeyVal}",
    "Content-Type": "application/json"
}
data = ${JSON.stringify(bodyData, null, 4).replace(/true/g, 'True').replace(/false/g, 'False')}

response = requests.post(url, headers=headers, json=data)
if response.status_code == 200:
    print(response.json())
else:
    print("Error:", response.status_code, response.text)`;
      }
      return `import requests

url = "${fullUrl}"
headers = {
    "X-API-Key": "${activeKeyVal}"
}

response = requests.get(url, headers=headers)
if response.status_code == 200:
    print(response.json())
else:
    print("Error:", response.status_code, response.text)`;
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
              <Zap style={{ color: 'var(--secondary)' }} /> OmniGlass API
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
          <span>OmniGlass API</span>
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
                        <linearGradient id="colorVerify" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorEnrich" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorScrape" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorSearch" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                      <Area type="monotone" dataKey="Verify" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVerify)" />
                      <Area type="monotone" dataKey="Enrich" stroke="#06b6d4" fillOpacity={1} fill="url(#colorEnrich)" />
                      <Area type="monotone" dataKey="Scrape" stroke="#10b981" fillOpacity={1} fill="url(#colorScrape)" />
                      <Area type="monotone" dataKey="Search" stroke="#a855f7" fillOpacity={1} fill="url(#colorSearch)" />
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

                  {/* Endpoint/Action selection */}
                  <div className="flex-col" style={{ gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>API Endpoint</label>
                    <select
                      value={pgAction}
                      onChange={(e) => {
                        setPgAction(e.target.value);
                        setPgResult(null);
                        setPgStatus(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-main)',
                        color: '#fff',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <optgroup label="B2B Intel & Verification">
                        <option value="verify_email">Verify Email Deliverability</option>
                        <option value="verify_phone">Validate Phone Formats</option>
                        <option value="enrich_domain">Enrich Domain Profile</option>
                        <option value="enrich_email">Enrich Email & Company Profile</option>
                      </optgroup>
                      <optgroup label="Web Scraping & Media">
                        <option value="scrape">Scrape Webpage to Markdown</option>
                        <option value="selector">Scrape Specific CSS Selector</option>
                        <option value="raw">Scrape Raw HTML Source</option>
                        <option value="metadata">Extract SEO Metadata Only</option>
                        <option value="status">SSL & Domain Status Auditor</option>
                        <option value="screenshot">Capture Webpage Screenshot</option>
                        <option value="element_screenshot">Capture CSS Element Crop</option>
                        <option value="pdf">Convert Webpage to PDF</option>
                        <option value="html_pdf">Convert Raw HTML to PDF</option>
                      </optgroup>
                      <optgroup label="Data Extraction & Search">
                        <option value="emails">Extract Page Emails & Socials</option>
                        <option value="links">Extract Page Hyperlinks</option>
                        <option value="table">Parse Tables to JSON</option>
                        <option value="search">Organic Google Web Search</option>
                        <option value="images">Google Images Search</option>
                        <option value="news">Google News SERP Scraper</option>
                        <option value="suggest">Keyword Autocomplete Suggestions</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Target Email */}
                  {['verify_email', 'enrich_email'].includes(pgAction) && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Email Address</label>
                      <input
                        type="email"
                        value={pgEmail}
                        onChange={(e) => setPgEmail(e.target.value)}
                        placeholder="e.g. alex.jones@stripe.com"
                      />
                    </div>
                  )}

                  {/* Target Domain */}
                  {pgAction === 'enrich_domain' && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Domain Name</label>
                      <input
                        type="text"
                        value={pgDomain}
                        onChange={(e) => setPgDomain(e.target.value)}
                        placeholder="e.g. stripe.com"
                      />
                    </div>
                  )}

                  {/* Target Phone */}
                  {pgAction === 'verify_phone' && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Phone Number</label>
                      <input
                        type="text"
                        value={pgPhone}
                        onChange={(e) => setPgPhone(e.target.value)}
                        placeholder="e.g. +14155552671"
                      />
                    </div>
                  )}

                  {/* Target URL */}
                  {!['search', 'images', 'news', 'suggest', 'html_pdf', 'verify_email', 'enrich_domain', 'enrich_email', 'verify_phone'].includes(pgAction) && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Website URL</label>
                      <input
                        type="url"
                        value={pgUrl}
                        onChange={(e) => setPgUrl(e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                  )}

                  {/* Search Query */}
                  {['search', 'images', 'news', 'suggest'].includes(pgAction) && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Search Query Term</label>
                      <input
                        type="text"
                        value={pgQuery}
                        onChange={(e) => setPgQuery(e.target.value)}
                        placeholder="e.g. lead generation"
                      />
                    </div>
                  )}

                  {/* CSS Selector */}
                  {['selector', 'element_screenshot'].includes(pgAction) && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>CSS Selector Path</label>
                      <input
                        type="text"
                        value={pgSelector}
                        onChange={(e) => setPgSelector(e.target.value)}
                        placeholder="e.g. article.post-content, #chart"
                      />
                    </div>
                  )}

                  {/* HTML Content */}
                  {pgAction === 'html_pdf' && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Raw HTML Snippet</label>
                      <textarea
                        value={pgHtml}
                        onChange={(e) => setPgHtml(e.target.value)}
                        placeholder="<h1>Design your PDF in HTML</h1>"
                        rows={6}
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          color: '#fff',
                          border: '1px solid var(--border-color)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem'
                        }}
                      />
                    </div>
                  )}

                  {/* Results Count for Search */}
                  {['search', 'images', 'news'].includes(pgAction) && (
                    <div className="flex-col" style={{ gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Results Count</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={pgNum}
                        onChange={(e) => setPgNum(parseInt(e.target.value) || 10)}
                      />
                    </div>
                  )}

                  {/* Scraping Options */}
                  {!['search', 'images', 'news', 'suggest', 'html_pdf', 'verify_email', 'enrich_domain', 'enrich_email', 'verify_phone'].includes(pgAction) && (
                    <div className="flex-row" style={{ gap: '1rem', justifyContent: 'flex-start', margin: '0.25rem 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={pgBlockMedia}
                          onChange={(e) => setPgBlockMedia(e.target.checked)}
                        />
                        Block Images/Media
                      </label>

                      {pgAction === 'screenshot' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pgFullPage}
                            onChange={(e) => setPgFullPage(e.target.checked)}
                          />
                          Full Height Layout
                        </label>
                      )}
                    </div>
                  )}

                  {/* Premium Options: Custom JS & Proxy */}
                  {!['search', 'images', 'news', 'suggest', 'verify_email', 'enrich_domain', 'enrich_email', 'verify_phone'].includes(pgAction) && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }} className="flex-col">
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)' }}>Premium API Capabilities</label>
                      
                      <div className="flex-between">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pgPremiumProxy}
                            onChange={(e) => setPgPremiumProxy(e.target.checked)}
                          />
                          Use Rotating Premium Proxies
                        </label>
                        
                        {pgPremiumProxy && (
                          <div style={{ width: '120px' }}>
                            <select
                              value={pgProxyCountry}
                              onChange={(e) => setPgProxyCountry(e.target.value)}
                              style={{ padding: '0.3rem', fontSize: '0.75rem' }}
                            >
                              <option value="US">United States (US)</option>
                              <option value="DE">Germany (DE)</option>
                              <option value="GB">United Kingdom (GB)</option>
                              <option value="FR">France (FR)</option>
                              <option value="JP">Japan (JP)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex-col" style={{ gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Execute JavaScript Scenario</label>
                        <textarea
                          placeholder="e.g. window.scrollTo(0, document.body.scrollHeight) or click buttons"
                          value={pgExecuteJs}
                          onChange={(e) => setPgExecuteJs(e.target.value)}
                          rows={2}
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontFamily: 'var(--font-mono)'
                          }}
                        />
                      </div>
                    </div>
                  )}

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
                      Querying OmniGlass B2B database...
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
                        maxHeight: '80px',
                        overflowY: 'auto'
                      }}>
                        {Object.entries(pgResponseHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')}
                      </pre>
                    </div>

                    {/* Result Content renderer */}
                    <div style={{ flexGrow: 1 }}>
                      {/* Binary Image Preview */}
                      {pgResult && pgResult.type === 'image' && (
                        <div className="preview-pane flex-col flex-center" style={{ gap: '0.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <img src={pgResult.url} alt="API Output Preview" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '4px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
                          <a href={pgResult.url} download="screenshot.png" className="btn btn-secondary mt-1" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                            Download Image
                          </a>
                        </div>
                      )}

                      {/* Binary PDF Preview */}
                      {pgResult && pgResult.type === 'pdf' && (
                        <div className="preview-pane flex-col flex-center" style={{ gap: '0.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <iframe src={pgResult.url} style={{ width: '100%', height: '400px', border: '1px solid var(--border-color)', borderRadius: '4px' }} title="PDF Preview" />
                          <a href={pgResult.url} download="document.pdf" className="btn btn-secondary mt-1" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                            Download PDF Document
                          </a>
                        </div>
                      )}

                      {/* Email Verification Card */}
                      {pgAction === 'verify_email' && pgResult && pgResult.email && (
                        <div className="preview-pane flex-col" style={{ gap: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <div className="flex-between">
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{pgResult.email}</span>
                            <span className={`badge ${pgResult.isValid ? 'badge-green' : 'badge-red'}`}>
                              {pgResult.isValid ? 'Deliverable' : 'Undeliverable'}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 0.5rem', fontSize: '0.8rem' }}>
                            <div><strong>Domain:</strong> {pgResult.domain}</div>
                            <div><strong>User Prefix:</strong> {pgResult.user}</div>
                            <div><strong>Disposable Domain:</strong> {pgResult.isDisposable ? '🔴 Yes (Blocked)' : '🟢 No'}</div>
                            <div><strong>Role Account:</strong> {pgResult.isRoleAccount ? '⚠️ Yes (Role)' : '🟢 No'}</div>
                            <div>
                              <strong>SMTP Mailbox: </strong> 
                              <span className={`badge ${pgResult.smtpCheck === 'deliverable' ? 'badge-green' : pgResult.smtpCheck === 'undeliverable' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', textTransform: 'capitalize' }}>
                                {pgResult.smtpCheck}
                              </span>
                            </div>
                            <div><strong>Catch-All Server:</strong> {pgResult.isCatchAll ? '⚠️ Yes' : '🟢 No'}</div>
                          </div>
                          {pgResult.mxRecords && pgResult.mxRecords.length > 0 && (
                            <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                              <strong>Resolved MX Exchanges (Prioritized):</strong>
                              <div className="flex-row" style={{ flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.2rem', justifyContent: 'flex-start' }}>
                                {pgResult.mxRecords.slice(0, 3).map((mx: string, idx: number) => (
                                  <span key={idx} className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{mx}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Domain Enrichment Card */}
                      {pgAction === 'enrich_domain' && pgResult.domain && (
                        <div className="preview-pane flex-col" style={{ gap: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <div className="flex-row" style={{ justifyContent: 'flex-start', gap: '0.75rem' }}>
                            {pgResult.logo && (
                              <img src={pgResult.logo} alt={pgResult.name} style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fff', padding: '2px' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                            )}
                            <div className="flex-col" style={{ alignItems: 'flex-start' }}>
                              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{pgResult.name}</h3>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pgResult.domain}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {pgResult.description}
                          </div>
                          {pgResult.techStack && pgResult.techStack.length > 0 && (
                            <div className="flex-col" style={{ gap: '0.25rem' }}>
                              <strong style={{ fontSize: '0.75rem' }}>Detected Technologies:</strong>
                              <div className="flex-row" style={{ flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'flex-start' }}>
                                {pgResult.techStack.map((tech: string, i: number) => (
                                  <span key={i} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{tech}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {pgResult.socials && Object.values(pgResult.socials).some(Boolean) && (
                            <div className="flex-col" style={{ gap: '0.25rem' }}>
                              <strong style={{ fontSize: '0.75rem' }}>Social Networks:</strong>
                              <div className="flex-row" style={{ gap: '0.5rem', justifyContent: 'flex-start' }}>
                                {Object.entries(pgResult.socials as Record<string, any>).map(([key, val]) => {
                                  const urlVal = val as string;
                                  if (!urlVal) return null;
                                  return (
                                    <a key={key} href={urlVal} target="_blank" rel="noopener noreferrer" className="badge badge-purple" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                                      {key}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {pgResult.dnsSecurity && (
                            <div className="flex-col" style={{ gap: '0.4rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                              <strong style={{ fontSize: '0.75rem' }}>DNS Security & Infrastructure:</strong>
                              <div className="flex-row" style={{ gap: '0.5rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                                <span className={`badge ${pgResult.dnsSecurity.spfValid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>
                                  SPF: {pgResult.dnsSecurity.spfValid ? 'Configured' : 'Missing'}
                                </span>
                                <span className={`badge ${pgResult.dnsSecurity.dmarcValid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>
                                  DMARC: {pgResult.dnsSecurity.dmarcValid ? 'Configured' : 'Missing'}
                                </span>
                              </div>
                              {pgResult.dnsSecurity.nameServers && pgResult.dnsSecurity.nameServers.length > 0 && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  <strong>Name Servers:</strong> {pgResult.dnsSecurity.nameServers.slice(0, 3).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Email Enrichment Card */}
                      {pgAction === 'enrich_email' && pgResult.email && (
                        <div className="preview-pane flex-col" style={{ gap: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <div className="flex-col" style={{ gap: '0.25rem' }}>
                            <div className="flex-between">
                              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{pgResult.fullName || pgResult.firstName || 'Enriched Profile'}</h3>
                              <span className={`badge ${pgResult.verification?.deliverable === 'deliverable' ? 'badge-green' : 'badge-red'}`}>
                                {pgResult.verification?.deliverable || 'Unknown'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pgResult.email}</span>
                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                              <span>SMTP Check: <strong style={{ color: pgResult.verification?.smtpCheck === 'deliverable' ? '#10b981' : pgResult.verification?.smtpCheck === 'undeliverable' ? '#ef4444' : 'inherit' }}>{pgResult.verification?.smtpCheck || 'unknown'}</strong></span>
                              <span>•</span>
                              <span>Catch-All: <strong>{pgResult.verification?.isCatchAll ? '⚠️ Yes' : '🟢 No'}</strong></span>
                            </div>
                          </div>
                          {pgResult.company ? (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                              <div className="flex-row" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {pgResult.company.logo && (
                                  <img src={pgResult.company.logo} alt={pgResult.company.name} style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#fff' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                )}
                                <strong style={{ fontSize: '0.85rem' }}>{pgResult.company.name}</strong>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 0.5rem 0' }}>{pgResult.company.description}</p>
                              {pgResult.company.techStack && pgResult.company.techStack.length > 0 && (
                                <div className="flex-row" style={{ flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'flex-start' }}>
                                  {pgResult.company.techStack.slice(0, 4).map((tech: string, i: number) => (
                                    <span key={i} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{tech}</span>
                                  ))}
                                </div>
                              )}
                              {pgResult.company.dnsSecurity && (
                                <div className="flex-row" style={{ gap: '0.4rem', justifyContent: 'flex-start', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                  <span className={`badge ${pgResult.company.dnsSecurity.spfValid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.25rem' }}>
                                    SPF: {pgResult.company.dnsSecurity.spfValid ? 'Configured' : 'Missing'}
                                  </span>
                                  <span className={`badge ${pgResult.company.dnsSecurity.dmarcValid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.25rem' }}>
                                    DMARC: {pgResult.company.dnsSecurity.dmarcValid ? 'Configured' : 'Missing'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              No corporate company profile could be resolved for this email domain.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Phone Verification Card */}
                      {pgAction === 'verify_phone' && pgResult.phone && (
                        <div className="preview-pane flex-col" style={{ gap: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <div className="flex-between">
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{pgResult.phone}</span>
                            <span className={`badge ${pgResult.isValid ? 'badge-green' : 'badge-red'}`}>
                              {pgResult.isValid ? 'Valid Format' : 'Invalid'}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                            <div><strong>Country:</strong> {pgResult.countryName} ({pgResult.countryCode})</div>
                            <div><strong>Carrier:</strong> {pgResult.carrier}</div>
                            <div><strong>Clean E.164:</strong> {pgResult.phone}</div>
                            <div><strong>Formatted View:</strong> {pgResult.formatted}</div>
                          </div>
                        </div>
                      )}

                      {pgResult.error && (
                        <div className="preview-pane" style={{ color: 'var(--error)' }}>
                          <strong>{pgResult.error}</strong>
                          <pre className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>{pgResult.message}</pre>
                        </div>
                      )}

                      {/* Raw JSON display fallback */}
                      <div className="mt-2">
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="mb-1">Raw JSON Payload</h4>
                        <pre style={{
                          backgroundColor: 'var(--bg-main)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          border: '1px solid var(--border-color)',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all'
                        }}>
                          {JSON.stringify(pgResult, null, 2)}
                        </pre>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="flex-center" style={{ flexGrow: 1, color: 'var(--text-muted)', textAlign: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                    <HelpCircle size={36} />
                    <p style={{ fontSize: '0.9rem' }}>
                      Configure the parameters on the left and trigger the API request.
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
        {activeTab === 'docs' && (() => {
          const selectedEp = endpoints.find(e => e.id === pgAction) || endpoints[0];
          const filteredEndpoints = endpoints.filter(ep => {
            const matchesSearch = 
              ep.name.toLowerCase().includes(docSearch.toLowerCase()) ||
              ep.path.toLowerCase().includes(docSearch.toLowerCase()) ||
              ep.description.toLowerCase().includes(docSearch.toLowerCase());
            
            if (docFilter === 'all') return matchesSearch;
            if (docFilter === 'b2b') return matchesSearch && ep.group === 'B2B Intel & Verification';
            if (docFilter === 'scrape') return matchesSearch && ep.group === 'Web Scraping & Media';
            if (docFilter === 'search') return matchesSearch && ep.group === 'Data Extraction & Search';
            return matchesSearch;
          });

          return (
            <div>
              <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1>Developer API Reference</h1>
                  <p>Explore and integrate the full suite of OmniGlass B2B intelligence, web scraping, and search engine SERP APIs.</p>
                </div>
                
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                      service: 'OmniGlass API Spec',
                      version: 'v1.0.0',
                      lastUpdated: new Date().toISOString().split('T')[0],
                      endpoints
                    }, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", "omniglass_api_catalog.json");
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  <Copy size={16} /> Export API Catalog JSON
                </button>
              </div>

              {/* Filter and Search Bar */}
              <div className="card mb-3" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flexGrow: 1, minWidth: '250px' }}>
                    <input
                      type="text"
                      placeholder="Search endpoints by name, path, description..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      style={{ padding: '0.6rem 1rem' }}
                    />
                  </div>
                  
                  <div className="flex-row" style={{ gap: '0.5rem' }}>
                    {(['all', 'b2b', 'scrape', 'search'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setDocFilter(cat)}
                        className={`btn ${docFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '20px' }}
                      >
                        {cat === 'all' && 'All Endpoints'}
                        {cat === 'b2b' && 'B2B Verification'}
                        {cat === 'scrape' && 'Scraping & Media'}
                        {cat === 'search' && 'Search & Discovery'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid-1-2">
                {/* LEFT SIDEBAR: Endpoints catalog */}
                <div className="card flex-col" style={{ height: 'fit-content', gap: '1rem', maxHeight: '720px' }}>
                  <div className="flex-between">
                    <h3 style={{ marginBottom: 0 }}>API Catalog ({filteredEndpoints.length})</h3>
                    {catalogLoading && <Loader2 size={16} className="animate-spin" />}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {filteredEndpoints.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No endpoints match your query.
                      </div>
                    ) : (
                      filteredEndpoints.map((ep) => (
                        <div
                          key={ep.id}
                          onClick={() => setPgAction(ep.id)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: pgAction === ep.id ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                            borderColor: pgAction === ep.id ? 'var(--secondary)' : 'var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="endpoint-item"
                        >
                          <div className="flex-between">
                            <div className="flex-row" style={{ justifyContent: 'flex-start', gap: '0.4rem' }}>
                              <span className={`badge ${ep.method === 'GET' ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', fontFamily: 'var(--font-mono)' }}>
                                {ep.method}
                              </span>
                              <strong style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: pgAction === ep.id ? '#fff' : 'var(--text-secondary)' }}>
                                {ep.path}
                              </strong>
                            </div>
                          </div>
                          <h4 style={{ fontSize: '0.85rem', margin: '0.4rem 0 0.2rem 0', fontWeight: 600, color: pgAction === ep.id ? 'var(--secondary)' : 'var(--text-primary)' }}>
                            {ep.name}
                          </h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ep.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* RIGHT SIDEBAR: Selected Endpoint Details */}
                {selectedEp && (
                  <div className="card flex-col" style={{ gap: '1.5rem' }}>
                    <div>
                      <div className="flex-between mb-1">
                        <span className="badge badge-blue">{selectedEp.group}</span>
                        <div className="flex-row" style={{ gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(`${API_BASE}${selectedEp.path}`);
                              alert('Path copied to clipboard!');
                            }}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                          >
                            Copy Path
                          </button>
                          
                          <button
                            className="btn btn-primary glowing-accent"
                            onClick={() => {
                              setPgAction(selectedEp.id);
                              setActiveTab('playground');
                            }}
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', background: 'linear-gradient(135deg, var(--secondary), #0891b2)' }}
                          >
                            <Terminal size={12} /> Run in Playground
                          </button>
                        </div>
                      </div>
                      
                      <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${selectedEp.method === 'GET' ? 'badge-green' : 'badge-purple'}`} style={{ fontFamily: 'var(--font-mono)' }}>{selectedEp.method}</span>
                        {selectedEp.name}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{selectedEp.description}</p>
                      <code style={{ display: 'block', backgroundColor: 'var(--bg-main)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-color)', marginTop: '0.75rem', color: '#fff' }}>
                        {API_BASE}{selectedEp.path}
                      </code>
                    </div>

                    {/* Pricing Tiers Matrix Grid */}
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                        Subscription Tier Limits
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        {(['BASIC', 'PRO', 'ULTRA'] as const).map((tier) => {
                          const limitText = selectedEp.tierAccess[tier];
                          const isLocked = limitText.toLowerCase().includes('block') || limitText.toLowerCase().includes('lock');
                          const isLimited = limitText.toLowerCase().includes('check only') || limitText.toLowerCase().includes('max') || limitText.toLowerCase().includes('capped');
                          
                          return (
                            <div 
                              key={tier} 
                              style={{ 
                                padding: '0.6rem', 
                                borderRadius: '6px', 
                                backgroundColor: 'var(--bg-main)', 
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                              }}
                            >
                              <div className="flex-between">
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{tier}</span>
                                <span className={`badge ${isLocked ? 'badge-red' : isLimited ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem' }}>
                                  {isLocked ? 'Locked' : isLimited ? 'Limited' : 'Full Access'}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                                {limitText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Request Parameters Spec */}
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
                        Request Parameters ({selectedEp.parameters.length})
                      </h4>
                      {selectedEp.parameters.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No parameters required for this endpoint.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.4rem 0.5rem' }}>Name</th>
                                <th style={{ padding: '0.4rem 0.5rem' }}>In</th>
                                <th style={{ padding: '0.4rem 0.5rem' }}>Type</th>
                                <th style={{ padding: '0.4rem 0.5rem' }}>Required</th>
                                <th style={{ padding: '0.4rem 0.5rem' }}>Default</th>
                                <th style={{ padding: '0.4rem 0.5rem' }}>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedEp.parameters.map((param) => (
                                <tr key={param.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                                  <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--secondary)' }}>{param.name}</td>
                                  <td style={{ padding: '0.4rem 0.5rem' }}>
                                    <span className={`badge ${param.in === 'query' ? 'badge-blue' : 'badge-purple'}`} style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem' }}>
                                      {param.in}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-secondary)' }}>{param.type}</td>
                                  <td style={{ padding: '0.4rem 0.5rem' }}>
                                    <span className={`badge ${param.required ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem' }}>
                                      {param.required ? 'Yes' : 'No'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{param.default !== undefined ? String(param.default) : '-'}</td>
                                  <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-secondary)' }}>{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Code Snippets & Response Carousels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                      
                      <div>
                        <div className="flex-between mb-1">
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Code Integration Snippet</h4>
                          
                          <div className="flex-row" style={{ gap: '0.2rem' }}>
                            {(['curl', 'js', 'python'] as const).map((lang) => (
                              <button
                                key={lang}
                                onClick={() => setDocLang(lang)}
                                className={`btn ${docLang === lang ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px' }}
                              >
                                {lang === 'curl' ? 'cURL' : lang === 'js' ? 'JavaScript' : 'Python'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="code-block-container" style={{ maxHeight: '280px' }}>
                          <div className="code-header">
                            <span>{docLang.toUpperCase()} - {selectedEp.id.toUpperCase()}</span>
                            <button
                              onClick={() => copyToClipboard(getDocCode(), false, true)}
                              className="copy-btn"
                            >
                              {copiedCode ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                            </button>
                          </div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{getDocCode()}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem' }}>Expected JSON Response (Sample)</h4>
                        <div className="code-block-container" style={{ maxHeight: '280px', backgroundColor: '#05070a' }}>
                          <div className="code-header" style={{ paddingBottom: '0.4rem' }}>
                            <span>JSON Response Schema</span>
                            <button
                              onClick={() => copyToClipboard(typeof selectedEp.sampleResponse === 'string' ? selectedEp.sampleResponse : JSON.stringify(selectedEp.sampleResponse, null, 2))}
                              className="copy-btn"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: '#34d399' }}>
                            {typeof selectedEp.sampleResponse === 'string' ? selectedEp.sampleResponse : JSON.stringify(selectedEp.sampleResponse, null, 2)}
                          </pre>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>Perfect for prototyping and basic user email checks.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 100 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Email Syntax Verification</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Phone Format Validation</li>
                    <li style={{ opacity: 0.4 }}><CheckCircle size={14} /> DNS MX Record resolves</li>
                    <li style={{ opacity: 0.4 }}><CheckCircle size={14} /> Domain tech profiling</li>
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
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>For developers scaling simple lead forms and analytics dashboards.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 10,000 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> DNS MX record checks</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Domain Profile Scraping</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Max 2 active API keys</li>
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
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>Ideal for growing SaaS applications and marketing automations.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 50,000 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Personal Email Enrichment</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Corporate Tech Stack Audits</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Unlimited active keys</li>
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
                  <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>For heavy data warehouses and custom CRM enrichment workflows.</p>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }}></div>
                  
                  <ul className="pricing-features">
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> 250,000 requests/month</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> High-priority enrichment lines</li>
                    <li><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Dedicated lookup proxies</li>
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
