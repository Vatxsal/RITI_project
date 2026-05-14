"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function scoreColor(v: number): string {
  if (v >= 55) return 'rgba(34,197,94,0.72)';
  if (v >= 45) return 'rgba(245,158,11,0.72)';
  return 'rgba(239,68,68,0.72)';
}

export default function SectorDistributionChart({
  labels,
  data,
}: {
  labels: string[];
  data: number[];
}) {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Score',
        data,
        backgroundColor: data.map(scoreColor),
        borderRadius: 3,
        borderSkipped: false as const,
        barPercentage: 0.78,
        categoryPercentage: 0.94,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    animation: { duration: 500 },
    scales: {
      x: {
        ticks: {
          color: '#475569',
          font: { size: 8 },
          maxRotation: 80,
          minRotation: 80,
        },
        grid: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#475569', font: { size: 9 } },
        grid: { color: 'rgba(255,255,255,.04)' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0C1829',
        borderColor: 'rgba(255,255,255,.1)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
        padding: 10,
        callbacks: {
          label: (ctx: any) => {
            const raw = ctx.parsed.y ?? 0;
            const tag = raw >= 55 ? 'Strong' : raw >= 45 ? 'Moderate' : 'Needs attention';
            return `Score: ${raw}/100 (${tag})`;
          },
        },
      },
    },
  } as const;

  return (
    <div style={{ position: 'relative', height: 240 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
