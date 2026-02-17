import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { Claim } from "@verities/shared";

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
}

interface Props {
  claims: Claim[];
}

// Verdict → node fill color (Obsidian-friendly palette)
const VERDICT_COLORS: Record<string, string> = {
  broadly_supported: "#4ade80",  // green
  overstated: "#f87171",         // red
  disputed: "#fb923c",           // orange
  unclear: "#9ca3af",            // gray
};

const CONCEPT_COLOR = "#60a5fa";  // cerulean blue
const BG_COLOR = "#0f172a";       // slate-950 — Obsidian dark
const EDGE_COLOR = "rgba(148,163,184,0.3)";
const EDGE_HOVER_COLOR = "rgba(148,163,184,0.7)";

function buildGraph(claims: Claim[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const conceptMap = new Map<string, string>(); // label → node id

  // Add claim nodes
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

    // Extract concept (subject) from claim text — use first few words as concept label
    const words = claim.original_text.split(/\s+/).slice(0, 3).join(" ");
    const conceptLabel = words.charAt(0).toUpperCase() + words.slice(1);

    if (!conceptMap.has(conceptLabel)) {
      const conceptId = `concept-${conceptLabel}`;
      conceptMap.set(conceptLabel, conceptId);
      nodes.push({
        id: conceptId,
        label: conceptLabel,
        type: "concept",
      });
    }

    const conceptId = conceptMap.get(conceptLabel)!;
    edges.push({ source: claim.claim_id, target: conceptId, weight: 1 });
  });

  // Connect concepts that share common keywords
  const conceptEntries = Array.from(conceptMap.entries());
  for (let i = 0; i < conceptEntries.length; i++) {
    for (let j = i + 1; j < conceptEntries.length; j++) {
      const [labelA, idA] = conceptEntries[i];
      const [labelB, idB] = conceptEntries[j];
      const wordsA = new Set(labelA.toLowerCase().split(/\s+/));
      const wordsB = new Set(labelB.toLowerCase().split(/\s+/));
      const shared = [...wordsA].filter((w) => w.length > 3 && wordsB.has(w));
      if (shared.length > 0) {
        edges.push({ source: idA, target: idB, weight: shared.length });
      }
    }
  }

  return { nodes, edges };
}

export default function ConceptGraph({ claims }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, edges } = useMemo(() => buildGraph(claims), [claims]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 420;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg.selectAll("*").remove();

    // Background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("rx", 12)
      .attr("fill", BG_COLOR);

    // Subtle grid dots (Obsidian aesthetic)
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
      .attr("id", "grid")
      .attr("width", 30)
      .attr("height", 30)
      .attr("patternUnits", "userSpaceOnUse");
    pattern.append("circle")
      .attr("cx", 15).attr("cy", 15).attr("r", 1)
      .attr("fill", "rgba(148,163,184,0.12)");
    svg.append("rect")
      .attr("width", width).attr("height", height).attr("rx", 12)
      .attr("fill", "url(#grid)");

    // Glow filter for nodes
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Build simulation data
    type SimNode = GraphNode & d3.SimulationNodeDatum;
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

    // Force simulation
    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance((d) => d.weight > 1 ? 80 : 120)
        .strength(0.4))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => d.type === "claim" ? 36 : 28));

    // Zoom group
    const g = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Draw edges
    const link = g.append("g").selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", EDGE_COLOR)
      .attr("stroke-width", (d) => Math.min(d.weight * 1.2, 4));

    // Draw nodes group
    const nodeGroup = g.append("g").selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "grab")
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

    // Node circles
    nodeGroup.append("circle")
      .attr("r", (d) => d.type === "claim" ? 14 : 9)
      .attr("fill", (d) =>
        d.type === "claim"
          ? (VERDICT_COLORS[d.verdict ?? "unclear"] ?? "#9ca3af")
          : CONCEPT_COLOR
      )
      .attr("filter", "url(#glow)")
      .attr("opacity", 0.9)
      .on("mouseover", function (_, d) {
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 18 : 12);
        // Highlight adjacent edges
        link.attr("stroke", (l) =>
          (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id
            ? EDGE_HOVER_COLOR
            : EDGE_COLOR
        );
      })
      .on("mouseout", function (_, d) {
        d3.select(this).transition().duration(150).attr("r", d.type === "claim" ? 14 : 9);
        link.attr("stroke", EDGE_COLOR);
      });

    // Node labels
    nodeGroup.append("text")
      .text((d) => d.type === "concept" ? d.label : `C${(d.claimIndex ?? 0) + 1}`)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.type === "claim" ? 4 : 3)
      .attr("font-size", (d) => d.type === "claim" ? "9px" : "7px")
      .attr("font-weight", "700")
      .attr("fill", "#0f172a")
      .attr("pointer-events", "none");

    // Tooltip label below concept nodes
    nodeGroup.append("text")
      .filter((d) => d.type === "concept")
      .text((d) => d.label.length > 22 ? d.label.slice(0, 19) + "…" : d.label)
      .attr("text-anchor", "middle")
      .attr("dy", 22)
      .attr("font-size", "9px")
      .attr("fill", "rgba(148,163,184,0.8)")
      .attr("pointer-events", "none");

    // Tick update
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

  return (
    <div className="rounded-xl overflow-hidden border border-vellum" ref={containerRef}>
      <svg ref={svgRef} className="w-full block" style={{ minHeight: 420 }} />
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-950 px-5 py-3 border-t border-white/5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Legend</span>
        {Object.entries(VERDICT_COLORS).map(([verdict, color]) => (
          <div key={verdict} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-slate-400 capitalize">
              {verdict.replace("_", " ")}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CONCEPT_COLOR }} />
          <span className="text-[10px] text-slate-400">Concept</span>
        </div>
        <span className="ml-auto text-[10px] text-slate-600">Drag to rearrange · Scroll to zoom</span>
      </div>
    </div>
  );
}
