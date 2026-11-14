function buildDefaultFaviconDataUrl(schoolName: string): string {
  const initial = (schoolName.trim()[0] || 'S').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111827"/><rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#3B82F6" stroke-width="3"/><text x="32" y="42" text-anchor="middle" font-family="system-ui, sans-serif" font-size="30" font-weight="700" fill="#60A5FA">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function syncDocumentHead(params: {
  title: string;
  iconUrl?: string;
  schoolName?: string;
}) {
  if (typeof document === 'undefined') return;

  if (params.title.trim()) {
    document.title = params.title.trim();
  }

  const href = params.iconUrl?.trim() || buildDefaultFaviconDataUrl(params.schoolName || 'S');

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (link.href !== href) {
    link.href = href;
  }

  let shortcut = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
  if (!shortcut) {
    shortcut = document.createElement('link');
    shortcut.rel = 'shortcut icon';
    document.head.appendChild(shortcut);
  }
  if (shortcut.href !== href) {
    shortcut.href = href;
  }
}
