"use client";

import { useEffect, useMemo, useState } from "react";

const W = 520;
const H = 340;

interface SedeNode {
  id: string;
  code: string;
  name: string;
  lat: number | null;
  lon: number | null;
  headcount: number;
  absenteeismRate: number | null;
}

interface MapaEspanaProps {
  sedes: SedeNode[];
}

// ============================================================================
// Projection: dual bbox (peninsular Iberia + Canarias inset).
// ============================================================================

const MAIN_BBOX = {
  minLon: -9.5,
  maxLon: 4.5,
  // minLat = 35.0 to fit Ceuta (35.89) and Melilla (35.29) just above the inset.
  minLat: 35.0,
  maxLat: 43.9,
};

const CAN_BBOX = {
  minLon: -18.3,
  maxLon: -13.3,
  minLat: 27.5,
  maxLat: 29.6,
};

const INSET = { x: 8, y: H - 76, w: 138, h: 60 };
const MAIN_PAD = 14;
const MAIN_BOTTOM_RESERVE = 60; // empty strip at the bottom for the Canarias inset

function projMain(lon: number, lat: number): [number, number] {
  const x =
    MAIN_PAD +
    ((lon - MAIN_BBOX.minLon) / (MAIN_BBOX.maxLon - MAIN_BBOX.minLon)) *
      (W - MAIN_PAD * 2);
  const y =
    MAIN_PAD +
    ((MAIN_BBOX.maxLat - lat) / (MAIN_BBOX.maxLat - MAIN_BBOX.minLat)) *
      (H - MAIN_PAD * 2 - MAIN_BOTTOM_RESERVE);
  return [x, y];
}

function projCan(lon: number, lat: number): [number, number] {
  const x =
    INSET.x +
    ((lon - CAN_BBOX.minLon) / (CAN_BBOX.maxLon - CAN_BBOX.minLon)) * INSET.w;
  const y =
    INSET.y +
    ((CAN_BBOX.maxLat - lat) / (CAN_BBOX.maxLat - CAN_BBOX.minLat)) * INSET.h;
  return [x, y];
}

function isCanarias(lon: number, lat: number): boolean {
  return lon < -10 && lat < 30;
}

function project(lon: number, lat: number): [number, number] {
  return isCanarias(lon, lat) ? projCan(lon, lat) : projMain(lon, lat);
}

// ============================================================================
// GeoJSON helpers.
// ============================================================================

type Ring = number[][]; // [[lon, lat], ...]
type Polygon = Ring[]; // outer + holes
type MultiPolygon = Polygon[];

interface GeoFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry:
    | { type: "Polygon"; coordinates: Polygon }
    | { type: "MultiPolygon"; coordinates: MultiPolygon };
}

interface GeoCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

function ringToPath(ring: Ring): string {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    const [x, y] = project(lon, lat);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
}

function featureToPath(f: GeoFeature): string {
  const g = f.geometry;
  const polys: MultiPolygon =
    g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.map((poly) => poly.map(ringToPath).join(" ")).join(" ");
}

// ============================================================================
// Component.
// ============================================================================

