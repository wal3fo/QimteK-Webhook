-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  webhook_token TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  headers JSONB NOT NULL,
  body JSONB,
  query JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  CONSTRAINT fk_webhook_token FOREIGN KEY (webhook_token) REFERENCES webhooks(token) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_expires_at ON webhooks(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_requests_webhook_token ON requests(webhook_token);
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_requests_method ON requests(method);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on webhooks" ON webhooks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on requests" ON requests
  FOR ALL USING (true) WITH CHECK (true);
