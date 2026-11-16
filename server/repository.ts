import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AnalyticsRange,
  AnalyticsSummary,
  BreakdownItem,
  ClickEvent,
  ClickSource,
  DeviceType,
  GroupCategory,
  LinkScheduleStatus,
  SchoolGroup,
  SchoolLink,
  SchoolProfile,
  TimeseriesBucket,
} from '../src/types.ts';
import { createInitialSeedData, type LocalStoreData } from './seed.ts';

export function computeLinkStatus(link: {
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}): LinkScheduleStatus {
  if (!link.isActive) return 'inactive';
  const now = Date.now();
  if (link.startsAt && new Date(link.startsAt).getTime() > now) return 'scheduled';
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= now) return 'expired';
  return 'active';
}

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const RESERVED_GROUP_SLUGS = new Set([
  'api',
  'go',
  'status',
  'e',
  'event',
  'assets',
  'src',
  'node_modules',
  'public',
  'dist',
  'index-html',
]);

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseUserAgent(ua: string): { deviceType: DeviceType; summary: string } {
  const lower = ua.toLowerCase();
  let deviceType: DeviceType = 'Desktop';
  if (/ipad|tablet|playbook|silk/.test(lower) || (/android/.test(lower) && !/mobile/.test(lower))) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(lower)) {
    deviceType = 'Mobile';
  }

  let browser = 'Browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') || lower.includes('crios/')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/')) browser = 'Safari';

  let os = 'Web';
  if (lower.includes('android')) os = 'Android';
  else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
  else if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('mac os')) os = 'macOS';
  else if (lower.includes('linux')) os = 'Linux';

  return { deviceType, summary: `${browser} · ${os}` };
}

function getSqlSchemaText(): string {
  try {
    const sqlPath = path.resolve(process.cwd(), 'supabase/schema.sql');
    if (fs.existsSync(sqlPath)) {
      return fs.readFileSync(sqlPath, 'utf-8');
    }
  } catch {
    // Fallback if running in bundled serverless environment
  }
  return `-- Lihat berkas supabase/schema.sql di repositori proyek untuk skrip lengkap tabel smplink_*`;
}

// DB row interfaces matching smplink_* tables
interface DbProfileRow {
  id: string;
  school_name: string;
  npsn: string;
  tagline: string;
  website_url: string;
  contact_info: string;
  address: string;
  logo_url: string;
  tab_title?: string;
  social_links?: unknown;
  dashboard_pin?: string;
  updated_at: string;
}

interface DbGroupRow {
  id: string;
  name: string;
  slug: string;
  category: GroupCategory;
  description: string;
  accent_color: string;
  is_public_directory: boolean;
  created_at: string;
}

interface DbLinkRow {
  id: string;
  group_id: string;
  title: string;
  slug: string;
  destination_url: string;
  is_active: boolean;
  sort_order?: number;
  starts_at: string | null;
  expires_at: string | null;
  click_count: number;
  created_at: string;
  updated_at: string;
}

interface DbClickRow {
  id: string;
  link_id: string;
  group_id: string;
  clicked_at: string;
  device_type: DeviceType;
  source: ClickSource;
  referrer: string;
  user_agent_summary: string;
}

