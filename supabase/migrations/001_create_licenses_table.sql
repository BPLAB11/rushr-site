-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'studio')),
  expires_at TIMESTAMP WITH TIME ZONE,
  customer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on license_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key);

-- Create index on tier for filtering
CREATE INDEX IF NOT EXISTS idx_licenses_tier ON licenses(tier);

-- Enable RLS (Row Level Security)
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all (for validation)
CREATE POLICY "Allow read access to all" ON licenses
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow insert via service role only
CREATE POLICY "Allow insert via service role" ON licenses
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Insert test licenses
INSERT INTO licenses (license_key, tier, expires_at, customer_email) VALUES
  ('RUSHR-FREE-TEST-12345', 'free', NULL, 'test@example.com'),
  ('RUSHR-PRO-TEST-67890', 'pro', NOW() + INTERVAL '1 year', 'test@example.com'),
  ('RUSHR-STUDIO-TEST-11111', 'studio', NOW() + INTERVAL '1 year', 'test@example.com')
ON CONFLICT (license_key) DO NOTHING;
