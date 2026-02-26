-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS (mirrors auth.users from Supabase Auth)
-- =============================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro')),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trial')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  usage_checks_this_month INTEGER NOT NULL DEFAULT 0,
  usage_reviews_this_month INTEGER NOT NULL DEFAULT 0,
  usage_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- CHECKS (fact-check + review history)
-- =============================================
CREATE TABLE public.checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('analyze', 'review')),
  input_snippet TEXT NOT NULL,
  result_json TEXT NOT NULL,
  claim_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 days')
);

CREATE INDEX idx_checks_user_created ON public.checks(user_id, created_at DESC);
CREATE INDEX idx_checks_expires ON public.checks(expires_at);

-- =============================================
-- USER PREFERENCES
-- =============================================
CREATE TABLE public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  citation_style TEXT NOT NULL DEFAULT 'mla' CHECK (citation_style IN ('mla', 'apa', 'chicago')),
  max_claims INTEGER NOT NULL DEFAULT 10 CHECK (max_claims BETWEEN 1 AND 50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TOPICS (concept graph nodes)
-- =============================================
CREATE TABLE public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL CHECK (length(label) <= 100),
  claim_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, label)
);

CREATE INDEX idx_topics_user ON public.topics(user_id);

-- =============================================
-- TOPIC CLAIMS (junction: topic → check)
-- =============================================
CREATE TABLE public.topic_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  check_id UUID REFERENCES public.checks(id) ON DELETE CASCADE NOT NULL,
  claim_text TEXT NOT NULL CHECK (length(claim_text) <= 500)
);

CREATE INDEX idx_topic_claims_topic ON public.topic_claims(topic_id);
CREATE INDEX idx_topic_claims_check ON public.topic_claims(check_id);

-- =============================================
-- TOPIC EDGES (concept graph edges with relationship types)
-- =============================================
CREATE TABLE public.topic_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  relationship_type TEXT NOT NULL DEFAULT 'co-occurs' CHECK (relationship_type IN ('co-occurs', 'supports', 'contradicts', 'elaborates', 'related-to')),
  relationship_label TEXT CHECK (length(relationship_label) <= 80),
  UNIQUE(user_id, source_id, target_id)
);

CREATE INDEX idx_topic_edges_user ON public.topic_edges(user_id);

-- =============================================
-- SHARED REPORTS
-- =============================================
CREATE TABLE public.shared_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  check_id UUID REFERENCES public.checks(id) ON DELETE CASCADE NOT NULL,
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '90 days')
);

CREATE INDEX idx_shared_reports_token ON public.shared_reports(share_token);

-- =============================================
-- AUDIT LOGS
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_created ON public.audit_logs(user_id, created_at DESC);

-- =============================================
-- RESULT CACHE (replaces in-memory LRU)
-- =============================================
CREATE TABLE public.result_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_cache_expires ON public.result_cache(expires_at);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-create user profile on first sign-in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.result_cache WHERE expires_at < NOW();
  DELETE FROM public.checks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
