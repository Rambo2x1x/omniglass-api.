import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { requireRapidApiSecret, requireJwtAuth } from './middleware/auth';
import { enforceTierLimits } from './middleware/tierEnforcer';
import { prisma } from './services/db';
import {
  verifyEmailDeliverability,
  profileDomain,
  enrichEmailAddress,
  validatePhoneNumber
} from './services/enricher';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(enforceTierLimits);

// ==========================================================
// PUBLIC B2B ENDPOINTS (Routed via RapidAPI or X-API-Key)
// ==========================================================

// 1. Verify Email Deliverability
app.get('/v1/verify/email', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing email query parameter.' });
    return;
  }

  try {
    const syntaxOnly = req.query.syntaxOnly === 'true' || req.body?.syntaxOnly === true;
    const data = await verifyEmailDeliverability(email, syntaxOnly);
    res.json(data);
  } catch (error: any) {
    console.error('[API] Email verification error:', error);
    res.status(500).json({ error: 'Verification Failed', message: error.message });
  }
});

app.post('/v1/verify/email', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing email parameter in request body.' });
    return;
  }

  try {
    const syntaxOnly = req.query.syntaxOnly === 'true' || req.body?.syntaxOnly === true;
    const data = await verifyEmailDeliverability(email, syntaxOnly);
    res.json(data);
  } catch (error: any) {
    console.error('[API] Email verification error:', error);
    res.status(500).json({ error: 'Verification Failed', message: error.message });
  }
});

// 2. Enrich Domain Profile
app.get('/v1/enrich/domain', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const domain = req.query.domain as string;
  if (!domain) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing domain query parameter.' });
    return;
  }

  try {
    const data = await profileDomain(domain);
    res.json(data);
  } catch (error: any) {
    console.error('[API] Domain enrichment error:', error);
    res.status(500).json({ error: 'Enrichment Failed', message: error.message });
  }
});

app.post('/v1/enrich/domain', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.body;
  if (!domain) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing domain parameter in request body.' });
    return;
  }

  try {
    const data = await profileDomain(domain);
    res.json(data);
  } catch (error: any) {
    console.error('[API] Domain enrichment error:', error);
    res.status(500).json({ error: 'Enrichment Failed', message: error.message });
  }
});

// 3. Enrich Email and Company Profile
app.get('/v1/enrich/email', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing email query parameter.' });
    return;
  }

  try {
    const data = await enrichEmailAddress(email);
    res.json(data);
  } catch (error: any) {
    console.error('[API] Email enrichment error:', error);
    res.status(500).json({ error: 'Enrichment Failed', message: error.message });
  }
});

app.post('/v1/enrich/email', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing email parameter in request body.' });
    return;
  }

  try {
    const data = await enrichEmailAddress(email);
    res.json(data);
  } catch (error: any) {
    console.error('[API] Email enrichment error:', error);
    res.status(500).json({ error: 'Enrichment Failed', message: error.message });
  }
});

// 4. Validate Phone Formats
app.get('/v1/verify/phone', requireRapidApiSecret, async (req: Request, res: Response): Promise<void> => {
  const phone = req.query.phone as string;
  if (!phone) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing phone query parameter.' });
    return;
  }

  try {
    const data = await validatePhoneNumber(phone);
    res.json(data);
  } catch (error: any) {
    console.error('[API] Phone validation error:', error);
    res.status(500).json({ error: 'Validation Failed', message: error.message });
  }
});


// ==========================================================
// SAAS PORTAL DEVELOPER DASHBOARD ENDPOINTS
// ==========================================================

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_omniscrape_key_123!';

