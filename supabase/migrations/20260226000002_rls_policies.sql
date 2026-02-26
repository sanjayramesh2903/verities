-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_cache ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users: read own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users: update own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- CHECKS
CREATE POLICY "Checks: read own" ON public.checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Checks: insert own" ON public.checks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER PREFERENCES
CREATE POLICY "Prefs: read own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Prefs: upsert own" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- TOPICS
CREATE POLICY "Topics: read own" ON public.topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Topics: insert own" ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Topics: update own" ON public.topics FOR UPDATE USING (auth.uid() = user_id);

-- TOPIC CLAIMS
CREATE POLICY "TopicClaims: read via topic" ON public.topic_claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.topics WHERE id = topic_id AND user_id = auth.uid()));
CREATE POLICY "TopicClaims: insert via topic" ON public.topic_claims FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.topics WHERE id = topic_id AND user_id = auth.uid()));

-- TOPIC EDGES
CREATE POLICY "TopicEdges: read own" ON public.topic_edges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "TopicEdges: insert own" ON public.topic_edges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "TopicEdges: update own" ON public.topic_edges FOR UPDATE USING (auth.uid() = user_id);

-- SHARED REPORTS: public read via share_token
CREATE POLICY "SharedReports: public read" ON public.shared_reports FOR SELECT USING (true);
CREATE POLICY "SharedReports: insert own" ON public.shared_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AUDIT LOGS: insert only, no user read
CREATE POLICY "AuditLogs: insert only" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- RESULT CACHE: no user policies — service_role bypasses RLS
-- (Tables with RLS enabled but no matching policies block all access for normal roles)
-- Edge functions use service_role key which bypasses RLS entirely
