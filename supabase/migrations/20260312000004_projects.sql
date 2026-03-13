-- ============================================================
-- PROJECTS — Research workspace for grouping fact-checks
-- ============================================================

CREATE TABLE public.projects (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  description TEXT        CHECK (length(description) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON public.projects(user_id, updated_at DESC);

-- ============================================================
-- PROJECT_CHECKS — junction: project → check
-- Composite PK prevents duplicate links
-- ============================================================

CREATE TABLE public.project_checks (
  project_id UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  check_id   UUID        NOT NULL REFERENCES public.checks(id)   ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, check_id)
);

CREATE INDEX idx_project_checks_project ON public.project_checks(project_id, added_at DESC);
CREATE INDEX idx_project_checks_check   ON public.project_checks(check_id);

-- ============================================================
-- SAVED_CLAIMS — bookmarked individual verified claims
-- project_id SET NULL on project deletion so bookmarks survive
-- ============================================================

CREATE TABLE public.saved_claims (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  check_id   UUID        NOT NULL REFERENCES public.checks(id)   ON DELETE CASCADE,
  project_id UUID                 REFERENCES public.projects(id) ON DELETE SET NULL,
  claim_id   TEXT        NOT NULL,   -- matches result_json.claims[].claim_id
  claim_text TEXT        NOT NULL CHECK (length(claim_text) <= 1000),
  verdict    TEXT        NOT NULL CHECK (verdict IN ('broadly_supported','overstated','disputed','unclear')),
  note       TEXT        CHECK (length(note) <= 500),
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, check_id, claim_id)
);

CREATE INDEX idx_saved_claims_user    ON public.saved_claims(user_id, saved_at DESC);
CREATE INDEX idx_saved_claims_project ON public.saved_claims(project_id, saved_at DESC);
CREATE INDEX idx_saved_claims_check   ON public.saved_claims(check_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_claims   ENABLE ROW LEVEL SECURITY;

-- PROJECTS
CREATE POLICY "Projects: read own"
  ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Projects: insert own"
  ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects: update own"
  ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Projects: delete own"
  ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- PROJECT_CHECKS (ownership asserted via parent project row)
CREATE POLICY "ProjectChecks: read own"
  ON public.project_checks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND user_id = auth.uid()
  ));
CREATE POLICY "ProjectChecks: insert own"
  ON public.project_checks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND user_id = auth.uid()
  ));
CREATE POLICY "ProjectChecks: delete own"
  ON public.project_checks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND user_id = auth.uid()
  ));

-- SAVED_CLAIMS
CREATE POLICY "SavedClaims: read own"
  ON public.saved_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "SavedClaims: insert own"
  ON public.saved_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SavedClaims: update own"
  ON public.saved_claims FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "SavedClaims: delete own"
  ON public.saved_claims FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER — keep projects.updated_at current when checks are added
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_project_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.projects SET updated_at = NOW() WHERE id = NEW.project_id;
  RETURN NEW;
END $$;

CREATE TRIGGER on_project_check_added
  AFTER INSERT ON public.project_checks
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_updated_at();