// 1. User Registration
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Bad Request', message: 'Email and password are required.' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User Exists', message: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        plan: 'FREE',
      },
    });

    const token = jwt.sign({ userId: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Register] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 2. User Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Bad Request', message: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Login] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 3. Get User Profile
app.get('/api/user', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User account not found.' });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 4. Update User Subscription Plan
app.put('/api/user/plan', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  const { plan } = req.body;
  if (!plan || !['FREE', 'STARTER', 'GROWTH', 'SCALE'].includes(plan.toUpperCase())) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid or missing plan value.' });
    return;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { plan: plan.toUpperCase() },
    });
    res.json({ plan: updatedUser.plan });
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 5. Get API Keys list
app.get('/api/keys', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: payload.userId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      createdAt: k.createdAt,
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 6. Generate new API Key
app.post('/api/keys', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Bad Request', message: 'API key name/label is required.' });
    return;
  }

  try {
    const rawKey = 'os_' + crypto.randomBytes(24).toString('hex');
    const visualPrefix = rawKey.substring(0, 7);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await prisma.apiKey.create({
      data: {
        userId: payload.userId,
        name,
        keyHash,
        keyPrefix: visualPrefix,
        active: true,
      },
    });

    res.status(201).json({ key: rawKey, keyPrefix: visualPrefix });
  } catch (err: any) {
    console.error('[CreateKey] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 7. Revoke/Delete API Key
app.delete('/api/keys/:id', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;
  const keyId = req.params.id;

  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: payload.userId },
    });

    if (!key) {
      res.status(404).json({ error: 'Not Found', message: 'API key not found or access denied.' });
      return;
    }

    await prisma.apiKey.delete({ where: { id: keyId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// 8. Get Developer Analytics metrics
app.get('/api/analytics', requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const payload = (req as any).user;

  try {
    const userKeys = await prisma.apiKey.findMany({
      where: { userId: payload.userId },
      select: { id: true }
    });
    
    const keyIds = userKeys.map(k => k.id);

    if (keyIds.length === 0) {
      res.json({
        metrics: { totalRequests: 0, avgLatency: 0, successRate: 100 },
        chartData: getChartData([]),
        recentRequests: [],
      });
      return;
    }

    const usages = await prisma.apiUsage.findMany({
      where: { apiKeyId: { in: keyIds } },
      orderBy: { timestamp: 'desc' },
    });

    const totalRequests = usages.length;
    const avgLatency = totalRequests > 0
      ? Math.round(usages.reduce((sum, u) => sum + u.responseTimeMs, 0) / totalRequests)
      : 0;
    const successfulRequests = usages.filter(u => u.statusCode < 400).length;
    const successRate = totalRequests > 0
      ? Math.round((successfulRequests / totalRequests) * 100)
      : 100;

    const chartData = getChartData(usages);

    const recentRequests = usages.slice(0, 10).map(u => ({
      id: u.id,
      endpoint: u.endpoint,
      statusCode: u.statusCode,
      responseTimeMs: u.responseTimeMs,
      timestamp: u.timestamp,
    }));

    res.json({
      metrics: { totalRequests, avgLatency, successRate },
      chartData,
      recentRequests,
    });
  } catch (err: any) {
    console.error('[Analytics] Error:', err);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Helper function to bucket api usage logs into last 7 calendar days (Verify, Enrich, Phone)
function getChartData(usages: any[]) {
  const chartMap = new Map<string, { date: string; Verify: number; Enrich: number; Phone: number }>();
  
  // Pre-populate last 7 days with zeroed metrics
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    chartMap.set(dateStr, { date: dateStr, Verify: 0, Enrich: 0, Phone: 0 });
  }

  // Aggregate logs by date and endpoint type
  usages.forEach((usage) => {
    const dateStr = new Date(usage.timestamp).toISOString().split('T')[0];
    const item = chartMap.get(dateStr);
    if (item) {
      const endpoint = (usage.endpoint || '').toLowerCase();
      if (endpoint.includes('verify/email')) {
        item.Verify++;
      } else if (endpoint.includes('enrich')) {
        item.Enrich++;
      } else if (endpoint.includes('verify/phone')) {
        item.Phone++;
      }
    }
  });

  return Array.from(chartMap.values());
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'leadglass-api', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`LeadGlass B2B API backend server is running on http://localhost:${PORT}`);
});