export function MapaEspana({ sedes }: MapaEspanaProps) {
  const [geo, setGeo] = useState<GeoCollection | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/spain-ccaa.geojson", { cache: "force-cache" })
      .then((r) => {
        if (!r.ok) throw new Error("non-ok");
        return r.json();
      })
      .then((json: GeoCollection) => {
        if (!cancelled) setGeo(json);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-compute paths once per geo load (don't recompute on hover).
  const featurePaths = useMemo(() => {
    if (!geo) return [];
    return geo.features.map((f) => ({
      key:
        (f.properties?.name as string | undefined) ??
        (f.properties?.cod_ccaa as string | undefined) ??
        Math.random().toString(36).slice(2),
      d: featureToPath(f),
    }));
  }, [geo]);

  const placed = sedes
    .filter((s): s is SedeNode & { lat: number; lon: number } =>
      s.lat !== null && s.lon !== null,
    )
    .map((s) => ({ ...s, xy: project(s.lon, s.lat) }));

  const hoverNode = placed.find((p) => p.id === hovered) ?? null;
  const totalSedes = sedes.length;
  const totalEmp = sedes.reduce((acc, s) => acc + (s.headcount ?? 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label="Mapa de sedes en España"
      >
        <defs>
          <pattern
            id="map-dots"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.2" cy="1.2" r="0.8" fill="var(--ink-4)" opacity="0.4" />
          </pattern>
          <radialGradient id="pin-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="35%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pin-halo-strong" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.7" />
            <stop offset="35%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Canarias inset frame (drawn behind so paths overlay) */}
        <rect
          x={INSET.x - 4}
          y={INSET.y - 4}
          width={INSET.w + 8}
          height={INSET.h + 8}
          rx={4}
          ry={4}
          fill="none"
          stroke="var(--line-2)"
          strokeWidth={0.6}
          strokeDasharray="3 3"
        />
        <text
          x={INSET.x}
          y={INSET.y - 8}
          fontFamily="var(--font-mono)"
          fontSize={9}
          fill="var(--ink-3)"
          letterSpacing="0.08em"
        >
          CANARIAS
        </text>

        {/* CCAA paths (real geometry) */}
        {featurePaths.length > 0 ? (
          featurePaths.map((fp) => (
            <path
              key={fp.key}
              d={fp.d}
              fill="url(#map-dots)"
              stroke="var(--line-3)"
              strokeWidth={0.7}
              fillRule="evenodd"
            />
          ))
        ) : loadError ? (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={11}
            fill="var(--ink-3)"
          >
            No se pudo cargar el mapa
          </text>
        ) : (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={10}
            fill="var(--ink-4)"
            letterSpacing="0.06em"
          >
            CARGANDO MAPA…
          </text>
        )}

        {/* Connection lines between sedes */}
        {placed.map((a, i) =>
          placed.slice(i + 1).map((b) => (
            <line
              key={`${a.id}-${b.id}`}
              x1={a.xy[0]}
              y1={a.xy[1]}
              x2={b.xy[0]}
              y2={b.xy[1]}
              stroke="var(--accent)"
              strokeWidth={0.5}
              strokeDasharray="2 3"
              opacity={0.3}
            />
          )),
        )}

        {/* Pins */}
        {placed.map((p) => {
          const r = 4 + Math.sqrt(Math.max(1, p.headcount)) * 0.85;
          const haloR = r * 5.2;
          const isHover = hovered === p.id;
          const [x, y] = p.xy;
          return (
            <g
              key={p.id}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Soft outer halo */}
              <circle
                cx={x}
                cy={y}
                r={haloR}
                fill={isHover ? "url(#pin-halo-strong)" : "url(#pin-halo)"}
                style={{ pointerEvents: "none" }}
              />
              {/* Pulsing ring */}
              <circle cx={x} cy={y} r={r} fill="var(--accent)" opacity={0.18}>
                <animate
                  attributeName="r"
                  from={r}
                  to={r * 3.4}
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.5"
                  to="0"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Solid pin */}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth={1.5}
              />
              {/* Name label */}
              <text
                x={x}
                y={y - r - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--ink)"
                style={{ pointerEvents: "none" }}
              >
                {p.name}
              </text>
              {/* Stat label */}
              <text
                x={x}
                y={y + r + 13}
                textAnchor="middle"
                fontSize="9.5"
                fontFamily="var(--font-mono)"
                fill="var(--ink-3)"
                letterSpacing="0.04em"
                style={{ pointerEvents: "none" }}
              >
                {p.headcount} EMP
                {p.absenteeismRate !== null
                  ? ` · ${p.absenteeismRate.toFixed(1)}% ABS`
                  : ""}
              </text>
            </g>
          );
        })}

        {/* Compass top-right */}
        <g transform={`translate(${W - 36}, 28)`} aria-hidden>
          <circle cx={0} cy={0} r={14} fill="var(--surface)" stroke="var(--line-2)" />
          <text
            x={0}
            y={-3}
            textAnchor="middle"
            fontSize="8"
            fontFamily="var(--font-mono)"
            fill="var(--ink-3)"
          >
            N
          </text>
          <line x1={0} y1={3} x2={0} y2={9} stroke="var(--ink-3)" strokeWidth={1} />
        </g>
      </svg>

      {/* Footer line: totals + hint */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.06em] text-ink-3 px-1">
        <span>
          · {totalSedes} {totalSedes === 1 ? "sede" : "sedes"} · {totalEmp} emp total ·
        </span>
        <span>
          {hoverNode
            ? `${hoverNode.name.toUpperCase()} · detalle abajo`
            : "Hover pin para detalle"}
        </span>
      </div>

      {/* Hover detail row */}
      {hoverNode ? (
        <div className="flex items-center gap-3 text-[12px] font-mono px-3 py-2 rounded-lg bg-surface-2 border border-line-2">
          <span className="text-ink font-semibold">{hoverNode.name}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink">{hoverNode.headcount} empleados</span>
          {hoverNode.absenteeismRate !== null ? (
            <>
              <span className="text-ink-3">·</span>
              <span className="text-ink">
                {hoverNode.absenteeismRate.toFixed(1)}% absentismo
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
