'use client';

interface DashboardFrameProps {
  initialView?: string;
}

export default function DashboardFrame({ initialView = 'cmd' }: DashboardFrameProps) {
  return (
    <div>
      <div className="pg-t">Dashboard View: {initialView}</div>
      <div className="pg-s">Rendered via DashboardFrame placeholder component.</div>
    </div>
  );
}
