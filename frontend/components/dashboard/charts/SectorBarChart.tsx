"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function SectorBarChart({ labels, data }: { labels: string[]; data: number[] }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Score',
        data,
        backgroundColor: labels.map((_, i) => 'rgba(59,130,246,0.9)'),
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    scales: {
      x: { max: 100, ticks: { color: 'var(--t2)' }, grid: { color: 'rgba(255,255,255,0.03)' } },
      y: { ticks: { color: 'var(--t2)' } },
    },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(6,6,12,0.9)' } },
  } as const;

  return (
    <div style={{ height: 300 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
