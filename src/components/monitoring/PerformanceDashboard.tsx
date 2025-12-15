/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and Web Vitals
 */

'use client';

import React, { useState, useEffect } from 'react';
import { getPerformanceSummary } from '@/lib/utils/performance';
import { usePerformanceSummary } from '@/hooks/usePerformanceMonitoring';

interface PerformanceData {
	webVitals: Record<string, { value: number; rating: string }>;
	customMetrics: Record<string, { count: number; average: number; latest: number }>;
}

/**
 * Performance metric card component
 */
function MetricCard({ 
	title, 
	value, 
	unit, 
	rating, 
	description 
}: {
	title: string;
	value: number;
	unit: string;
	rating?: string;
	description: string;
}) {
	const getRatingColor = (rating?: string) => {
		switch (rating) {
			case 'good': return 'text-green-600 bg-green-50 border-green-200';
			case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'poor': return 'text-red-600 bg-red-50 border-red-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	};

	return (
		<div className={`p-4 rounded-lg border ${getRatingColor(rating)}`}>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium">{title}</h3>
				{rating && (
					<span className="text-xs px-2 py-1 rounded-full bg-white/50">
						{rating.replace('-', ' ')}
					</span>
				)}
			</div>
			<div className="mt-2">
				<div className="text-2xl font-bold">
					{value.toFixed(value < 10 ? 2 : 0)}{unit}
				</div>
				<p className="text-xs mt-1 opacity-75">{description}</p>
			</div>
		</div>
	);
}

/**
 * Web Vitals section component
 */
function WebVitalsSection({ webVitals }: { webVitals: Record<string, { value: number; rating: string }> }) {
	const vitalsConfig = {
		CLS: { unit: '', description: 'Cumulative Layout Shift' },
		FID: { unit: 'ms', description: 'First Input Delay' },
		FCP: { unit: 'ms', description: 'First Contentful Paint' },
		LCP: { unit: 'ms', description: 'Largest Contentful Paint' },
		TTFB: { unit: 'ms', description: 'Time to First Byte' },
		INP: { unit: 'ms', description: 'Interaction to Next Paint' },
	};

	return (
		<div>
			<h2 className="text-lg font-semibold mb-4">Web Vitals</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Object.entries(webVitals).map(([name, data]) => {
					const config = vitalsConfig[name as keyof typeof vitalsConfig];
					if (!config) return null;

					return (
						<MetricCard
							key={name}
							title={name}
							value={data.value}
							unit={config.unit}
							rating={data.rating}
							description={config.description}
						/>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Custom metrics section component
 */
function CustomMetricsSection({ 
	customMetrics 
}: { 
	customMetrics: Record<string, { count: number; average: number; latest: number }> 
}) {
	const formatMetricName = (name: string) => {
		return name
			.split('_')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const getMetricUnit = (name: string) => {
		if (name.includes('time') || name.includes('duration') || name.includes('delay')) {
			return 'ms';
		}
		if (name.includes('size') || name.includes('bytes')) {
			return 'B';
		}
		if (name.includes('count') || name.includes('interactions')) {
			return '';
		}
		return 'ms'; // default
	};

	return (
		<div>
			<h2 className="text-lg font-semibold mb-4">Custom Metrics</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Object.entries(customMetrics).map(([name, data]) => (
					<MetricCard
						key={name}
						title={formatMetricName(name)}
						value={data.average}
						unit={getMetricUnit(name)}
						description={`${data.count} samples, latest: ${data.latest.toFixed(0)}${getMetricUnit(name)}`}
					/>
				))}
			</div>
		</div>
	);
}

/**
 * Performance summary component
 */
function PerformanceSummary({ data }: { data: PerformanceData }) {
	const webVitalsCount = Object.keys(data.webVitals).length;
	const customMetricsCount = Object.keys(data.customMetrics).length;
	
	const poorWebVitals = Object.values(data.webVitals).filter(v => v.rating === 'poor').length;
	const goodWebVitals = Object.values(data.webVitals).filter(v => v.rating === 'good').length;

	const overallScore = webVitalsCount > 0 ? 
		Math.round((goodWebVitals / webVitalsCount) * 100) : 0;

	return (
		<div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
			<h2 className="text-lg font-semibold mb-4">Performance Summary</h2>
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="text-center">
					<div className="text-3xl font-bold text-blue-600">{overallScore}%</div>
					<div className="text-sm text-gray-600">Overall Score</div>
				</div>
				<div className="text-center">
					<div className="text-3xl font-bold text-green-600">{goodWebVitals}</div>
					<div className="text-sm text-gray-600">Good Web Vitals</div>
				</div>
				<div className="text-center">
					<div className="text-3xl font-bold text-red-600">{poorWebVitals}</div>
					<div className="text-sm text-gray-600">Poor Web Vitals</div>
				</div>
				<div className="text-center">
					<div className="text-3xl font-bold text-purple-600">{customMetricsCount}</div>
					<div className="text-sm text-gray-600">Custom Metrics</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Main Performance Dashboard component
 */
export default function PerformanceDashboard() {
	const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [autoRefresh, setAutoRefresh] = useState(true);
	const { getPerformanceData } = usePerformanceSummary();

	const refreshData = () => {
		const data = getPerformanceData();
		if (data) {
			setPerformanceData(data);
		}
		setIsLoading(false);
	};

	useEffect(() => {
		refreshData();
	}, []);

	useEffect(() => {
		if (!autoRefresh) return;

		const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds
		return () => clearInterval(interval);
	}, [autoRefresh]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-gray-600">Loading performance data...</div>
			</div>
		);
	}

	if (!performanceData) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-gray-600">No performance data available</div>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
				<div className="flex items-center space-x-4">
					<label className="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={autoRefresh}
							onChange={(e) => setAutoRefresh(e.target.checked)}
							className="rounded border-gray-300"
						/>
						<span className="text-sm text-gray-600">Auto-refresh</span>
					</label>
					<button
						onClick={refreshData}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Refresh
					</button>
				</div>
			</div>

			<PerformanceSummary data={performanceData} />

			{Object.keys(performanceData.webVitals).length > 0 && (
				<WebVitalsSection webVitals={performanceData.webVitals} />
			)}

			{Object.keys(performanceData.customMetrics).length > 0 && (
				<CustomMetricsSection customMetrics={performanceData.customMetrics} />
			)}

			{Object.keys(performanceData.webVitals).length === 0 && 
			 Object.keys(performanceData.customMetrics).length === 0 && (
				<div className="text-center py-12">
					<div className="text-gray-500">
						No performance metrics collected yet. 
						<br />
						Interact with the application to start collecting data.
					</div>
				</div>
			)}
		</div>
	);
}