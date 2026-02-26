import { getServiceClient } from "./supabase.ts";
import { callGroqWithFallback } from "./llm.ts";

export interface TopicClaim {
  original_text: string;
  subject: string;
}

interface Relationship {
  source: string;
  target: string;
  type: "co-occurs" | "supports" | "contradicts" | "elaborates" | "related-to";
  label: string;
}

export async function saveTopicsAndGraph(
  userId: string,
  checkId: string,
  claims: TopicClaim[]
): Promise<void> {
  if (!claims.length) return;

  const supabase = getServiceClient();
  const topicIds: Record<string, string> = {};

  // Upsert each topic node
  for (const claim of claims) {
    const label = claim.subject.slice(0, 100).trim();
    if (!label) continue;

    const { data: topic, error } = await supabase
      .from("topics")
      .upsert(
        { user_id: userId, label },
        { onConflict: "user_id,label" }
      )
      .select("id")
      .single();

    if (error) {
      // On conflict, fetch the existing topic id
      const { data: existing } = await supabase
        .from("topics")
        .select("id")
        .eq("user_id", userId)
        .eq("label", label)
        .single();
      if (existing) topicIds[label] = (existing as { id: string }).id;
    } else if (topic) {
      topicIds[label] = (topic as { id: string }).id;

      // Link topic to the check
      await supabase.from("topic_claims").insert({
        topic_id: topicIds[label],
        check_id: checkId,
        claim_text: claim.original_text.slice(0, 500),
      });
    }

    // Increment claim_count
    if (topicIds[label]) {
      await supabase
        .from("topics")
        .update({ claim_count: supabase.raw ? undefined : undefined })
        .eq("id", topicIds[label]);
      // Use RPC increment instead
      await supabase.rpc("increment_topic_count", {
        p_topic_id: topicIds[label],
      });
    }
  }

  // Extract relationships between co-occurring subjects using LLM
  if (Object.keys(topicIds).length > 1) {
    const relationships = await extractRelationships(claims);

    for (const rel of relationships) {
      const sourceId = topicIds[rel.source];
      const targetId = topicIds[rel.target];
      if (!sourceId || !targetId || sourceId === targetId) continue;

      // Upsert edge
      const { error } = await supabase.from("topic_edges").upsert(
        {
          user_id: userId,
          source_id: sourceId,
          target_id: targetId,
          relationship_type: rel.type,
          relationship_label: rel.label.slice(0, 80),
        },
        { onConflict: "user_id,source_id,target_id" }
      );

      if (!error) {
        // Increment weight on existing edge
        await supabase.rpc("increment_edge_weight", {
          p_user_id: userId,
          p_source_id: sourceId,
          p_target_id: targetId,
        });
      }
    }
  }
}

async function extractRelationships(
  claims: TopicClaim[]
): Promise<Relationship[]> {
  if (claims.length < 2) return [];

  const claimsText = claims
    .slice(0, 8)
    .map(
      (c, i) =>
        `[${i + 1}] Subject: "${c.subject}" — Claim: "${c.original_text.slice(0, 120)}"`
    )
    .join("\n");

  const prompt = `Given these claims from the same text, identify meaningful relationships between the subjects.

${claimsText}

For each pair of subjects where a clear relationship exists, output one relationship entry. Only include pairs where the relationship is substantively meaningful (not just superficial co-occurrence).

Return ONLY valid JSON:
{
  "relationships": [
    {
      "source": "subject name 1",
      "target": "subject name 2",
      "type": "supports" | "contradicts" | "elaborates" | "co-occurs" | "related-to",
      "label": "short 2-4 word description (e.g. 'supports finding', 'contradicts claim')"
    }
  ]
}`;

  try {
    const raw = await callGroqWithFallback(prompt, 500);
    const cleaned = raw
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { relationships?: Relationship[] };
    return (parsed.relationships ?? []).slice(0, 20);
  } catch {
    // Non-fatal: return empty if LLM fails
    return [];
  }
}
