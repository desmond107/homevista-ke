"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

export type MapPin = { id: string; slug: string; title: string; price: string; lat: number; lng: number; image?: string; area: string };

/**
 * Clustered map of search results. Pins use each listing's APPROXIMATE position
 * (the exact location is only revealed after unlocking).
 */
export default function MapView({ pins, height = 620 }: { pins: MapPin[]; height?: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: typeof L }).L = L; // markercluster attaches to the global
      await import("leaflet.markercluster");
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView([-1.2864, 36.8172], 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 48,
        iconCreateFunction: (c) => {
          const n = c.getChildCount();
          const size = n < 10 ? 38 : n < 50 ? 46 : 54;
          return L.divIcon({ html: `<div class="hv-cluster" style="width:${size}px;height:${size}px">${n}</div>`, className: "", iconSize: [size, size] });
        },
      });
      const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
      for (const p of pins) {
        const icon = L.divIcon({ html: `<div class="hv-pin">${esc(p.price)}</div>`, className: "", iconSize: undefined, iconAnchor: [30, 12] });
        const m = L.marker([p.lat, p.lng], { icon, title: p.title });
        m.bindPopup(
          `<a href="/properties/${encodeURIComponent(p.slug)}" style="display:block;width:220px;text-decoration:none;color:inherit">
            ${p.image ? `<img src="${esc(p.image)}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px">` : ""}
            <strong style="display:block;font-size:13px;line-height:1.3">${esc(p.title)}</strong>
            <span style="display:block;font-size:12px;color:#7a7f8a;margin-top:2px">${esc(p.area)}</span>
            <span style="display:block;font-weight:600;margin-top:4px">${esc(p.price)}</span>
          </a>`,
        );
        cluster.addLayer(m);
      }
      map.addLayer(cluster);
      if (pins.length) map.fitBounds(cluster.getBounds(), { padding: [40, 40], maxZoom: 13 });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins]);

  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-[var(--radius-card)] border border-line" role="region" aria-label="Map of results (approximate locations)" />;
}
