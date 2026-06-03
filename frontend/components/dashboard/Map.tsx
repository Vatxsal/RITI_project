"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICTS } from '@/lib/data';
import { DashboardKpiPayload, fetchDashboardKpis, getEmptyDashboardPayload } from '@/lib/dashboard-kpis';

type DistrictScore = DashboardKpiPayload['districtScores'][number] & { lat: number; lon: number };

type MapPredicate = {
  id: number;
  type: 'attribute' | 'spatial';
  field: string;
  op: string;
  value: string;
};

type MapLayerState = {
  govtSchools: boolean;
  healthInstitutes: boolean;
  ayush: boolean;
  policeStations: boolean;
  anganwadi: boolean;
};

type MapProps = {
  predicates?: MapPredicate[];
  activeLayers?: MapLayerState;
  compact?: boolean;
  style?: CSSProperties;
};

const DISTRICT_ALIASES: Record<string, string> = {
  balotra: 'Balotara',
  balotara: 'Balotara',
  chittaurgarh: 'Chittorgarh',
  chittorgarh: 'Chittorgarh',
  jalor: 'Jalore',
  jalore: 'Jalore',
  'sawai madhopur': 'Sawai Madhopur',
  'sri ganganagar': 'Sri Ganganagar',
  'kotputli behror': 'Kotputli-Behror',
  'kotputli-behror': 'Kotputli-Behror',
  'khairthal tijara': 'Khairthal-Tijara',
  'khairthal-tijara': 'Khairthal-Tijara',
  'didwana kuchaman': 'Didwana-Kuchaman',
  'didwana-kuchaman': 'Didwana-Kuchaman',
};

const DISTRICT_COORDS = Object.fromEntries(
  DISTRICTS.map((district) => [
    district.n.toLowerCase(),
    { name: district.n, lat: district.lat, lon: district.lon },
  ])
) as Record<string, { name: string; lat: number; lon: number }>;

function normalizeDistrictName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveDistrictName(name: string) {
  const normalized = normalizeDistrictName(name);
  return DISTRICT_ALIASES[normalized] ?? name;
}

function getDistrictCoords(name: string) {
  const resolved = resolveDistrictName(name);
  return DISTRICT_COORDS[normalizeDistrictName(resolved)] ?? null;
}

