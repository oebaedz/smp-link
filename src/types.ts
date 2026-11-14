export type GroupCategory =
  | 'PPDB'
  | 'Akademik'
  | 'Kesiswaan'
  | 'Event Tahunan'
  | 'Administrasi';

export type LinkScheduleStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export type DeviceType = 'Mobile' | 'Desktop' | 'Tablet';

export type ClickSource = 'Direct / QR' | 'Direktori Event' | 'Media Sosial / Chat';

export type AnalyticsRange = '24h' | '7d' | '30d';

export interface SchoolProfile {
  id: string;
  schoolName: string;
  npsn: string;
  tagline: string;
  websiteUrl: string;
  contactInfo: string;
  address: string;
  logoUrl: string;
  updatedAt: string;
}

export interface SchoolGroup {
  id: string;
  name: string;
  slug: string;
  category: GroupCategory;
  description: string;
  accentColor: string;
  isPublicDirectory: boolean;
  createdAt: string;
}

export interface SchoolLink {
  id: string;
  groupId: string;
  title: string;
  slug: string;
  destinationUrl: string;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
  status: LinkScheduleStatus;
}

export interface ClickEvent {
  id: string;
  linkId: string;
  groupId: string;
  linkTitle: string;
  linkSlug: string;
  groupName: string;
  clickedAt: string;
  deviceType: DeviceType;
  source: ClickSource;
  referrer: string;
  userAgentSummary: string;
}

export interface TimeseriesBucket {
  label: string;
  timestamp: string;
  clicks: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

export interface TopLinkMetric {
  linkId: string;
  title: string;
  slug: string;
  groupName: string;
  clicks: number;
  status: LinkScheduleStatus;
}

export interface GroupPerformanceMetric {
  groupId: string;
  name: string;
  slug: string;
  category: GroupCategory;
  linkCount: number;
  clicks: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  totalClicks: number;
  clicksInRange: number;
  clicksToday: number;
  clicksLastHour: number;
  activeLinksCount: number;
  scheduledLinksCount: number;
  expiredLinksCount: number;
  totalLinksCount: number;
  publicGroupsCount: number;
  timeseries: TimeseriesBucket[];
  deviceBreakdown: BreakdownItem[];
  sourceBreakdown: BreakdownItem[];
  topLinks: TopLinkMetric[];
  groupPerformance: GroupPerformanceMetric[];
  recentClicks: ClickEvent[];
}

export interface SettingsInfo {
  mode: 'local' | 'supabase';
  supabaseConfigured: boolean;
  hasCustomPin: boolean;
  sqlSchema: string;
}
