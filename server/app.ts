import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { AnalyticsRange, ClickSource, GroupCategory } from '../src/types.ts';
import { realtimeBus } from './realtime.ts';
import { normalizeSlug, parseUserAgent, repository } from './repository.ts';

function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || 'smplink-session-signing-key-2026';
}

function signSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      iat: Date.now(),
      exp: Date.now() + 7 * 86_400_000,
      role: 'school_admin',
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      exp?: number;
    };
    return typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function extractToken(req: Request): string | null {
  const headerToken = req.header('x-dashboard-token');
  if (headerToken) return headerToken;

  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();

  if (typeof req.query.token === 'string' && req.query.token) {
    return req.query.token;
  }

  const cookieHeader = req.header('cookie');
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k === 'smplink_session') {
        return decodeURIComponent(rest.join('='));
      }
    }
  }
  return null;
}

function requirePinAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Masukkan PIN staf.' });
    return;
  }
  next();
}

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: repository.getMode(),
      supabaseConfigured: repository.isSupabaseConfigured(),
    });
  });

  // Auth status & PIN verification
  app.get('/api/auth/status', async (req, res) => {
    const token = extractToken(req);
    const authenticated = verifySessionToken(token);
    const [profile, activePin] = await Promise.all([
      repository.getProfile(),
      repository.getDashboardPin(),
    ]);
    res.json({
      authenticated,
      isDefaultPin: activePin === '2026',
      profile,
    });
  });

  app.post('/api/auth/verify', async (req, res) => {
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const activePin = await repository.getDashboardPin();

    if (!pin || pin !== activePin) {
      res.status(401).json({ error: 'PIN salah. Silakan periksa kembali 4 digit PIN staf sekolah.' });
      return;
    }

    const token = signSessionToken();
    res.cookie('smplink_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 86_400_000,
      path: '/',
    });
    res.json({ ok: true, token });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('smplink_session', { path: '/' });
    res.json({ ok: true });
  });

  // Public School Profile (used on PIN Gate & Public Directories)
  app.get('/api/public/profile', async (_req, res) => {
    try {
      const profile = await repository.getProfile();
      res.json({ profile });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat profil.' });
    }
  });

  // Public Event Directory (no PIN required)
  app.get('/api/public/events/:groupSlug', async (req, res) => {
    try {
      const groupSlug = normalizeSlug(req.params.groupSlug);
      const [profile, group, allLinks] = await Promise.all([
        repository.getProfile(),
        repository.getGroupBySlug(groupSlug),
        repository.listLinks(),
      ]);

      if (!group || !group.isPublicDirectory) {
        res.status(404).json({ error: 'Portal direktori event tidak ditemukan atau tidak dipublikasikan.' });
        return;
      }

      const groupLinks = allLinks.filter((l) => l.groupId === group.id);
      const activeLinks = groupLinks.filter((l) => l.status === 'active');
      const upcomingLinks = groupLinks.filter((l) => l.status === 'scheduled');

      res.json({
        profile,
        group,
        links: activeLinks,
        upcomingLinks,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat direktori.' });
    }
  });

  // Public Link Status Lookup (for /status/:slug notice screen)
  app.get('/api/public/link-status/:slug', async (req, res) => {
    try {
      const slug = normalizeSlug(req.params.slug);
      const [profile, link, groups] = await Promise.all([
        repository.getProfile(),
        repository.getLinkBySlug(slug),
        repository.listGroups(),
      ]);
      if (!link) {
        res.json({ profile, found: false, status: 'not_found', link: null, group: null });
        return;
      }
      const group = groups.find((g) => g.id === link.groupId) ?? null;
      res.json({
        profile,
        found: true,
        status: link.status,
        link: {
          title: link.title,
          slug: link.slug,
          startsAt: link.startsAt,
          expiresAt: link.expiresAt,
        },
        group: group && group.isPublicDirectory ? { name: group.name, slug: group.slug } : null,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memeriksa status tautan.' });
    }
  });

  // REAL REDIRECT & REAL-TIME CLICK TRACKING ENDPOINT
  app.get('/go/:slug', async (req, res) => {
    try {
      const slug = normalizeSlug(req.params.slug);
      const link = await repository.getLinkBySlug(slug);

      if (!link) {
        res.redirect(302, `/status/${encodeURIComponent(slug)}?reason=not_found`);
        return;
      }

      if (link.status !== 'active') {
        res.redirect(302, `/status/${encodeURIComponent(slug)}?reason=${link.status}`);
        return;
      }

      const groups = await repository.listGroups();
      const group = groups.find((g) => g.id === link.groupId);
      const groupName = group?.name ?? 'Umum';

      const ua = req.header('user-agent') || '';
      const { deviceType, summary } = parseUserAgent(ua);
      const rawReferer = req.header('referer') || '';
      const srcParam = typeof req.query.src === 'string' ? req.query.src : '';

      let source: ClickSource = 'Direct / QR';
      let referrerLabel = 'Langsung / QR Code';

      if (
        srcParam === 'directory' ||
        rawReferer.includes('/event/') ||
        rawReferer.includes('/e/')
      ) {
        source = 'Direktori Event';
        referrerLabel = group ? `/${group.slug}` : 'Direktori Event';
      } else if (srcParam === 'qr') {
        source = 'Direct / QR';
        referrerLabel = 'Pemindaian QR Code';
      } else if (
        /whatsapp|t\.me|telegram|instagram|facebook|twitter|x\.com|classroom\.google/i.test(
          rawReferer
        )
      ) {
        source = 'Media Sosial / Chat';
        referrerLabel = rawReferer;
      } else if (rawReferer) {
        referrerLabel = rawReferer;
      }

      const { click, linkClickCount } = await repository.recordClick({
        link,
        groupName,
        deviceType,
        source,
        referrer: referrerLabel,
        userAgentSummary: summary,
      });

      realtimeBus.broadcast({
        type: 'click:recorded',
        click,
        linkClickCount,
      });

      res.redirect(302, link.destinationUrl);
    } catch (err) {
      console.error('Redirect error:', err);
      res.status(500).send('Terjadi kesalahan saat mengalihkan tautan.');
    }
  });

  // =========================================================================
  // PROTECTED DASHBOARD ENDPOINTS (PIN Required)
  // =========================================================================

  app.get('/api/analytics/live', requirePinAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    realtimeBus.addClient(res);
  });

  app.get('/api/dashboard/bootstrap', requirePinAuth, async (req, res) => {
    try {
      const range = (req.query.range as AnalyticsRange) || '7d';
      const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
      const [profile, groups, links, analytics] = await Promise.all([
        repository.getProfile(),
        repository.listGroups(),
        repository.listLinks(),
        repository.getAnalyticsSummary({ range, groupId }),
      ]);
      res.json({
        mode: repository.getMode(),
        profile,
        groups,
        links,
        analytics,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat dashboard.' });
    }
  });

  app.get('/api/analytics', requirePinAuth, async (req, res) => {
    try {
      const rangeParam = req.query.range;
      const range: AnalyticsRange =
        rangeParam === '24h' || rangeParam === '7d' || rangeParam === '30d' ? rangeParam : '7d';
      const groupId = typeof req.query.groupId === 'string' && req.query.groupId ? req.query.groupId : undefined;
      const linkId = typeof req.query.linkId === 'string' && req.query.linkId ? req.query.linkId : undefined;
      const analytics = await repository.getAnalyticsSummary({ range, groupId, linkId });
      res.json({ analytics });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat analitik.' });
    }
  });

  app.get('/api/links/check-slug', requirePinAuth, async (req, res) => {
    try {
      const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
      const excludeId = typeof req.query.excludeId === 'string' ? req.query.excludeId : undefined;
      const normalized = normalizeSlug(slug);
      const available = await repository.isSlugAvailable(normalized, excludeId);
      res.json({ normalized, available });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memeriksa slug.' });
    }
  });

  app.post('/api/links', requirePinAuth, async (req, res) => {
    try {
      const { groupId, title, slug, destinationUrl, isActive, startsAt, expiresAt } = req.body ?? {};
      if (!groupId || !title || !slug || !destinationUrl) {
        res.status(400).json({ error: 'Grup, judul, slug kustom, dan URL tujuan wajib diisi.' });
        return;
      }
      const link = await repository.createLink({
        groupId,
        title,
        slug,
        destinationUrl,
        isActive,
        startsAt: startsAt || null,
        expiresAt: expiresAt || null,
      });
      realtimeBus.broadcast({ type: 'data:updated', scope: 'links' });
      res.status(201).json({ link });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal membuat tautan.' });
    }
  });

  app.patch('/api/links/:id', requirePinAuth, async (req, res) => {
    try {
      const link = await repository.updateLink(req.params.id, req.body ?? {});
      realtimeBus.broadcast({ type: 'data:updated', scope: 'links' });
      res.json({ link });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui tautan.' });
    }
  });

  app.delete('/api/links/:id', requirePinAuth, async (req, res) => {
    try {
      await repository.deleteLink(req.params.id);
      realtimeBus.broadcast({ type: 'data:updated', scope: 'links' });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menghapus tautan.' });
    }
  });

  // Trigger a tracked server-side test visit (useful for verifying live analytics directly from dashboard)
  app.post('/api/links/:id/test-visit', requirePinAuth, async (req, res) => {
    try {
      const links = await repository.listLinks();
      const link = links.find((l) => l.id === req.params.id);
      if (!link) {
        res.status(404).json({ error: 'Link tidak ditemukan.' });
        return;
      }
      if (link.status !== 'active') {
        res.status(400).json({ error: 'Link belum aktif atau sudah kedaluwarsa.' });
        return;
      }
      const groups = await repository.listGroups();
      const group = groups.find((g) => g.id === link.groupId);
      const ua = req.header('user-agent') || '';
      const { deviceType, summary } = parseUserAgent(ua);

      const { click, linkClickCount } = await repository.recordClick({
        link,
        groupName: group?.name ?? 'Umum',
        deviceType,
        source: 'Direct / QR',
        referrer: 'Uji Kunjungan Dashboard',
        userAgentSummary: summary,
      });

      realtimeBus.broadcast({
        type: 'click:recorded',
        click,
        linkClickCount,
      });
      res.json({ ok: true, click, linkClickCount });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mencatat uji klik.' });
    }
  });

  app.post('/api/groups', requirePinAuth, async (req, res) => {
    try {
      const { name, slug, category, description, accentColor, isPublicDirectory } = req.body ?? {};
      if (!name || !slug || !category) {
        res.status(400).json({ error: 'Nama grup, slug direktori, dan kategori wajib diisi.' });
        return;
      }
      const group = await repository.createGroup({
        name,
        slug,
        category: category as GroupCategory,
        description: description || '',
        accentColor,
        isPublicDirectory,
      });
      realtimeBus.broadcast({ type: 'data:updated', scope: 'groups' });
      res.status(201).json({ group });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal membuat grup.' });
    }
  });

  app.patch('/api/groups/:id', requirePinAuth, async (req, res) => {
    try {
      const group = await repository.updateGroup(req.params.id, req.body ?? {});
      realtimeBus.broadcast({ type: 'data:updated', scope: 'groups' });
      res.json({ group });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui grup.' });
    }
  });

  app.delete('/api/groups/:id', requirePinAuth, async (req, res) => {
    try {
      await repository.deleteGroup(req.params.id);
      realtimeBus.broadcast({ type: 'data:updated', scope: 'all' });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menghapus grup.' });
    }
  });

  app.put('/api/groups/:id/reorder-links', requirePinAuth, async (req, res) => {
    try {
      const linkIds = Array.isArray(req.body?.linkIds) ? (req.body.linkIds as string[]) : null;
      if (!linkIds) {
        res.status(400).json({ error: 'Daftar urutan link (linkIds) tidak valid.' });
        return;
      }
      const links = await repository.reorderGroupLinks(req.params.id, linkIds);
      realtimeBus.broadcast({ type: 'data:updated', scope: 'links' });
      res.json({ ok: true, links });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan urutan link.' });
    }
  });

  app.put('/api/profile', requirePinAuth, async (req, res) => {
    try {
      const {
        schoolName,
        tabTitle,
        npsn,
        tagline,
        websiteUrl,
        contactInfo,
        address,
        logoUrl,
        socialLinks,
      } = req.body ?? {};
      if (!schoolName || typeof schoolName !== 'string' || !schoolName.trim()) {
        res.status(400).json({ error: 'Nama sekolah wajib diisi.' });
        return;
      }
      const profile = await repository.updateProfile({
        schoolName,
        tabTitle,
        npsn,
        tagline,
        websiteUrl,
        contactInfo,
        address,
        logoUrl,
        socialLinks,
      });
      realtimeBus.broadcast({ type: 'data:updated', scope: 'profile' });
      res.json({ profile });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan profil sekolah.' });
    }
  });

  app.get('/api/settings/info', requirePinAuth, async (_req, res) => {
    const activePin = await repository.getDashboardPin();
    res.json({
      mode: repository.getMode(),
      supabaseConfigured: repository.isSupabaseConfigured(),
      hasCustomPin: activePin !== '2026',
      sqlSchema: repository.getSqlSchema(),
    });
  });

  app.post('/api/settings/test-supabase', requirePinAuth, async (_req, res) => {
    const result = await repository.testSupabaseConnection();
    res.json(result);
  });

  app.post('/api/settings/update-pin', requirePinAuth, async (req, res) => {
    try {
      const newPin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
      await repository.updateDashboardPin(newPin);
      res.json({
        ok: true,
        message: 'PIN 4 digit berhasil disimpan ke profil sekolah.',
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal memperbarui PIN.',
      });
    }
  });

  return app;
}
