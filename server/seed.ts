import type {
  ClickEvent,
  ClickSource,
  DeviceType,
  SchoolGroup,
  SchoolLink,
  SchoolProfile,
} from '../src/types.ts';

export interface LocalStoreData {
  profile: SchoolProfile;
  dashboardPin: string;
  groups: SchoolGroup[];
  links: Omit<SchoolLink, 'status'>[];
  clicks: ClickEvent[];
}

export function createInitialSeedData(): LocalStoreData {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
  const daysAhead = (d: number) => new Date(now + d * 86_400_000).toISOString();

  const profile: SchoolProfile = {
    id: 'default',
    schoolName: 'SMP Negeri 1 Nusantara',
    tabTitle: 'SMPLink — SMP Negeri 1 Nusantara',
    npsn: '20219845',
    tagline: 'Pusat Tautan Resmi Layanan Digital, PPDB, dan Kegiatan Siswa',
    websiteUrl: 'https://smpn1nusantara.sch.id',
    contactInfo: 'humas@smpn1nusantara.sch.id · (021) 555-0192',
    address: 'Jl. Pendidikan Raya No. 14, Kota Baru',
    logoUrl: '',
    socialLinks: [
      { id: 'soc-ig', platform: 'instagram', label: 'Instagram', url: 'https://instagram.com' },
      { id: 'soc-yt', platform: 'youtube', label: 'YouTube', url: 'https://youtube.com' },
      { id: 'soc-wa', platform: 'whatsapp', label: 'WhatsApp Humas', url: 'https://wa.me/6281200000000' },
    ],
    updatedAt: daysAgo(1),
  };

  const groups: SchoolGroup[] = [
    {
      id: 'grp-ppdb',
      name: 'PPDB Tahun Ajaran 2026/2027',
      slug: 'ppdb-2026',
      category: 'PPDB',
      description:
        'Seluruh tautan pendaftaran peserta didik baru, verifikasi berkas, dan pengumuman hasil seleksi.',
      accentColor: '#3B82F6',
      isPublicDirectory: true,
      createdAt: daysAgo(28),
    },
    {
      id: 'grp-mpls',
      name: 'MPLS & Masa Orientasi Siswa',
      slug: 'mpls-2026',
      category: 'Event Tahunan',
      description:
        'Jadwal pengenalan lingkungan sekolah, pembagian gugus, dan tata tertib siswa baru.',
      accentColor: '#10B981',
      isPublicDirectory: true,
      createdAt: daysAgo(21),
    },
    {
      id: 'grp-asesmen',
      name: 'Asesmen Sumatif & Akademik',
      slug: 'asesmen-semester',
      category: 'Akademik',
      description:
        'Akses ruang ujian CBT, kisi-kisi mata pelajaran, dan jadwal remedial kelas VII–IX.',
      accentColor: '#F59E0B',
      isPublicDirectory: true,
      createdAt: daysAgo(18),
    },
    {
      id: 'grp-ekskul',
      name: 'Ekstrakurikuler & OSIS',
      slug: 'ekskul-osis',
      category: 'Kesiswaan',
      description:
        'Pendaftaran kegiatan ekstrakurikuler, pemilihan ketua OSIS, dan dokumentasi prestasi siswa.',
      accentColor: '#8B5CF6',
      isPublicDirectory: true,
      createdAt: daysAgo(14),
    },
    {
      id: 'grp-tu',
      name: 'Informasi Wali Murid & TU',
      slug: 'info-wali-murid',
      category: 'Administrasi',
      description:
        'Unduhan surat edaran resmi, kalender akademik, dan layanan administrasi tata usaha.',
      accentColor: '#06B6D4',
      isPublicDirectory: true,
      createdAt: daysAgo(25),
    },
  ];

  const links: Omit<SchoolLink, 'status'>[] = [
    {
      id: 'lnk-1',
      groupId: 'grp-ppdb',
      title: 'Formulir Pendaftaran PPDB Jalur Zonasi',
      slug: 'ppdb-zonasi',
      destinationUrl: 'https://belajar.id',
      isActive: true,
      sortOrder: 1,
      startsAt: daysAgo(14),
      expiresAt: daysAhead(45),
      clickCount: 0,
      createdAt: daysAgo(14),
      updatedAt: hoursAgo(2),
    },
    {
      id: 'lnk-2',
      groupId: 'grp-ppdb',
      title: 'Panduan Syarat & Berkas PPDB',
      slug: 'panduan-ppdb',
      destinationUrl: 'https://www.kemdikbud.go.id',
      isActive: true,
      sortOrder: 2,
      startsAt: daysAgo(14),
      expiresAt: daysAhead(45),
      clickCount: 0,
      createdAt: daysAgo(14),
      updatedAt: hoursAgo(5),
    },
    {
      id: 'lnk-3',
      groupId: 'grp-ppdb',
      title: 'Portal Pengumuman Seleksi Tahap 2',
      slug: 'hasil-ppdb-2',
      destinationUrl: 'https://www.kemdikbud.go.id',
      isActive: true,
      sortOrder: 3,
      startsAt: daysAhead(5),
      expiresAt: daysAhead(60),
      clickCount: 0,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: 'lnk-4',
      groupId: 'grp-mpls',
      title: 'Cek Pembagian Gugus & Ruang MPLS',
      slug: 'gugus-mpls',
      destinationUrl: 'https://belajar.id',
      isActive: true,
      sortOrder: 1,
      startsAt: daysAgo(10),
      expiresAt: daysAhead(25),
      clickCount: 0,
      createdAt: daysAgo(10),
      updatedAt: hoursAgo(3),
    },
    {
      id: 'lnk-5',
      groupId: 'grp-mpls',
      title: 'Daftar Perlengkapan & Seragam MPLS',
      slug: 'bekal-mpls',
      destinationUrl: 'https://belajar.id',
      isActive: true,
      sortOrder: 2,
      startsAt: daysAgo(10),
      expiresAt: daysAhead(25),
      clickCount: 0,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
    },
    {
      id: 'lnk-6',
      groupId: 'grp-asesmen',
      title: 'Ruang Ujian CBT Kelas VII – IX',
      slug: 'ujian-cbt',
      destinationUrl: 'https://pusmendik.kemdikbud.go.id',
      isActive: true,
      sortOrder: 1,
      startsAt: daysAgo(7),
      expiresAt: daysAhead(20),
      clickCount: 0,
      createdAt: daysAgo(7),
      updatedAt: hoursAgo(1),
    },
    {
      id: 'lnk-7',
      groupId: 'grp-asesmen',
      title: 'Kisi-Kisi Asesmen Semester Ganjil',
      slug: 'kisi-kisi-ganjil',
      destinationUrl: 'https://kurikulum.kemdikbud.go.id',
      isActive: true,
      sortOrder: 2,
      startsAt: daysAgo(12),
      expiresAt: daysAhead(20),
      clickCount: 0,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(2),
    },
    {
      id: 'lnk-8',
      groupId: 'grp-ekskul',
      title: 'Pendaftaran Ekstrakurikuler Semester Baru',
      slug: 'daftar-ekskul',
      destinationUrl: 'https://belajar.id',
      isActive: true,
      sortOrder: 1,
      startsAt: daysAgo(15),
      expiresAt: daysAhead(30),
      clickCount: 0,
      createdAt: daysAgo(15),
      updatedAt: hoursAgo(4),
    },
    {
      id: 'lnk-9',
      groupId: 'grp-ekskul',
      title: 'E-Voting Pemilihan Ketua OSIS 2026',
      slug: 'voting-osis',
      destinationUrl: 'https://belajar.id',
      isActive: true,
      sortOrder: 2,
      startsAt: daysAgo(27),
      expiresAt: daysAgo(3),
      clickCount: 0,
      createdAt: daysAgo(27),
      updatedAt: daysAgo(3),
    },
    {
      id: 'lnk-10',
      groupId: 'grp-tu',
      title: 'Kalender Akademik Tahun 2026/2027',
      slug: 'kalender-akademik',
      destinationUrl: 'https://www.kemdikbud.go.id',
      isActive: true,
      sortOrder: 1,
      startsAt: null,
      expiresAt: null,
      clickCount: 0,
      createdAt: daysAgo(22),
      updatedAt: daysAgo(5),
    },
    {
      id: 'lnk-11',
      groupId: 'grp-tu',
      title: 'Layanan Surat Keterangan Siswa Aktif',
      slug: 'surat-aktif-tu',
      destinationUrl: 'https://belajar.id',
      isActive: true,
      sortOrder: 2,
      startsAt: null,
      expiresAt: null,
      clickCount: 0,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(6),
    },
  ];

  // Deterministic realistic historical click events across the past 28 days and today
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const linkById = new Map(links.map((l) => [l.id, l]));

  const linkWeights: Array<{ linkId: string; count: number; maxDaysBack: number }> = [
    { linkId: 'lnk-1', count: 44, maxDaysBack: 14 },
    { linkId: 'lnk-2', count: 28, maxDaysBack: 14 },
    { linkId: 'lnk-4', count: 24, maxDaysBack: 10 },
    { linkId: 'lnk-5', count: 16, maxDaysBack: 10 },
    { linkId: 'lnk-6', count: 41, maxDaysBack: 7 },
    { linkId: 'lnk-7', count: 22, maxDaysBack: 12 },
    { linkId: 'lnk-8', count: 27, maxDaysBack: 15 },
    { linkId: 'lnk-9', count: 32, maxDaysBack: 24 },
    { linkId: 'lnk-10', count: 19, maxDaysBack: 22 },
    { linkId: 'lnk-11', count: 13, maxDaysBack: 20 },
  ];

  const devices: DeviceType[] = ['Mobile', 'Mobile', 'Mobile', 'Desktop', 'Desktop', 'Tablet'];
  const sources: ClickSource[] = [
    'Direct / QR',
    'Direct / QR',
    'Direktori Event',
    'Direktori Event',
    'Media Sosial / Chat',
  ];
  const referrers = [
    'Langsung / QR Poster',
    'Portal Event Sekolah',
    'WhatsApp Grup Wali Murid',
    'Instagram Sekolah',
    'Google Classroom',
  ];
  const agents = [
    'Chrome Mobile · Android',
    'Safari Mobile · iOS',
    'Chrome Desktop · Windows',
    'Edge Desktop · Windows',
    'Safari · macOS',
  ];

  const clicks: ClickEvent[] = [];
  let seq = 1;

  for (const item of linkWeights) {
    const link = linkById.get(item.linkId);
    if (!link) continue;
    const group = groupById.get(link.groupId);
    if (!group) continue;

    for (let i = 0; i < item.count; i++) {
      // Spread ~35% in last 24h (unless expired link), rest over maxDaysBack
      const isExpiredLink = link.id === 'lnk-9';
      let offsetMs: number;
      if (!isExpiredLink && i % 3 === 0) {
        // Within last 24 hours
        const minsAgo = ((seq * 37 + i * 29) % (23 * 60)) + 4;
        offsetMs = minsAgo * 60_000;
      } else {
        const minDays = isExpiredLink ? 4 : 1;
        const span = Math.max(1, item.maxDaysBack - minDays);
        const dayOffset = minDays + ((seq * 13 + i * 7) % span);
        const hourJitter = ((seq * 19 + i * 11) % 24) * 3600_000;
        offsetMs = dayOffset * 86_400_000 + hourJitter;
      }

      const deviceType = devices[(seq + i) % devices.length];
      const source = sources[(seq * 3 + i) % sources.length];
      const referrer =
        source === 'Direktori Event'
          ? `/event/${group.slug}`
          : referrers[(seq + i * 2) % referrers.length];
      const userAgentSummary = agents[(seq + i) % agents.length];

      clicks.push({
        id: `clk-seed-${seq}`,
        linkId: link.id,
        groupId: group.id,
        linkTitle: link.title,
        linkSlug: link.slug,
        groupName: group.name,
        clickedAt: new Date(now - offsetMs).toISOString(),
        deviceType,
        source,
        referrer,
        userAgentSummary,
      });

      link.clickCount += 1;
      seq += 1;
    }
  }

  // Sort clicks newest first
  clicks.sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime());

  return { profile, dashboardPin: '2026', groups, links, clicks };
}
