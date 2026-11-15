-- ============================================================================
-- SMPLink — Skema Database & Data Awal Sekolah untuk Supabase (PostgreSQL)
-- Seluruh tabel menggunakan prefiks smplink_ agar aman dalam satu proyek DB.
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profil Sekolah
CREATE TABLE IF NOT EXISTS smplink_school_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  school_name TEXT NOT NULL,
  npsn TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  contact_info TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  tab_title TEXT NOT NULL DEFAULT '',
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  dashboard_pin TEXT NOT NULL DEFAULT '2026',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Grup Event & Program Sekolah
CREATE TABLE IF NOT EXISTS smplink_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('PPDB', 'Akademik', 'Kesiswaan', 'Event Tahunan', 'Administrasi')),
  description TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#3B82F6',
  is_public_directory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tautan Singkat Kustom Sekolah
CREATE TABLE IF NOT EXISTS smplink_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES smplink_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Log Analitik Klik Real-Time
CREATE TABLE IF NOT EXISTS smplink_click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES smplink_links(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES smplink_groups(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_type TEXT NOT NULL DEFAULT 'Desktop',
  source TEXT NOT NULL DEFAULT 'Direct / QR',
  referrer TEXT NOT NULL DEFAULT 'Langsung',
  user_agent_summary TEXT NOT NULL DEFAULT 'Browser'
);

-- Indeks performa kueri analitik & redirect cepat
CREATE INDEX IF NOT EXISTS idx_smplink_groups_slug ON smplink_groups(slug);
CREATE INDEX IF NOT EXISTS idx_smplink_links_slug ON smplink_links(slug);
CREATE INDEX IF NOT EXISTS idx_smplink_links_group_id ON smplink_links(group_id);
CREATE INDEX IF NOT EXISTS idx_smplink_links_sort_order ON smplink_links(group_id, sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smplink_click_events_link_id ON smplink_click_events(link_id);
CREATE INDEX IF NOT EXISTS idx_smplink_click_events_group_id ON smplink_click_events(group_id);
CREATE INDEX IF NOT EXISTS idx_smplink_click_events_clicked_at ON smplink_click_events(clicked_at DESC);

-- Fungsi atomik untuk menambah jumlah klik saat redirect
CREATE OR REPLACE FUNCTION increment_smplink_link_clicks(target_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE smplink_links
  SET click_count = click_count + 1,
      updated_at = NOW()
  WHERE id = target_link_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_smplink_link_clicks(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_smplink_link_clicks(UUID) TO service_role;

-- ============================================================================
-- Row Level Security (RLS)
-- Mengamankan seluruh tabel agar hanya dapat diakses lewat backend (service_role).
-- Akses langsung via anon key dari browser otomatis ditolak (melindungi dashboard_pin).
-- ============================================================================

ALTER TABLE smplink_school_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE smplink_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE smplink_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE smplink_click_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_smplink_school_profile" ON smplink_school_profile;
CREATE POLICY "service_role_all_smplink_school_profile"
  ON smplink_school_profile
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_smplink_groups" ON smplink_groups;
CREATE POLICY "service_role_all_smplink_groups"
  ON smplink_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_smplink_links" ON smplink_links;
CREATE POLICY "service_role_all_smplink_links"
  ON smplink_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_smplink_click_events" ON smplink_click_events;
CREATE POLICY "service_role_all_smplink_click_events"
  ON smplink_click_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Data Awal (Seed) Profil & Program Sekolah
-- ============================================================================

INSERT INTO smplink_school_profile (id, school_name, npsn, tagline, website_url, contact_info, address, logo_url, tab_title, social_links, dashboard_pin)
VALUES (
  'default',
  'SMP Negeri 1 Nusantara',
  '20219845',
  'Pusat Tautan Resmi Layanan Digital, PPDB, dan Kegiatan Siswa',
  'https://smpn1nusantara.sch.id',
  'humas@smpn1nusantara.sch.id · (021) 555-0192',
  'Jl. Pendidikan Raya No. 14, Kota Baru',
  '',
  'SMPLink — SMP Negeri 1 Nusantara',
  '[{"id":"soc-ig","platform":"instagram","label":"Instagram","url":"https://instagram.com"},{"id":"soc-yt","platform":"youtube","label":"YouTube","url":"https://youtube.com"},{"id":"soc-wa","platform":"whatsapp","label":"WhatsApp Humas","url":"https://wa.me/6281200000000"}]'::jsonb,
  '2026'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO smplink_groups (id, name, slug, category, description, accent_color, is_public_directory)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'PPDB Tahun Ajaran 2026/2027', 'ppdb-2026', 'PPDB', 'Seluruh tautan pendaftaran peserta didik baru, verifikasi berkas, dan pengumuman hasil seleksi.', '#3B82F6', TRUE),
  ('11111111-1111-4111-8111-111111111102', 'MPLS & Masa Orientasi Siswa', 'mpls-2026', 'Event Tahunan', 'Jadwal pengenalan lingkungan sekolah, pembagian gugus, dan tata tertib siswa baru.', '#10B981', TRUE),
  ('11111111-1111-4111-8111-111111111103', 'Asesmen Sumatif & Akademik', 'asesmen-semester', 'Akademik', 'Akses ruang ujian CBT, kisi-kisi mata pelajaran, dan jadwal remedial kelas VII-IX.', '#F59E0B', TRUE),
  ('11111111-1111-4111-8111-111111111104', 'Ekstrakurikuler & OSIS', 'ekskul-osis', 'Kesiswaan', 'Pendaftaran kegiatan ekstrakurikuler, pemilihan ketua OSIS, dan dokumentasi prestasi.', '#8B5CF6', TRUE),
  ('11111111-1111-4111-8111-111111111105', 'Informasi Wali Murid & TU', 'info-wali-murid', 'Administrasi', 'Unduhan surat edaran resmi, kalender akademik, dan layanan administrasi tata usaha.', '#06B6D4', TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO smplink_links (id, group_id, title, slug, destination_url, is_active, sort_order, starts_at, expires_at, click_count)
VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', 'Formulir Pendaftaran PPDB Jalur Zonasi', 'ppdb-zonasi', 'https://belajar.id', TRUE, 1, NOW() - INTERVAL '14 days', NOW() + INTERVAL '45 days', 64),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101', 'Panduan Syarat & Berkas PPDB (PDF)', 'panduan-ppdb', 'https://kemdikbud.go.id', TRUE, 2, NOW() - INTERVAL '14 days', NOW() + INTERVAL '45 days', 42),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101', 'Portal Pengumuman Seleksi Tahap 2', 'hasil-ppdb-2', 'https://kemdikbud.go.id', TRUE, 3, NOW() + INTERVAL '10 days', NOW() + INTERVAL '60 days', 0),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111102', 'Cek Pembagian Gugus & Ruang MPLS', 'gugus-mpls', 'https://belajar.id', TRUE, 1, NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days', 31),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111102', 'Daftar Perlengkapan & Seragam MPLS', 'bekal-mpls', 'https://belajar.id', TRUE, 2, NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days', 19),
  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111103', 'Ruang Ujian CBT Kelas VII - IX', 'ujian-cbt', 'https://pusmendik.kemdikbud.go.id', TRUE, 1, NOW() - INTERVAL '5 days', NOW() + INTERVAL '20 days', 53),
  ('22222222-2222-4222-8222-222222222207', '11111111-1111-4111-8111-111111111103', 'Kisi-Kisi Asesmen Akhir Semester Ganjil', 'kisi-kisi-ganjil', 'https://kurikulum.kemdikbud.go.id', TRUE, 2, NOW() - INTERVAL '10 days', NOW() + INTERVAL '25 days', 28),
  ('22222222-2222-4222-8222-222222222208', '11111111-1111-4111-8111-111111111104', 'Pendaftaran Ekstrakurikuler Semester Baru', 'daftar-ekskul', 'https://belajar.id', TRUE, 1, NOW() - INTERVAL '12 days', NOW() + INTERVAL '30 days', 37),
  ('22222222-2222-4222-8222-222222222209', '11111111-1111-4111-8111-111111111104', 'E-Voting Pemilihan Ketua OSIS', 'voting-osis', 'https://belajar.id', TRUE, 2, NOW() - INTERVAL '30 days', NOW() - INTERVAL '3 days', 45),
  ('22222222-2222-4222-8222-222222222210', '11111111-1111-4111-8111-111111111105', 'Kalender Akademik Tahun 2026/2027', 'kalender-akademik', 'https://kemdikbud.go.id', TRUE, 1, NULL, NULL, 24),
  ('22222222-2222-4222-8222-222222222211', '11111111-1111-4111-8111-111111111105', 'Layanan Surat Keterangan Siswa Aktif', 'surat-aktif-tu', 'https://belajar.id', TRUE, 2, NULL, NULL, 15)
ON CONFLICT (slug) DO NOTHING;
