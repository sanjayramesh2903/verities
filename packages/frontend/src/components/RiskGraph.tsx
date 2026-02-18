import { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import type { HighRiskClaim } from "@verities/shared";
import { X, AlertTriangle } from "lucide-react";

interface RiskNode {
  id: string;
  label: string;
  type: "claim" | "concept";
  riskScore?: number;
  claimIndex?: number;
}

interface RiskEdge {
  source: string;
  target: string;
  weight: number;
}

interface Props {
  claims: HighRiskClaim[];
}

const SIGNAL_LABELS: Record<string, string> = {
  superlative: "Superlative",
  specific_number: "Number",
  specific_date: "Date",
  statistical_assertion: "Statistic",
  no_citation: "No Citation",
};

function riskColor(score: number): string {
  if (score > 0.7) return "#f87171";
  if (score > 0.4) return "#fb923c";
  return "#4ade80";
}

const CONCEPT_COLOR = "#60a5fa";
const BG_COLOR = "#0f172a";
const EDGE_COLOR = "rgba(148,163,184,0.25)";
const EDGE_HOVER_COLOR = "rgba(148,163,184,0.65)";

function buildRiskGraph(claims: HighRiskClaim[]): { nodes: RiskNode[]; edges: RiskEdge[] } {
  const nodes: RiskNode[] = [];
  const edges: RiskEdge[] = [];
  const conceptMap = new Map<string, string>();

  claims.forEach((claim, i) => {
    nodes.push({
      id: claim.claim_id,
      label: claim.original_text.length > 50
        ? claim.original_text.slice(0, 47) + "…"
        : claim.original_text,
      type: "claim",
      riskScore: claim.risk_score,
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

export default function RiskGraph({ claims }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, edges } = useMemo(() => buildRiskGraph(claims), [claims]);

  const [selectedClaim, setSelectedClaim] = useState<HighRiskClaim | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const setSelectedRef = useRef(setSelectedClaim);
  setSelectedRef.current = setSelectedClaim;

  const claimMap = useMemo(() => new Map(claims.map((c) => [c.claim_id, c])), [claims]);
  const claimMapRef = useRef(claimMap);
  claimMapRef.current = claimMap;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 380;

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
      .attr("id", "riskgrid").attr("width", 30).attr("height", 30)
      .attr("patternUnits", "userSpaceOnUse");
    pattern.append("circle").attr("cx", 15).attr("cy", 15).attr("r", 1)
      .attr("fill", "rgba(148,163,184,0.1)");
    svg.append("rect").attr("width", width).attr("height", height).attr("rx", 12)
      .attr("fill", "url(#riskgrid)");

    const filter = defs.append("filter").attr("id", "riskglow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    type SimNode = RiskNode & d3.SimulationNodeDatum;
    type SimLink = { source: SimNode; target: SimNode; weight: number };

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .map((e) => {
        const s = nodeById.get(e.source);
        const t = nodeById.get(e.target);
        if (!s || !t) return null;
        return { source: s, target: t, weight: e.weight };
      })
      .filter(Boolean) as SimLink[];

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id).distance(110).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => d.type === "claim" ? 38 : 30));

    const g = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Click SVG background to deselect
    svg.on("click", () => {
      selectedIdRef.current = null;
      circles.transition().duration(200)
        .attr("r", (n) => n.type === "claim" ? 14 : 9)
        .attr("stroke", "none");
      setSelectedRef.current(null);
    });

    const link = g.append("g").selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks).join("line")
      .attr("stroke", EDGE_COLOR)
      .attr("stroke-width", (d) => Math.min(d.weight * 1.2, 4));

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
        d.type === "claim" ? riskColor(d.riskScore ?? 0) : CONCEPT_COLOR
      )
      .attr("filter", "url(#riskglow)")
      .attr("opacity", 0)
      .on("mouseover", function (_, d) {
        if (selectedIdRef.current === d.id) return;
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 18 : 12);
        link.attr("stroke", (l) =>
          (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id
            ? EDGE_HOVER_COLOR : EDGE_COLOR
        );
      })
      .on("mouseout", function (_, d) {
        if (selectedIdRef.current === d.id) return;
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 14 : 9);
        link.attr("stroke", EDGE_COLOR);
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

        link.attr("stroke", EDGE_COLOR);
        setSelectedRef.current(isSame ? null : (claimMapRef.current.get(d.id) ?? null));
      })
      .transition().duration(600).delay((_, i) => i * 40)
      .attr("opacity", 0.9);

    nodeGroup.append("text")
      .text((d) => d.type === "concept" ? d.label : `R${(d.claimIndex ?? 0) + 1}`)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.type === "claim" ? 4 : 3)
      .attr("font-size", (d) => d.type === "claim" ? "9px" : "7px")
      .attr("font-weight", "700")
      .attr("fill", "#0f172a")
      .attr("pointer-events", "none");

    nodeGroup.append("text")
      .filter((d) => d.type === "concept")
      .text((d) => d.label.length > 20 ? d.label.slice(0, 17) + "…" : d.label)
      .attr("text-anchor", "middle")
      .attr("dy", 22)
      .attr("font-size", "9px")
      .attr("fill", "rgba(148,163,184,0.7)")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      nodeGroup.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges]);

  if (claims.length === 0) return null;

  const riskPercent = selectedClaim ? Math.round(selectedClaim.risk_score * 100) : 0;
  const riskLabel = selectedClaim
    ? selectedClaim.risk_score > 0.7 ? "High Risk"
      : selectedClaim.risk_score > 0.4 ? "Needs Review"
      : "Likely OK"
    : "";
  const riskBadgeColor = selectedClaim
    ? selectedClaim.risk_score > 0.7
      ? "bg-[#f87171]/20 text-[#f87171] border-[#f87171]/30"
      : selectedClaim.risk_score > 0.4
        ? "bg-[#fb923c]/20 text-[#fb923c] border-[#fb923c]/30"
        : "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/30"
    : "";

  return (
    <div className="rounded-xl overflow-hidden border border-vellum animate-fade-in" ref={containerRef}>
      <div className="bg-slate-950 px-5 py-2.5 border-b border-white/5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Claim Risk Map
        </span>
      </div>

      <svg ref={svgRef} className="w-full block" style={{ minHeight: 380 }} />

      {/* Selected claim detail panel */}
      {selectedClaim && (
        <div className="bg-slate-900 border-t border-white/10 px-5 py-4 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 tabular-nums">
                R{claims.findIndex((c) => c.claim_id === selectedClaim.claim_id) + 1}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${riskBadgeColor}`}>
                <AlertTriangle className="h-3 w-3" />
                {riskLabel} · {riskPercent}%
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

          {selectedClaim.risk_signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedClaim.risk_signals.map((sig) => (
                <span
                  key={sig}
                  className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-400"
                >
                  {SIGNAL_LABELS[sig] ?? sig}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 leading-relaxed">
            {selectedClaim.summary_verdict}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-slate-950 px-5 py-3 border-t border-white/5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Legend</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          <span className="text-[10px] text-slate-400">High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#fb923c]" />
          <span className="text-[10px] text-slate-400">Needs Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
          <span className="text-[10px] text-slate-400">Likely OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]" />
          <span className="text-[10px] text-slate-400">Concept</span>
        </div>
        <span className="ml-auto text-[10px] text-slate-600">Click claim · Drag · Scroll to zoom</span>
      </div>
    </div>
  );
}
