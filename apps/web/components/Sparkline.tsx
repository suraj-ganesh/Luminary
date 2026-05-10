"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: { score: number }[];
}

export default function Sparkline({ data }: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div className="h-full w-full flex items-center justify-center opacity-20">
        <div className="h-[2px] w-full bg-black" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis domain={[0, 100]} hide />
        <Line 
          type="monotone" 
          dataKey="score" 
          stroke="#3b83f5" 
          strokeWidth={2} 
          dot={false} 
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
