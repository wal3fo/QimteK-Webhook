-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Administrator', 'Professional', 'user')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    verification_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Webhooks Table
CREATE TABLE IF NOT EXISTS public.webhooks (
    token TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Requests Table (Stores captured webhook requests)
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_token TEXT REFERENCES public.webhooks(token) ON DELETE CASCADE,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers JSONB,
    query JSONB,
    body JSONB,
    ip_address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Visitor Sessions (For Visitor Service)
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    session_id TEXT PRIMARY KEY,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. System Config (For Plans/Settings)
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (Row Level Security)
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policies (Adjust based on security requirements)
-- Note: The Backend API should use the SERVICE_ROLE_KEY to bypass these policies.
-- These policies are primarily for direct client access (if any) or to deny public access by default.

-- Users: Public read is needed for login/check if email exists? 
-- Better: Only Service Role can read all. Users can read their own.
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Service Role full access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Webhooks: Users can view/manage their own webhooks
CREATE POLICY "Users can view own webhooks" ON public.webhooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own webhooks" ON public.webhooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own webhooks" ON public.webhooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own webhooks" ON public.webhooks FOR DELETE USING (auth.uid() = user_id);

-- Requests: Webhook requests are publically inserted (by external services), but viewed only by webhook owner
-- Public INSERT for requests (captured webhooks)
CREATE POLICY "Public insert requests" ON public.requests FOR INSERT WITH CHECK (true);
-- View requests: Only owner of the webhook can view
CREATE POLICY "Users can view requests for their webhooks" ON public.requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.webhooks w 
        WHERE w.token = requests.webhook_token 
        AND w.user_id = auth.uid()
    )
);

-- Visitor Sessions: Public read/write (for tracking)
CREATE POLICY "Public access to visitor sessions" ON public.visitor_sessions FOR ALL USING (true) WITH CHECK (true);

-- System Config: Read only for public/authenticated? Or only Admin?
CREATE POLICY "Public read system config" ON public.system_config FOR SELECT USING (true);
