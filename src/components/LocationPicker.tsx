"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { MAP_TILES } from "@/lib/constants";

/** Click (or drag the pin) to set the exact location. Writes into hidden lat/lng inputs. */
export default function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || mapRef.current) return;
      const map = L.map(el.current, { scrollWheelZoom: false }).setView([lat, lng], 14);
      L.tileLayer(MAP_TILES.url, { attribution: MAP_TILES.attribution, maxZoom: 19 }).addTo(map);
      const icon = L.divIcon({ html: '<div class="hv-pin">📍 Exact location</div>', className: "", iconAnchor: [50, 24] });
      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        cb.current(p.lat, p.lng);
      });
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        cb.current(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
      markerRef.current = marker;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentre when the town changes.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const cur = markerRef.current.getLatLng();
    if (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lng) > 1e-6) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 14);
    }
  }, [lat, lng]);

  return <div ref={el} className="z-0 h-72 w-full overflow-hidden rounded-2xl border border-line" role="application" aria-label="Map: click to set the exact property location" />;
}
