"use client";

import { useEffect, useRef } from 'react';
import { fetchDashboardKpis, getEmptyDashboardPayload } from '@/lib/dashboard-kpis';

export default function Map() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let map: any = null;
    let disposed = false;
    let statusEl: HTMLDivElement | null = null;

    // create debug status overlay early so cleanup can access it
    statusEl = document.createElement('div');
    statusEl.style.position = 'absolute';
    statusEl.style.right = '8px';
    statusEl.style.top = '8px';
    statusEl.style.zIndex = '9999';
    statusEl.style.padding = '6px 8px';
    statusEl.style.background = 'rgba(0,0,0,0.45)';
    statusEl.style.color = 'white';
    statusEl.style.fontSize = '12px';
    statusEl.style.borderRadius = '6px';
    statusEl.textContent = 'map:init';
    container.style.position = 'relative';
    container.appendChild(statusEl);

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
        if (statusEl) statusEl.textContent = 'map:exists';
        return;
      }
      if (statusEl) statusEl.textContent = 'map:leaflet_loaded';

      // Use a stable OSM tile source for consistent rendering in dev
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 13,
        tileSize: 256,
        detectRetina: false,
      }).addTo(map);

      const payload = await fetchDashboardKpis().catch(() => getEmptyDashboardPayload());
      const points = payload.districtScores.filter((d) => typeof d.lat === 'number' && typeof d.lon === 'number');
      const maxP = Math.max(...points.map((d) => d.pop));
      const bounds = L.latLngBounds(points.map((d) => [d.lat, d.lon] as [number, number]));

      let loadedTiles = 0;
      tileLayer.on('tileload', () => {
        loadedTiles += 1;
        if (statusEl) statusEl.textContent = `tiles:${loadedTiles}`;
        if (loadedTiles === 1 && statusEl) statusEl.textContent = 'tiles:loading';
      });
      tileLayer.on('tileerror', () => {
        if (statusEl) statusEl.textContent = 'tiles:error';
      });
      points.forEach((d) => {
        const col = d.dev >= 55 ? '#22C55E' : d.dev >= 45 ? '#F59E0B' : '#EF4444';
        const r = Math.max(7, Math.sqrt(d.pop / maxP) * 34);
        const marker = L.circleMarker([d.lat, d.lon], {
          radius: r,
          fillColor: col,
          color: 'rgba(255,255,255,.75)',
          weight: 1,
          fillOpacity: 1,
          opacity: 1,
        }).addTo(map!);

        marker.bindTooltip(`${d.n} · ${d.dev}/100`, { direction: 'top', sticky: true });
        marker.bindPopup(
          `<div style="font-weight:800;font-size:13px;margin-bottom:4px">${d.n}</div>` +
            `<div style="font-size:12px;color:#475569;line-height:1.5">Score: ${d.dev}/100<br/>Population: ${d.pop}L<br/>GPs: ${d.gps}<br/>Blocks: ${d.blks}</div>`
        );
      });

      requestAnimationFrame(() => {
        if (disposed || !map) return;
        map.invalidateSize();

        if (bounds.isValid()) {
            // add padding so markers are clearly visible inside card
            map.fitBounds(bounds.pad(0.08), { animate: false, padding: [60, 60] });
        } else {
          map.setView([26.5, 73.5], 6);
        }

        map.invalidateSize();
        if (statusEl) statusEl.textContent = 'map:ready';
      });
    })();

    return () => {
      disposed = true;
      if (statusEl) statusEl.textContent = 'map:unmount';
      map?.remove();
      map = null;
      try { if (statusEl) statusEl.remove(); } catch (e) {}
      statusEl = null;
    };
  }, []);

  return <div id="mapwrap" ref={ref} style={{ height: 440, width: '100%', borderRadius: 12, overflow: 'hidden' }} />;
}
