"use client";

import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function RadarChart({ labels, data }: { labels: string[]; data: number[] }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'State average',
        data,
        backgroundColor: 'rgba(232,92,13,0.12)',
        borderColor: '#E85C0D',
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#E85C0D',
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    scales: {
      r: {
        ticks: { backdropColor: 'transparent', color: 'var(--t2)', stepSize: 20, max: 100 },
        grid: { color: 'rgba(255,255,255,0.04)' },
        angleLines: { color: 'rgba(255,255,255,0.03)' },
        pointLabels: { color: 'var(--t2)', font: { size: 11 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(6,6,12,0.9)' },
    },
  } as const;

  return (
    <div style={{ height: 295 }}>
      <Radar data={chartData} options={options} />
    </div>
  );
}
