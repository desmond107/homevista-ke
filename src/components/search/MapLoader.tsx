"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-[620px] w-full animate-pulse rounded-[var(--radius-card)] bg-bg-alt" />,
});

export function MapLoader({ pins, height }: { pins: MapPin[]; height?: number }) {
  return <MapView pins={pins} height={height} />;
}