export default function Map({ compact = false, style }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Store the Leaflet map instance and L module so marker effect can access them
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [payload, setPayload] = useState<DashboardKpiPayload>(getEmptyDashboardPayload());

  useEffect(() => {
    let alive = true;
    fetchDashboardKpis()
      .then((next) => { if (alive) setPayload(next ?? getEmptyDashboardPayload()); })
      .catch(() => { if (alive) setPayload(getEmptyDashboardPayload()); });
    return () => { alive = false; };
  }, []);

  const districtMarkers = useMemo(() => {
    return payload.districtScores
      .map((d) => {
        const coords = getDistrictCoords(d.n);
        if (!coords) return null;
        return { ...d, lat: coords.lat, lon: coords.lon } as DistrictScore;
      })
      .filter(Boolean) as DistrictScore[];
  }, [payload]);

  const totals = useMemo(() => {
    const green  = districtMarkers.filter((d) => d.dev >= 55).length;
    const yellow = districtMarkers.filter((d) => d.dev >= 45 && d.dev < 55).length;
    const red    = districtMarkers.filter((d) => d.dev < 45).length;
    const top    = [...districtMarkers].sort((a, b) => b.dev - a.dev)[0] ?? null;
    const bottom = [...districtMarkers].sort((a, b) => a.dev - b.dev)[0] ?? null;
    return { green, yellow, red, top, bottom };
  }, [districtMarkers]);

  // ── Effect 1: initialise Leaflet map once on mount ────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    (async () => {
      const leafletModule = await import('leaflet');
      const L = (leafletModule as any).default ?? leafletModule;

      if (disposed) return;

      // Remove any stale Leaflet containers left from HMR
      try {
        container.querySelectorAll('.leaflet-container').forEach((el) => el.remove());
      } catch (_) {}

      let map: any;
      try {
        map = L.map(container, { zoomControl: true, preferCanvas: true });
        map.setView([26.8, 74.5], 6);
      } catch (_) {
        return;
      }

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 13,
        tileSize: 256,
        detectRetina: false,
      }).addTo(map);

      mapRef.current = map;
      leafletRef.current = L;

      // Use ResizeObserver so invalidateSize is called whenever the
      // container actually gains/changes size (solves the 0-height race).
      const ro = new ResizeObserver(() => {
        if (!disposed && map) {
          map.invalidateSize();
        }
      });
      ro.observe(container);

      // Also fire once after a short delay as a safety net
      setTimeout(() => { if (!disposed && map) map.invalidateSize(); }, 300);
      setTimeout(() => { if (!disposed && map) map.invalidateSize(); }, 800);

      // Store cleanup on the ref so effect 2 can reference it
      (mapRef as any)._ro = ro;
    })();

    return () => {
      disposed = true;
      const ro = (mapRef as any)._ro as ResizeObserver | undefined;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // run once on mount

  // ── Effect 2: add/update district markers whenever data changes ───────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !districtMarkers.length) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const L = leafletRef.current;
    if (!L) return;

    const points = districtMarkers.filter(
      (d) => typeof d.lat === 'number' && typeof d.lon === 'number'
    );
    const maxP = Math.max(...points.map((d) => d.pop), 1);

    points.forEach((d) => {
      const col = d.dev >= 55 ? '#22C55E' : d.dev >= 45 ? '#F59E0B' : '#EF4444';
      const r = Math.max(8, Math.sqrt(d.pop / maxP) * 34);
      const marker = L.circleMarker([d.lat, d.lon], {
        radius: r,
        fillColor: col,
        color: 'rgba(255,255,255,.75)',
        weight: 1,
        fillOpacity: 1,
        opacity: 1,
      }).addTo(map);

      marker.bindTooltip(`${d.n} · ${d.dev}/100`, { direction: 'top', sticky: true });
      marker.bindPopup(
        `<div style="font-weight:800;font-size:13px;margin-bottom:4px">${d.n}</div>` +
        `<div style="font-size:12px;color:#475569;line-height:1.5">Score: ${d.dev}/100<br/>Population: ${d.pop}L<br/>GPs: ${d.gps}<br/>Blocks: ${d.blks}</div>`
      );
      markersRef.current.push(marker);
    });

    // Fit bounds once markers are placed
    try {
      const bounds = L.latLngBounds(points.map((d) => [d.lat, d.lon] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.08), { animate: false, padding: [60, 60] });
      }
    } catch (_) {}

    map.invalidateSize();
  }, [districtMarkers]);

  return (
    <div style={{ height: compact ? '100%' : 'auto', width: '100%', ...style }}>
      {!compact && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="chip">{districtMarkers.length} districts plotted</span>
            <span className="chip" style={{ color: '#22C55E' }}>Green {totals.green}</span>
            <span className="chip" style={{ color: '#F59E0B' }}>Yellow {totals.yellow}</span>
            <span className="chip" style={{ color: '#EF4444' }}>Red {totals.red}</span>
            <span className="chip">Source {payload.source ?? 'live'}</span>
            <span className="chip">Updated {payload.lastUpdated ? new Date(payload.lastUpdated).toLocaleString('en-IN') : 'just now'}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--bd)] bg-[var(--nv)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--t3)]">Top district</div>
              <div className="mt-1 text-sm font-semibold text-[var(--t1)]">{totals.top ? `${totals.top.n} · ${totals.top.dev}/100` : 'No live data yet'}</div>
              <div className="mt-1 text-[11px] text-[var(--t2)]">Highest composite score from the live cache.</div>
            </div>
            <div className="rounded-xl border border-[var(--bd)] bg-[var(--nv)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--t3)]">Needs attention</div>
              <div className="mt-1 text-sm font-semibold text-[var(--t1)]">{totals.bottom ? `${totals.bottom.n} · ${totals.bottom.dev}/100` : 'No live data yet'}</div>
              <div className="mt-1 text-[11px] text-[var(--t2)]">Lowest composite score from the live cache.</div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          height: compact ? '100%' : 440,
          width: '100%',
          borderRadius: compact ? 0 : 12,
          overflow: 'hidden',
          // Ensure minimum height so Leaflet has something to paint into
          minHeight: compact ? 200 : 440,
        }}
      />
    </div>
  );
}
