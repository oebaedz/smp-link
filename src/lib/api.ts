import type {
  AnalyticsRange,
  AnalyticsSummary,
  GroupCategory,
  SchoolGroup,
  SchoolLink,
  SchoolProfile,
  SettingsInfo,
} from '../types.ts';

const TOKEN_STORAGE_KEY = 'smplink_dashboard_token';

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('x-dashboard-token', token);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : `Permintaan gagal (${res.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export function buildShortUrl(slug: string): string {
  if (typeof window === 'undefined') return `/go/${slug}`;
  return `${window.location.origin}/go/${slug}`;
}

export function buildEventDirectoryUrl(groupSlug: string): string {
  if (typeof window === 'undefined') return `/event/${groupSlug}`;
  return `${window.location.origin}/event/${groupSlug}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n);
}

export function formatDateTimeId(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTimeId(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 10) return 'Baru saja';
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}

export const api = {
  getAuthStatus: () =>
    apiRequest<{
      authenticated: boolean;
      isDefaultPin: boolean;
      profile: SchoolProfile;
    }>('/api/auth/status'),

  verifyPin: (pin: string) =>
    apiRequest<{ ok: boolean; token: string }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  logout: () =>
    apiRequest<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getBootstrap: (range: AnalyticsRange = '7d', groupId?: string) => {
    const params = new URLSearchParams({ range });
    if (groupId) params.set('groupId', groupId);
    return apiRequest<{
      mode: 'local' | 'supabase';
      profile: SchoolProfile;
      groups: SchoolGroup[];
      links: SchoolLink[];
      analytics: AnalyticsSummary;
    }>(`/api/dashboard/bootstrap?${params.toString()}`);
  },

  getAnalytics: (params: { range: AnalyticsRange; groupId?: string; linkId?: string }) => {
    const qs = new URLSearchParams({ range: params.range });
    if (params.groupId) qs.set('groupId', params.groupId);
    if (params.linkId) qs.set('linkId', params.linkId);
    return apiRequest<{ analytics: AnalyticsSummary }>(`/api/analytics?${qs.toString()}`);
  },

  checkSlug: (slug: string, excludeId?: string) => {
    const qs = new URLSearchParams({ slug });
    if (excludeId) qs.set('excludeId', excludeId);
    return apiRequest<{ normalized: string; available: boolean }>(
      `/api/links/check-slug?${qs.toString()}`
    );
  },

  createLink: (payload: {
    groupId: string;
    title: string;
    slug: string;
    destinationUrl: string;
    isActive: boolean;
    startsAt: string | null;
    expiresAt: string | null;
  }) =>
    apiRequest<{ link: SchoolLink }>('/api/links', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateLink: (
    id: string,
    payload: Partial<{
      groupId: string;
      title: string;
      slug: string;
      destinationUrl: string;
      isActive: boolean;
      startsAt: string | null;
      expiresAt: string | null;
    }>
  ) =>
    apiRequest<{ link: SchoolLink }>(`/api/links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteLink: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/links/${id}`, {
      method: 'DELETE',
    }),

  triggerTestVisit: (id: string) =>
    apiRequest<{ ok: boolean; linkClickCount: number }>(`/api/links/${id}/test-visit`, {
      method: 'POST',
    }),

  createGroup: (payload: {
    name: string;
    slug: string;
    category: GroupCategory;
    description: string;
    accentColor: string;
    isPublicDirectory: boolean;
  }) =>
    apiRequest<{ group: SchoolGroup }>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateGroup: (
    id: string,
    payload: Partial<{
      name: string;
      slug: string;
      category: GroupCategory;
      description: string;
      accentColor: string;
      isPublicDirectory: boolean;
    }>
  ) =>
    apiRequest<{ group: SchoolGroup }>(`/api/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteGroup: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/groups/${id}`, {
      method: 'DELETE',
    }),

  updateProfile: (payload: {
    schoolName: string;
    npsn: string;
    tagline: string;
    websiteUrl: string;
    contactInfo: string;
    address: string;
    logoUrl: string;
  }) =>
    apiRequest<{ profile: SchoolProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getSettingsInfo: () => apiRequest<SettingsInfo>('/api/settings/info'),

  testSupabase: () =>
    apiRequest<{ ok: boolean; tablesReady: boolean; message: string }>(
      '/api/settings/test-supabase',
      { method: 'POST' }
    ),

  updatePin: (pin: string) =>
    apiRequest<{ ok: boolean; message: string }>('/api/settings/update-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  getPublicEvent: (groupSlug: string) =>
    apiRequest<{
      profile: SchoolProfile;
      group: SchoolGroup;
      links: SchoolLink[];
      upcomingLinks: SchoolLink[];
    }>(`/api/public/events/${encodeURIComponent(groupSlug)}`),

  getPublicLinkStatus: (slug: string) =>
    apiRequest<{
      profile: SchoolProfile;
      found: boolean;
      status: string;
      link: {
        title: string;
        slug: string;
        startsAt: string | null;
        expiresAt: string | null;
      } | null;
      group: { name: string; slug: string } | null;
    }>(`/api/public/link-status/${encodeURIComponent(slug)}`),
};
