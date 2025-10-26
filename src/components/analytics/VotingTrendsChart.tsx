"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface VotingTrendData {
  date: string;
  votes: number;
  voters: number;
  participation: number;
}

interface VotingTrendsChartProps {
  data: VotingTrendData[];
}

export function VotingTrendsChart({ data }: VotingTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No voting data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: "currentColor" }}
        />
        <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Legend />
        <Bar dataKey="votes" fill="#3b82f6" name="Total Votes" />
        <Bar dataKey="voters" fill="#10b981" name="Unique Voters" />
      </BarChart>
    </ResponsiveContainer>
  );
}

