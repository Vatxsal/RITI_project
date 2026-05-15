"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICTS } from '@/lib/data';
import { DashboardKpiPayload, fetchDashboardKpis, getEmptyDashboardPayload } from '@/lib/dashboard-kpis';

type DistrictScore = DashboardKpiPayload['districtScores'][number] & { lat: number; lon: number };

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
    {
      name: district.n,
      lat: district.lat,
      lon: district.lon,
    },
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
  const coords = DISTRICT_COORDS[normalizeDistrictName(resolved)];
  return coords ?? null;
}

export default function Map() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [payload, setPayload] = useState<DashboardKpiPayload>(getEmptyDashboardPayload());

  useEffect(() => {
    let alive = true;

    fetchDashboardKpis()
      .then((nextPayload) => {
        if (alive) setPayload(nextPayload ?? getEmptyDashboardPayload());
      })
      .catch(() => {
        if (alive) setPayload(getEmptyDashboardPayload());
      });

    return () => {
      alive = false;
    };
  }, []);

  const districtMarkers = useMemo(() => {
    return payload.districtScores
      .map((district) => {
        const coords = getDistrictCoords(district.n);
        if (!coords) return null;
        return {
          ...district,
          lat: coords.lat,
          lon: coords.lon,
        } as DistrictScore;
      })
      .filter(Boolean) as DistrictScore[];
  }, [payload]);

  const totals = useMemo(() => {
    const green = districtMarkers.filter((district) => district.dev >= 55).length;
    const yellow = districtMarkers.filter((district) => district.dev >= 45 && district.dev < 55).length;
    const red = districtMarkers.filter((district) => district.dev < 45).length;
    const top = [...districtMarkers].sort((left, right) => right.dev - left.dev)[0] ?? null;
    const bottom = [...districtMarkers].sort((left, right) => left.dev - right.dev)[0] ?? null;

    return { green, yellow, red, top, bottom };
  }, [districtMarkers]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    if (!districtMarkers.length) return;

    let map: any = null;
    let disposed = false;

    (async () => {
      const leafletModule = await import('leaflet');
      const L = (leafletModule as any).default ?? leafletModule;

      // remove any existing leaflet container(s) to avoid "already initialized" errors
      try {
        const existing = container.querySelectorAll('.leaflet-container');
        existing.forEach((el) => el.remove());
      } catch (e) {}

      try {
        map = L.map(container, { zoomControl: true });
        // ensure a sensible initial view so tiles start loading
        map.setView([26.8, 74.5], 6);
      } catch (err) {
        return;
      }

      // Use a stable OSM tile source for consistent rendering in dev
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 13,
        tileSize: 256,
        detectRetina: false,
      }).addTo(map);

      const points = districtMarkers.filter((district) => typeof district.lat === 'number' && typeof district.lon === 'number');
      const maxP = Math.max(...points.map((district) => district.pop), 1);
      const bounds = L.latLngBounds(points.map((district) => [district.lat, district.lon] as [number, number]));

      points.forEach((district) => {
        const col = district.dev >= 55 ? '#22C55E' : district.dev >= 45 ? '#F59E0B' : '#EF4444';
        const r = Math.max(8, Math.sqrt(district.pop / maxP) * 34);
        const marker = L.circleMarker([district.lat, district.lon], {
          radius: r,
          fillColor: col,
          color: 'rgba(255,255,255,.75)',
          weight: 1,
          fillOpacity: 1,
          opacity: 1,
        }).addTo(map!);

        marker.bindTooltip(`${district.n} · ${district.dev}/100`, { direction: 'top', sticky: true });
        marker.bindPopup(
          `<div style="font-weight:800;font-size:13px;margin-bottom:4px">${district.n}</div>` +
            `<div style="font-size:12px;color:#475569;line-height:1.5">Score: ${district.dev}/100<br/>Population: ${district.pop}L<br/>GPs: ${district.gps}<br/>Blocks: ${district.blks}</div>`
        );
      });

      requestAnimationFrame(() => {
        if (disposed || !map) return;
        map.invalidateSize();

        if (bounds.isValid()) {
          // add padding so markers are clearly visible inside the card
          map.fitBounds(bounds.pad(0.08), { animate: false, padding: [60, 60] });
        } else {
          map.setView([26.5, 73.5], 6);
        }

        map.invalidateSize();
      });
    })();

    return () => {
      disposed = true;
      map?.remove();
      map = null;
    };
  }, [districtMarkers]);

  return (
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

      <div id="mapwrap" ref={ref} style={{ height: 440, width: '100%', borderRadius: 12, overflow: 'hidden' }} />
    </div>
  );
}