class SchoolLinkRepository {
  private localStore: LocalStoreData;
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.localStore = createInitialSeedData();
    this.initSupabaseIfConfigured();
  }

  private initSupabaseIfConfigured() {
    const url = process.env.SUPABASE_URL?.trim();
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim();
    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
      });
    } else {
      this.supabase = null;
    }
  }

  getMode(): 'local' | 'supabase' {
    return this.supabase ? 'supabase' : 'local';
  }

  isSupabaseConfigured(): boolean {
    return Boolean(this.supabase);
  }

  getSqlSchema(): string {
    return getSqlSchemaText();
  }

  async testSupabaseConnection(): Promise<{
    ok: boolean;
    message: string;
    tablesReady: boolean;
  }> {
    if (!this.supabase) {
      return {
        ok: false,
        tablesReady: false,
        message: 'Variabel SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.',
      };
    }

    try {
      const { error } = await this.supabase
        .from('smplink_school_profile')
        .select('id')
        .limit(1);

      if (error) {
        return {
          ok: false,
          tablesReady: false,
          message: `Terhubung ke Supabase, tetapi tabel smplink_* belum siap: ${error.message}`,
        };
      }

      return {
        ok: true,
        tablesReady: true,
        message: 'Koneksi Supabase berhasil dan seluruh tabel smplink_* siap digunakan.',
      };
    } catch (err) {
      return {
        ok: false,
        tablesReady: false,
        message: err instanceof Error ? err.message : 'Gagal menghubungi Supabase.',
      };
    }
  }

  async getProfile(): Promise<SchoolProfile> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('smplink_school_profile')
        .select('*')
        .eq('id', 'default')
        .maybeSingle<DbProfileRow>();
      if (!error && data) {
        return {
          id: data.id,
          schoolName: data.school_name,
          tabTitle: data.tab_title ?? '',
          npsn: data.npsn,
          tagline: data.tagline,
          websiteUrl: data.website_url,
          contactInfo: data.contact_info,
          address: data.address,
          logoUrl: data.logo_url,
          socialLinks: Array.isArray(data.social_links) ? data.social_links : [],
          updatedAt: data.updated_at,
        };
      }
    }
    return {
      ...this.localStore.profile,
      socialLinks: [...this.localStore.profile.socialLinks],
    };
  }

  async updateProfile(input: Partial<Omit<SchoolProfile, 'id' | 'updatedAt'>>): Promise<SchoolProfile> {
    const current = await this.getProfile();
    const updated: SchoolProfile = {
      ...current,
      schoolName: input.schoolName?.trim() || current.schoolName,
      tabTitle: input.tabTitle !== undefined ? input.tabTitle.trim() : current.tabTitle,
      npsn: input.npsn !== undefined ? input.npsn.trim() : current.npsn,
      tagline: input.tagline !== undefined ? input.tagline.trim() : current.tagline,
      websiteUrl: input.websiteUrl !== undefined ? input.websiteUrl.trim() : current.websiteUrl,
      contactInfo: input.contactInfo !== undefined ? input.contactInfo.trim() : current.contactInfo,
      address: input.address !== undefined ? input.address.trim() : current.address,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl.trim() : current.logoUrl,
      socialLinks: Array.isArray(input.socialLinks)
        ? input.socialLinks
            .filter((s) => s && s.url && s.url.trim())
            .map((s) => ({
              id: s.id || crypto.randomUUID(),
              platform: s.platform,
              label: (s.label || s.platform).trim(),
              url: s.url.trim(),
            }))
        : current.socialLinks,
      updatedAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('smplink_school_profile').upsert({
        id: 'default',
        school_name: updated.schoolName,
        tab_title: updated.tabTitle,
        npsn: updated.npsn,
        tagline: updated.tagline,
        website_url: updated.websiteUrl,
        contact_info: updated.contactInfo,
        address: updated.address,
        logo_url: updated.logoUrl,
        social_links: updated.socialLinks,
        updated_at: updated.updatedAt,
      });
      if (error) throw new Error(error.message);
      return updated;
    }

    this.localStore.profile = updated;
    return { ...updated, socialLinks: [...updated.socialLinks] };
  }

  async getDashboardPin(): Promise<string> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('smplink_school_profile')
        .select('dashboard_pin')
        .eq('id', 'default')
        .maybeSingle<{ dashboard_pin?: string }>();
      if (!error && data?.dashboard_pin) {
        return data.dashboard_pin.trim();
      }
    }
    return this.localStore.dashboardPin || '2026';
  }

  async updateDashboardPin(newPin: string): Promise<void> {
    const cleanPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      throw new Error('PIN dashboard harus terdiri dari tepat 4 digit angka.');
    }

    if (this.supabase) {
      const current = await this.getProfile();
      const { error } = await this.supabase.from('smplink_school_profile').upsert({
        id: 'default',
        school_name: current.schoolName,
        tab_title: current.tabTitle,
        npsn: current.npsn,
        tagline: current.tagline,
        website_url: current.websiteUrl,
        contact_info: current.contactInfo,
        address: current.address,
        logo_url: current.logoUrl,
        social_links: current.socialLinks,
        dashboard_pin: cleanPin,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      return;
    }

    this.localStore.dashboardPin = cleanPin;
  }

  async listGroups(): Promise<SchoolGroup[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('smplink_groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as DbGroupRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        category: row.category,
        description: row.description,
        accentColor: row.accent_color,
        isPublicDirectory: row.is_public_directory,
        createdAt: row.created_at,
      }));
    }
    return [...this.localStore.groups].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getGroupBySlug(slug: string): Promise<SchoolGroup | null> {
    const groups = await this.listGroups();
    return groups.find((g) => g.slug === slug) ?? null;
  }

  async createGroup(input: {
    name: string;
    slug: string;
    category: GroupCategory;
    description: string;
    accentColor?: string;
    isPublicDirectory?: boolean;
  }): Promise<SchoolGroup> {
    const slug = normalizeSlug(input.slug);
    if (!slug) throw new Error('Slug grup tidak valid.');
    if (RESERVED_GROUP_SLUGS.has(slug)) {
      throw new Error(`Slug "/${slug}" dicadangkan oleh sistem. Gunakan nama event lain.`);
    }

    const existing = await this.listGroups();
    if (existing.some((g) => g.slug === slug)) {
      throw new Error(`Slug direktori "${slug}" sudah dipakai oleh grup lain.`);
    }

    const created: SchoolGroup = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      slug,
      category: input.category,
      description: input.description.trim(),
      accentColor: input.accentColor || '#3B82F6',
      isPublicDirectory: input.isPublicDirectory ?? true,
      createdAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('smplink_groups')
        .insert({
          id: created.id,
          name: created.name,
          slug: created.slug,
          category: created.category,
          description: created.description,
          accent_color: created.accentColor,
          is_public_directory: created.isPublicDirectory,
          created_at: created.createdAt,
        })
        .select()
        .single<DbGroupRow>();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        category: data.category,
        description: data.description,
        accentColor: data.accent_color,
        isPublicDirectory: data.is_public_directory,
        createdAt: data.created_at,
      };
    }

    this.localStore.groups.unshift(created);
    return created;
  }

  async updateGroup(
    id: string,
    input: Partial<{
      name: string;
      slug: string;
      category: GroupCategory;
      description: string;
      accentColor: string;
      isPublicDirectory: boolean;
    }>
  ): Promise<SchoolGroup> {
    const existing = await this.listGroups();
    const current = existing.find((g) => g.id === id);
    if (!current) throw new Error('Grup tidak ditemukan.');

    const nextSlug = input.slug !== undefined ? normalizeSlug(input.slug) : current.slug;
    if (!nextSlug) throw new Error('Slug grup tidak valid.');
    if (RESERVED_GROUP_SLUGS.has(nextSlug)) {
      throw new Error(`Slug "/${nextSlug}" dicadangkan oleh sistem. Gunakan nama event lain.`);
    }
    if (existing.some((g) => g.id !== id && g.slug === nextSlug)) {
      throw new Error(`Slug direktori "${nextSlug}" sudah dipakai.`);
    }

    const updated: SchoolGroup = {
      ...current,
      name: input.name !== undefined ? input.name.trim() : current.name,
      slug: nextSlug,
      category: input.category ?? current.category,
      description: input.description !== undefined ? input.description.trim() : current.description,
      accentColor: input.accentColor ?? current.accentColor,
      isPublicDirectory:
        input.isPublicDirectory !== undefined ? input.isPublicDirectory : current.isPublicDirectory,
    };

    if (this.supabase) {
      const { error } = await this.supabase
        .from('smplink_groups')
        .update({
          name: updated.name,
          slug: updated.slug,
          category: updated.category,
          description: updated.description,
          accent_color: updated.accentColor,
          is_public_directory: updated.isPublicDirectory,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return updated;
    }

    const idx = this.localStore.groups.findIndex((g) => g.id === id);
    if (idx !== -1) this.localStore.groups[idx] = updated;
    return updated;
  }

  async deleteGroup(id: string): Promise<void> {
    if (this.supabase) {
      const { error } = await this.supabase.from('smplink_groups').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }

    const removedLinkIds = new Set(
      this.localStore.links.filter((l) => l.groupId === id).map((l) => l.id)
    );
    this.localStore.groups = this.localStore.groups.filter((g) => g.id !== id);
    this.localStore.links = this.localStore.links.filter((l) => l.groupId !== id);
    this.localStore.clicks = this.localStore.clicks.filter((c) => !removedLinkIds.has(c.linkId));
  }

  async listLinks(): Promise<SchoolLink[]> {
    const sortByManualOrder = (items: SchoolLink[]) =>
      items.sort((a, b) => {
        const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('smplink_links')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped: SchoolLink[] = (data as DbLinkRow[]).map((row) => ({
        id: row.id,
        groupId: row.group_id,
        title: row.title,
        slug: row.slug,
        destinationUrl: row.destination_url,
        isActive: row.is_active,
        sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
        startsAt: row.starts_at,
        expiresAt: row.expires_at,
        clickCount: row.click_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: computeLinkStatus({
          isActive: row.is_active,
          startsAt: row.starts_at,
          expiresAt: row.expires_at,
        }),
      }));
      return sortByManualOrder(mapped);
    }

    return sortByManualOrder(
      this.localStore.links.map((l) => ({
        ...l,
        sortOrder: l.sortOrder ?? 0,
        status: computeLinkStatus(l),
      }))
    );
  }

  async getLinkBySlug(slug: string): Promise<SchoolLink | null> {
    const clean = normalizeSlug(slug);
    const links = await this.listLinks();
    return links.find((l) => l.slug === clean) ?? null;
  }

  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    const clean = normalizeSlug(slug);
    if (!clean) return false;
    const links = await this.listLinks();
    return !links.some((l) => l.slug === clean && l.id !== excludeId);
  }

  async createLink(input: {
    groupId: string;
    title: string;
    slug: string;
    destinationUrl: string;
    isActive?: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
  }): Promise<SchoolLink> {
    const slug = normalizeSlug(input.slug);
    if (!slug) throw new Error('Custom slug wajib diisi dengan huruf/angka.');
    if (!isValidHttpUrl(input.destinationUrl)) {
      throw new Error('URL tujuan harus diawali dengan http:// atau https://');
    }
    if (
      input.startsAt &&
      input.expiresAt &&
      new Date(input.expiresAt).getTime() <= new Date(input.startsAt).getTime()
    ) {
      throw new Error('Tanggal kedaluwarsa harus lebih lambat daripada tanggal mulai aktif.');
    }

    const available = await this.isSlugAvailable(slug);
    if (!available) {
      throw new Error(`Slug "/go/${slug}" sudah digunakan. Pilih kombinasi lain.`);
    }

    const existingLinks = await this.listLinks();
    const maxSortOrder = existingLinks
      .filter((l) => l.groupId === input.groupId)
      .reduce((max, l) => Math.max(max, l.sortOrder ?? 0), 0);

    const nowIso = new Date().toISOString();
    const base = {
      id: crypto.randomUUID(),
      groupId: input.groupId,
      title: input.title.trim(),
      slug,
      destinationUrl: input.destinationUrl.trim(),
      isActive: input.isActive ?? true,
      sortOrder: maxSortOrder + 1,
      startsAt: input.startsAt || null,
      expiresAt: input.expiresAt || null,
      clickCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.supabase) {
      const insertPayload = {
        id: base.id,
        group_id: base.groupId,
        title: base.title,
        slug: base.slug,
        destination_url: base.destinationUrl,
        is_active: base.isActive,
        sort_order: base.sortOrder,
        starts_at: base.startsAt,
        expires_at: base.expiresAt,
        click_count: 0,
        created_at: base.createdAt,
        updated_at: base.updatedAt,
      };
      const { error } = await this.supabase.from('smplink_links').insert(insertPayload);
      if (error) {
        if (error.message.includes('sort_order')) {
          const { sort_order: _ignored, ...fallbackPayload } = insertPayload;
          const retry = await this.supabase.from('smplink_links').insert(fallbackPayload);
          if (retry.error) throw new Error(retry.error.message);
        } else {
          throw new Error(error.message);
        }
      }
    } else {
      this.localStore.links.unshift(base);
    }

    return {
      ...base,
      status: computeLinkStatus(base),
    };
  }

  async updateLink(
    id: string,
    input: Partial<{
      groupId: string;
      title: string;
      slug: string;
      destinationUrl: string;
      isActive: boolean;
      sortOrder: number;
      startsAt: string | null;
      expiresAt: string | null;
    }>
  ): Promise<SchoolLink> {
    const links = await this.listLinks();
    const current = links.find((l) => l.id === id);
    if (!current) throw new Error('Link tidak ditemukan.');

    const nextSlug = input.slug !== undefined ? normalizeSlug(input.slug) : current.slug;
    if (!nextSlug) throw new Error('Custom slug tidak valid.');

    const nextDest =
      input.destinationUrl !== undefined ? input.destinationUrl.trim() : current.destinationUrl;
    if (!isValidHttpUrl(nextDest)) {
      throw new Error('URL tujuan harus diawali dengan http:// atau https://');
    }

    const startsAt = input.startsAt !== undefined ? input.startsAt : current.startsAt;
    const expiresAt = input.expiresAt !== undefined ? input.expiresAt : current.expiresAt;
    if (startsAt && expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
      throw new Error('Tanggal kedaluwarsa harus lebih lambat daripada tanggal mulai aktif.');
    }

    const available = await this.isSlugAvailable(nextSlug, id);
    if (!available) {
      throw new Error(`Slug "/go/${nextSlug}" sudah digunakan.`);
    }

    const updatedBase = {
      id: current.id,
      groupId: input.groupId ?? current.groupId,
      title: input.title !== undefined ? input.title.trim() : current.title,
      slug: nextSlug,
      destinationUrl: nextDest,
      isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      sortOrder: typeof input.sortOrder === 'number' ? input.sortOrder : current.sortOrder,
      startsAt,
      expiresAt,
      clickCount: current.clickCount,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const updatePayload = {
        group_id: updatedBase.groupId,
        title: updatedBase.title,
        slug: updatedBase.slug,
        destination_url: updatedBase.destinationUrl,
        is_active: updatedBase.isActive,
        sort_order: updatedBase.sortOrder,
        starts_at: updatedBase.startsAt,
        expires_at: updatedBase.expiresAt,
        updated_at: updatedBase.updatedAt,
      };
      const { error } = await this.supabase
        .from('smplink_links')
        .update(updatePayload)
        .eq('id', id);
      if (error) {
        if (error.message.includes('sort_order')) {
          const { sort_order: _ignored, ...fallbackPayload } = updatePayload;
          const retry = await this.supabase
            .from('smplink_links')
            .update(fallbackPayload)
            .eq('id', id);
          if (retry.error) throw new Error(retry.error.message);
        } else {
          throw new Error(error.message);
        }
      }
    } else {
      const idx = this.localStore.links.findIndex((l) => l.id === id);
      if (idx !== -1) this.localStore.links[idx] = updatedBase;
    }

    return {
      ...updatedBase,
      status: computeLinkStatus(updatedBase),
    };
  }

  async reorderGroupLinks(groupId: string, orderedLinkIds: string[]): Promise<SchoolLink[]> {
    const groups = await this.listGroups();
    if (!groups.some((g) => g.id === groupId)) {
      throw new Error('Grup event tidak ditemukan.');
    }

    const allLinks = await this.listLinks();
    const groupLinks = allLinks.filter((l) => l.groupId === groupId);
    const groupLinkIds = new Set(groupLinks.map((l) => l.id));

    const uniqueOrdered: string[] = [];
    for (const id of orderedLinkIds) {
      if (groupLinkIds.has(id) && !uniqueOrdered.includes(id)) {
        uniqueOrdered.push(id);
      }
    }
    for (const l of groupLinks) {
      if (!uniqueOrdered.includes(l.id)) {
        uniqueOrdered.push(l.id);
      }
    }

    const nowIso = new Date().toISOString();

    if (this.supabase) {
      for (let i = 0; i < uniqueOrdered.length; i++) {
        const linkId = uniqueOrdered[i];
        const { error } = await this.supabase
          .from('smplink_links')
          .update({ sort_order: i + 1, updated_at: nowIso })
          .eq('id', linkId)
          .eq('group_id', groupId);
        if (error) {
          if (error.message.includes('sort_order')) {
            throw new Error(
              'Kolom sort_order belum ditambahkan di tabel smplink_links. Jalankan query SQL migrasi di Supabase SQL Editor terlebih dahulu.'
            );
          }
          throw new Error(error.message);
        }
      }
    } else {
      const orderMap = new Map(uniqueOrdered.map((id, idx) => [id, idx + 1]));
      this.localStore.links = this.localStore.links.map((l) => {
        const nextOrder = orderMap.get(l.id);
        return nextOrder !== undefined ? { ...l, sortOrder: nextOrder, updatedAt: nowIso } : l;
      });
    }

    const updatedLinks = await this.listLinks();
    return updatedLinks.filter((l) => l.groupId === groupId);
  }

  async deleteLink(id: string): Promise<void> {
    if (this.supabase) {
      const { error } = await this.supabase.from('smplink_links').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }
    this.localStore.links = this.localStore.links.filter((l) => l.id !== id);
    this.localStore.clicks = this.localStore.clicks.filter((c) => c.linkId !== id);
  }

  async recordClick(params: {
    link: SchoolLink;
    groupName: string;
    deviceType: DeviceType;
    source: ClickSource;
    referrer: string;
    userAgentSummary: string;
  }): Promise<{ click: ClickEvent; linkClickCount: number }> {
    const click: ClickEvent = {
      id: crypto.randomUUID(),
      linkId: params.link.id,
      groupId: params.link.groupId,
      linkTitle: params.link.title,
      linkSlug: params.link.slug,
      groupName: params.groupName,
      clickedAt: new Date().toISOString(),
      deviceType: params.deviceType,
      source: params.source,
      referrer: params.referrer,
      userAgentSummary: params.userAgentSummary,
    };

    if (this.supabase) {
      const { error: insertError } = await this.supabase.from('smplink_click_events').insert({
        id: click.id,
        link_id: click.linkId,
        group_id: click.groupId,
        clicked_at: click.clickedAt,
        device_type: click.deviceType,
        source: click.source,
        referrer: click.referrer,
        user_agent_summary: click.userAgentSummary,
      });
      if (insertError) throw new Error(insertError.message);

      // Try RPC first, fallback to direct update
      const { error: rpcError } = await this.supabase.rpc('increment_smplink_link_clicks', {
        target_link_id: params.link.id,
      });

      const nextCount = params.link.clickCount + 1;
      if (rpcError) {
        await this.supabase
          .from('smplink_links')
          .update({ click_count: nextCount, updated_at: click.clickedAt })
          .eq('id', params.link.id);
      }

      return { click, linkClickCount: nextCount };
    }

    this.localStore.clicks.unshift(click);
    // Keep max 2000 clicks in local memory
    if (this.localStore.clicks.length > 2000) {
      this.localStore.clicks.length = 2000;
    }

    const linkRecord = this.localStore.links.find((l) => l.id === params.link.id);
    if (linkRecord) {
      linkRecord.clickCount += 1;
      linkRecord.updatedAt = click.clickedAt;
      return { click, linkClickCount: linkRecord.clickCount };
    }
    return { click, linkClickCount: params.link.clickCount + 1 };
  }

  async getClickEvents(range: AnalyticsRange): Promise<ClickEvent[]> {
    const now = Date.now();
    const windowMs =
      range === '24h'
        ? 24 * 3600_000
        : range === '7d'
        ? 7 * 86_400_000
        : 30 * 86_400_000;
    const cutoffIso = new Date(now - windowMs).toISOString();

    if (this.supabase) {
      const [links, groups, clicksRes] = await Promise.all([
        this.listLinks(),
        this.listGroups(),
        this.supabase
          .from('smplink_click_events')
          .select('*')
          .gte('clicked_at', cutoffIso)
          .order('clicked_at', { ascending: false })
          .limit(1500),
      ]);
      if (clicksRes.error) throw new Error(clicksRes.error.message);

      const linkMap = new Map(links.map((l) => [l.id, l]));
      const groupMap = new Map(groups.map((g) => [g.id, g]));

      return (clicksRes.data as DbClickRow[]).map((row) => {
        const l = linkMap.get(row.link_id);
        const g = groupMap.get(row.group_id);
        return {
          id: row.id,
          linkId: row.link_id,
          groupId: row.group_id,
          linkTitle: l?.title ?? 'Tautan Terhapus',
          linkSlug: l?.slug ?? '-',
          groupName: g?.name ?? 'Umum',
          clickedAt: row.clicked_at,
          deviceType: row.device_type,
          source: row.source,
          referrer: row.referrer,
          userAgentSummary: row.user_agent_summary,
        };
      });
    }

    const cutoffMs = now - windowMs;
    return this.localStore.clicks.filter((c) => new Date(c.clickedAt).getTime() >= cutoffMs);
  }

  async getAnalyticsSummary(options: {
    range: AnalyticsRange;
    groupId?: string;
    linkId?: string;
  }): Promise<AnalyticsSummary> {
    const { range, groupId, linkId } = options;
    const [groups, allLinks, rawClicks] = await Promise.all([
      this.listGroups(),
      this.listLinks(),
      this.getClickEvents('30d'),
    ]);

    const scopedLinks = allLinks.filter((l) => {
      if (groupId && l.groupId !== groupId) return false;
      if (linkId && l.id !== linkId) return false;
      return true;
    });

    const scopedClicks30d = rawClicks.filter((c) => {
      if (groupId && c.groupId !== groupId) return false;
      if (linkId && c.linkId !== linkId) return false;
      return true;
    });

    const now = Date.now();
    const rangeMs =
      range === '24h'
        ? 24 * 3600_000
        : range === '7d'
        ? 7 * 86_400_000
        : 30 * 86_400_000;
    const rangeCutoff = now - rangeMs;
    const scopedClicksInRange = scopedClicks30d.filter(
      (c) => new Date(c.clickedAt).getTime() >= rangeCutoff
    );

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCutoff = startOfToday.getTime();
    const oneHourCutoff = now - 3600_000;

    const clicksToday = scopedClicks30d.filter(
      (c) => new Date(c.clickedAt).getTime() >= todayCutoff
    ).length;
    const clicksLastHour = scopedClicks30d.filter(
      (c) => new Date(c.clickedAt).getTime() >= oneHourCutoff
    ).length;

    const totalClicks = scopedLinks.reduce((acc, l) => acc + l.clickCount, 0);

    // Build timeseries buckets
    const timeseries: TimeseriesBucket[] = [];
    if (range === '24h') {
      // 24 hourly buckets
      const currentHour = new Date(now);
      currentHour.setMinutes(0, 0, 0);
      for (let i = 23; i >= 0; i--) {
        const bucketStart = new Date(currentHour.getTime() - i * 3600_000);
        const bucketEnd = bucketStart.getTime() + 3600_000;
        const clicks = scopedClicksInRange.filter((c) => {
          const t = new Date(c.clickedAt).getTime();
          return t >= bucketStart.getTime() && t < bucketEnd;
        }).length;
        const hh = String(bucketStart.getHours()).padStart(2, '0');
        timeseries.push({
          label: `${hh}:00`,
          timestamp: bucketStart.toISOString(),
          clicks,
        });
      }
    } else {
      const daysCount = range === '7d' ? 7 : 30;
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      for (let i = daysCount - 1; i >= 0; i--) {
        const bucketStart = new Date(todayMidnight.getTime() - i * 86_400_000);
        const bucketEnd = bucketStart.getTime() + 86_400_000;
        const clicks = scopedClicksInRange.filter((c) => {
          const t = new Date(c.clickedAt).getTime();
          return t >= bucketStart.getTime() && t < bucketEnd;
        }).length;
        const dd = String(bucketStart.getDate()).padStart(2, '0');
        const mm = String(bucketStart.getMonth() + 1).padStart(2, '0');
        timeseries.push({
          label: `${dd}/${mm}`,
          timestamp: bucketStart.toISOString(),
          clicks,
        });
      }
    }

    // Breakdowns
    const computeBreakdown = (
      labels: string[],
      extractor: (c: ClickEvent) => string
    ): BreakdownItem[] => {
      const total = scopedClicksInRange.length;
      return labels.map((label) => {
        const count = scopedClicksInRange.filter((c) => extractor(c) === label).length;
        return {
          label,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });
    };

    const deviceBreakdown = computeBreakdown(['Mobile', 'Desktop', 'Tablet'], (c) => c.deviceType);
    const sourceBreakdown = computeBreakdown(
      ['Direct / QR', 'Direktori Event', 'Media Sosial / Chat'],
      (c) => c.source
    );

    // Top links ranked by clicks in selected range (or total if tie)
    const rangeClicksByLink = new Map<string, number>();
    for (const c of scopedClicksInRange) {
      rangeClicksByLink.set(c.linkId, (rangeClicksByLink.get(c.linkId) ?? 0) + 1);
    }
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    const topLinks = [...scopedLinks]
      .map((l) => ({
        linkId: l.id,
        title: l.title,
        slug: l.slug,
        groupName: groupMap.get(l.groupId)?.name ?? 'Umum',
        clicks: rangeClicksByLink.get(l.id) ?? 0,
        status: l.status,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 6);

    const groupPerformance = groups
      .map((g) => {
        const linksInGroup = allLinks.filter((l) => l.groupId === g.id);
        const clicksInGroup = scopedClicksInRange.filter((c) => c.groupId === g.id).length;
        return {
          groupId: g.id,
          name: g.name,
          slug: g.slug,
          category: g.category,
          linkCount: linksInGroup.length,
          clicks: clicksInGroup,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    return {
      range,
      totalClicks,
      clicksInRange: scopedClicksInRange.length,
      clicksToday,
      clicksLastHour,
      activeLinksCount: scopedLinks.filter((l) => l.status === 'active').length,
      scheduledLinksCount: scopedLinks.filter((l) => l.status === 'scheduled').length,
      expiredLinksCount: scopedLinks.filter((l) => l.status === 'expired').length,
      totalLinksCount: scopedLinks.length,
      publicGroupsCount: groups.filter((g) => g.isPublicDirectory).length,
      timeseries,
      deviceBreakdown,
      sourceBreakdown,
      topLinks,
      groupPerformance,
      recentClicks: scopedClicks30d.slice(0, 20),
    };
  }
}

export const repository = new SchoolLinkRepository();
