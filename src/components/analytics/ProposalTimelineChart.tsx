"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface TimelineDataPoint {
  date: string;
  proposals: number;
  active: number;
  executed: number;
}

interface ProposalTimelineChartProps {
  data: TimelineDataPoint[];
}

export function ProposalTimelineChart({ data }: ProposalTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No timeline data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
        <Line
          type="monotone"
          dataKey="proposals"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Total Proposals"
          dot={{ fill: "#3b82f6" }}
        />
        <Line
          type="monotone"
          dataKey="active"
          stroke="#10b981"
          strokeWidth={2}
          name="Active"
          dot={{ fill: "#10b981" }}
        />
        <Line
          type="monotone"
          dataKey="executed"
          stroke="#8b5cf6"
          strokeWidth={2}
          name="Executed"
          dot={{ fill: "#8b5cf6" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

