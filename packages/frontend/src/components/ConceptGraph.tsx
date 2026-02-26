import { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import type { Claim } from "@verities/shared";
import { X } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "claim" | "concept";
  verdict?: string;
  claimIndex?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  relationship_type?: string;
  relationship_label?: string;
}

interface Props {
  claims: Claim[];
}

const VERDICT_COLORS: Record<string, string> = {
  broadly_supported: "#10B981",
  contested: "#F59E0B",
  refuted: "#F43F5E",
  unclear: "#94A3B8",
};

const VERDICT_LABELS: Record<string, string> = {
  broadly_supported: "Broadly Supported",
  contested: "Contested",
  refuted: "Refuted",
  unclear: "Unclear",
};

const CONCEPT_COLOR = "#0D9488";
const BG_COLOR = "#0f172a";
const EDGE_COLOR = "rgba(148,163,184,0.3)";
const EDGE_HOVER_COLOR = "rgba(148,163,184,0.7)";

function getRelationshipColor(type?: string): string {
  if (type === "contradicts") return "#F43F5E";
  if (type === "supports") return "#10B981";
  if (type === "elaborates") return "#0D9488";
  return "#94a3b8";
}

function buildGraph(claims: Claim[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const conceptMap = new Map<string, string>();

  claims.forEach((claim, i) => {
    nodes.push({
      id: claim.claim_id,
      label: claim.original_text.length > 50
        ? claim.original_text.slice(0, 47) + "…"
        : claim.original_text,
      type: "claim",
      verdict: claim.verdict,
      claimIndex: i,
    });

    const words = claim.original_text.split(/\s+/).slice(0, 3).join(" ");
    const conceptLabel = words.charAt(0).toUpperCase() + words.slice(1);

    if (!conceptMap.has(conceptLabel)) {
      const conceptId = `concept-${conceptLabel}`;
      conceptMap.set(conceptLabel, conceptId);
      nodes.push({ id: conceptId, label: conceptLabel, type: "concept" });
    }

    edges.push({ source: claim.claim_id, target: conceptMap.get(conceptLabel)!, weight: 1 });
  });

  const conceptEntries = Array.from(conceptMap.entries());
  for (let i = 0; i < conceptEntries.length; i++) {
    for (let j = i + 1; j < conceptEntries.length; j++) {
      const [labelA, idA] = conceptEntries[i];
      const [labelB, idB] = conceptEntries[j];
      const wordsA = new Set(labelA.toLowerCase().split(/\s+/));
      const wordsB = new Set(labelB.toLowerCase().split(/\s+/));
      const shared = [...wordsA].filter((w) => w.length > 3 && wordsB.has(w));
      if (shared.length > 0) edges.push({ source: idA, target: idB, weight: shared.length });
    }
  }

  return { nodes, edges };
}

export default function ConceptGraph({ claims }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, edges } = useMemo(() => buildGraph(claims), [claims]);

  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [layoutMode, setLayoutMode] = useState<"force" | "radial">("force");

  const selectedIdRef = useRef<string | null>(null);
  const setSelectedRef = useRef(setSelectedClaim);
  setSelectedRef.current = setSelectedClaim;

  const claimMap = useMemo(() => new Map(claims.map((c) => [c.claim_id, c])), [claims]);
  const claimMapRef = useRef(claimMap);
  claimMapRef.current = claimMap;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth ?? 800;
    const height = Math.min(Math.max(width * 0.6, 400), 600);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg.selectAll("*").remove();

    svg.append("rect")
      .attr("width", width).attr("height", height).attr("rx", 12)
      .attr("fill", BG_COLOR);

    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
      .attr("id", "grid").attr("width", 30).attr("height", 30)
      .attr("patternUnits", "userSpaceOnUse");
    pattern.append("circle").attr("cx", 15).attr("cy", 15).attr("r", 1)
      .attr("fill", "rgba(148,163,184,0.12)");
    svg.append("rect")
      .attr("width", width).attr("height", height).attr("rx", 12)
      .attr("fill", "url(#grid)");

    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    type SimNode = GraphNode & d3.SimulationNodeDatum;
    type SimLink = {
      source: SimNode;
      target: SimNode;
      weight: number;
      relationship_type?: string;
      relationship_label?: string;
    };

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .map((e) => {
        const s = nodeById.get(e.source);
        const t = nodeById.get(e.target);
        if (!s || !t) return null;
        return {
          source: s,
          target: t,
          weight: e.weight,
          relationship_type: e.relationship_type,
          relationship_label: e.relationship_label,
        };
      })
      .filter(Boolean) as SimLink[];

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance((d) => d.weight > 1 ? 80 : 120)
        .strength(0.4))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => d.type === "claim" ? 36 : 28));

    if (layoutMode === "radial") {
      simulation.force(
        "radial",
        d3.forceRadial(
          (d: SimNode) => (d.type === "claim" ? 80 : 180),
          width / 2,
          height / 2
        ).strength(0.4)
      );
    }

    const g = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Click background to deselect
    svg.on("click", () => {
      selectedIdRef.current = null;
      circles.transition().duration(200)
        .attr("r", (n) => n.type === "claim" ? 14 : 9)
        .attr("stroke", "none");
      setSelectedRef.current(null);
    });

    const link = g.append("g").selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks).join("line")
      .attr("stroke", (d) => {
        const rel = d.relationship_type;
        if (rel === "contradicts") return "#F43F5E";
        if (rel === "supports") return "#10B981";
        if (rel === "elaborates") return "#0D9488";
        return EDGE_COLOR;
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.min(d.weight * 1.2, 4));

    // Edge labels (relationship descriptions)
    const linkLabelG = g.append("g").attr("class", "link-labels");

    const linkLabel = linkLabelG
      .selectAll<SVGTextElement, SimLink>("text")
      .data(simLinks.filter((d) => !!d.relationship_label))
      .join("text")
      .attr("font-size", 9)
      .attr("fill", "#94a3b8")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .attr("dy", -4)
      .text((d) => d.relationship_label ?? "");

    const nodeGroup = g.append("g").selectAll<SVGGElement, SimNode>("g")
      .data(simNodes).join("g")
      .attr("cursor", (d) => d.type === "claim" ? "pointer" : "grab")
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    const circles = nodeGroup.append("circle")
      .attr("r", (d) => d.type === "claim" ? 14 : 9)
      .attr("fill", (d) =>
        d.type === "claim"
          ? (VERDICT_COLORS[d.verdict ?? "unclear"] ?? "#94A3B8")
          : CONCEPT_COLOR
      )
      .attr("filter", "url(#glow)")
      .attr("opacity", 0.9)
      .on("mouseover", function (_, d) {
        if (selectedIdRef.current === d.id) return;
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 18 : 12);
        link.attr("stroke", (l) =>
          (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id
            ? EDGE_HOVER_COLOR
            : getRelationshipColor(l.relationship_type)
        );
      })
      .on("mouseout", function (_, d) {
        if (selectedIdRef.current === d.id) return;
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 14 : 9);
        link.attr("stroke", (l) => getRelationshipColor(l.relationship_type));
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.type !== "claim") return;

        const isSame = selectedIdRef.current === d.id;
        selectedIdRef.current = isSame ? null : d.id;

        circles.transition().duration(200)
          .attr("r", (n) => {
            if (n.type === "concept") return 9;
            return selectedIdRef.current === n.id ? 22 : 14;
          })
          .attr("stroke", (n) => selectedIdRef.current === n.id ? "white" : "none")
          .attr("stroke-width", 2);

        link.attr("stroke", (l) => getRelationshipColor(l.relationship_type));
        setSelectedRef.current(isSame ? null : (claimMapRef.current.get(d.id) ?? null));
      });

    nodeGroup.append("text")
      .text((d) => d.type === "concept" ? d.label : `C${(d.claimIndex ?? 0) + 1}`)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.type === "claim" ? 4 : 3)
      .attr("font-size", (d) => d.type === "claim" ? "9px" : "7px")
      .attr("font-weight", "700")
      .attr("fill", "#0f172a")
      .attr("pointer-events", "none");

    nodeGroup.append("text")
      .filter((d) => d.type === "concept")
      .text((d) => d.label.length > 22 ? d.label.slice(0, 19) + "…" : d.label)
      .attr("text-anchor", "middle")
      .attr("dy", 22)
      .attr("font-size", "9px")
      .attr("fill", "rgba(148,163,184,0.8)")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      linkLabel
        .attr("x", (d) => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr("y", (d) => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2);
      nodeGroup.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Re-heat simulation on layout mode change
    simulation.alpha(0.5).restart();

    return () => { simulation.stop(); };
  }, [nodes, edges, layoutMode]);

  if (claims.length === 0) return null;

  const verdictColor = selectedClaim
    ? VERDICT_COLORS[selectedClaim.verdict] ?? "#94A3B8"
    : "#94A3B8";

  return (
    <div className="rounded-xl overflow-hidden border border-vellum" ref={containerRef}>
      {/* Layout toggle */}
      <div className="flex justify-end px-3 pt-2">
        <button
          onClick={() => setLayoutMode(m => m === "force" ? "radial" : "force")}
          className="text-xs text-ink-faint hover:text-navy border border-border rounded px-2 py-1 transition-colors"
        >
          {layoutMode === "force" ? "Radial layout" : "Force layout"}
        </button>
      </div>

      <svg ref={svgRef} className="w-full block" style={{ minHeight: 400 }} />

      {/* Selected claim detail panel */}
      {selectedClaim && (
        <div className="bg-slate-900 border-t border-white/10 px-5 py-4 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 tabular-nums">
                C{claims.findIndex((c) => c.claim_id === selectedClaim.claim_id) + 1}
              </span>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border"
                style={{
                  color: verdictColor,
                  backgroundColor: `${verdictColor}22`,
                  borderColor: `${verdictColor}44`,
                }}
              >
                {VERDICT_LABELS[selectedClaim.verdict] ?? selectedClaim.verdict}
              </span>
            </div>
            <button
              onClick={() => { selectedIdRef.current = null; setSelectedClaim(null); }}
              className="shrink-0 rounded-md p-1 text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-slate-200 mb-3">
            &ldquo;{selectedClaim.original_text}&rdquo;
          </p>

          <p className="text-xs text-slate-400 leading-relaxed mb-2">
            {selectedClaim.explanation}
          </p>

          {selectedClaim.sources.length > 0 && (
            <p className="text-[11px] text-slate-500">
              {selectedClaim.sources.length} source{selectedClaim.sources.length !== 1 ? "s" : ""} checked
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-950 px-5 py-3 border-t border-white/5 text-xs text-slate-400">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Legend</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#10B981" }} />
          <span>Supported</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#F59E0B" }} />
          <span>Contested</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#F43F5E" }} />
          <span>Refuted</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#0D9488" }} />
          <span>Concept</span>
        </span>
        <span className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
          <span className="w-4 inline-block border-t-2" style={{ borderColor: "#10B981" }} />
          <span>supports</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 inline-block border-t-2" style={{ borderColor: "#F43F5E" }} />
          <span>contradicts</span>
        </span>
        <span className="ml-auto text-[10px] text-slate-600">Click claim · Drag · Scroll to zoom</span>
      </div>
    </div>
  );
}
