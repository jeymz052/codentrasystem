-- Contact submissions from landing page
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  business_type TEXT,
  locations TEXT,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  preferred_date TEXT,
  preferred_time TEXT,
  source TEXT DEFAULT 'landing-page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_submissions_service_only ON contact_submissions;
CREATE POLICY contact_submissions_service_only ON contact_submissions FOR ALL USING (false);
