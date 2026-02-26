-- Usage increment function (called from edge functions)
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_type TEXT)
RETURNS void AS $$
BEGIN
  IF p_type = 'check' THEN
    UPDATE public.users
    SET usage_checks_this_month = usage_checks_this_month + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF p_type = 'review' THEN
    UPDATE public.users
    SET usage_reviews_this_month = usage_reviews_this_month + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Edge weight increment function (called from graph edge creation)
CREATE OR REPLACE FUNCTION public.increment_edge_weight(p_user_id UUID, p_source_id UUID, p_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.topic_edges
  SET weight = weight + 1
  WHERE user_id = p_user_id
    AND source_id = p_source_id
    AND target_id = p_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
