import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateScores } from '../utils/scoring';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, Award, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export const MonthOverMonthDashboard: React.FC = () => {
    const { vendors, audits, config } = useApp();
    const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
    const [compareVendorId, setCompareVendorId] = useState<string>('none');

    // Get all periods sorted
    const allPeriods = useMemo(() => {
        const periods = new Set<string>();
        Object.keys(audits).forEach(key => {
            // The key format is strictly `${vendorId}-${period}`
            // Period is always YYYY-MM (7 chars)
            const p = key.slice(-7);
            if (p.match(/^\d{4}-\d{2}$/)) {
                periods.add(p);
            }
        });
        return Array.from(periods).sort();
    }, [audits]);

    // Prepare data for chart
    const chartData = useMemo(() => {
        return allPeriods.map(period => {
            const dataPoint: any = { period };

            // If compareVendorId is 'all', add all vendors
            if (compareVendorId === 'all') {
                vendors.forEach(vendor => {
                    const key = `${vendor.id}-${period}`;
                    const vendorAudits = audits[key] || [];
                    if (vendorAudits.length > 0) {
                        const results = calculateScores(vendorAudits, config.categories, config.kpis, vendor.id, period);
                        dataPoint[vendor.id] = Math.round(results.score);
                    } else {
                        dataPoint[vendor.id] = null;
                    }
                });
            } else {
                // Main Vendor Data
                if (selectedVendorId) {
                    const key = `${selectedVendorId}-${period}`;
                    const vendorAudits = audits[key] || [];
                    if (vendorAudits.length > 0) {
                        const results = calculateScores(vendorAudits, config.categories, config.kpis, selectedVendorId, period);
                        dataPoint[selectedVendorId] = Math.round(results.score);
                    } else {
                        dataPoint[selectedVendorId] = null;
                    }
                }

                // Comparison Vendor Data
                if (compareVendorId !== 'none') {
                    const key = `${compareVendorId}-${period}`;
                    const vendorAudits = audits[key] || [];
                    if (vendorAudits.length > 0) {
                        const results = calculateScores(vendorAudits, config.categories, config.kpis, compareVendorId, period);
                        dataPoint[compareVendorId] = Math.round(results.score);
                    } else {
                        dataPoint[compareVendorId] = null;
                    }
                }
            }

            return dataPoint;
        });
    }, [allPeriods, selectedVendorId, compareVendorId, audits, config, vendors]);

    // Calculate Stats for Main Vendor
    const stats = useMemo(() => {
        if (!selectedVendorId) return null;

        const scores = chartData
            .map(d => d[selectedVendorId])
            .filter(s => s !== null && s !== undefined) as number[];

        if (scores.length === 0) return null;

        const current = scores[scores.length - 1];
        const previous = scores.length > 1 ? scores[scores.length - 2] : current;
        const change = current - previous;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Find best/worst months
        const maxIndex = chartData.findIndex(d => d[selectedVendorId] === max);
        const minIndex = chartData.findIndex(d => d[selectedVendorId] === min);

        return {
            current,
            change,
            max,
            min,
            avg,
            bestMonth: chartData[maxIndex]?.period,
            worstMonth: chartData[minIndex]?.period,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
        };
    }, [chartData, selectedVendorId]);

    const selectedVendor = vendors.find(v => v.id === selectedVendorId);
    const compareVendor = vendors.find(v => v.id === compareVendorId);

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black mb-2 text-keeta-primary">Performance Trends</h1>
                        <p className="text-slate-400">Month-over-month vendor performance analysis</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                        <div className="px-4">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Analyze Vendor</label>
                            <select
                                value={selectedVendorId}
                                onChange={(e) => setSelectedVendorId(e.target.value)}
                                className="bg-transparent font-bold text-white text-sm focus:outline-none cursor-pointer [&>option]:text-slate-900"
                            >
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-px h-8 bg-white/10"></div>

                        <div className="px-4">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Compare With</label>
                            <select
                                value={compareVendorId}
                                onChange={(e) => setCompareVendorId(e.target.value)}
                                className="bg-transparent font-bold text-keeta-primary text-sm focus:outline-none cursor-pointer [&>option]:text-slate-900"
                            >
                                <option value="none">None</option>
                                <option value="all">All Vendors</option>
                                {vendors.filter(v => v.id !== selectedVendorId).map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                {/* Dynamic gradients using vendor colors */}
                                {selectedVendorId && (() => {
                                    const vendor = vendors.find(v => v.id === selectedVendorId);
                                    const color = vendor?.color || '#FFD700'; // Default to yellow
                                    return (
                                        <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                                        </linearGradient>
                                    );
                                })()}
                                {compareVendorId !== 'none' && compareVendorId !== 'all' && (() => {
                                    const vendor = vendors.find(v => v.id === compareVendorId);
                                    const color = vendor?.color || '#FFD700'; // Default to yellow
                                    return (
                                        <linearGradient id="colorCompare" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                                        </linearGradient>
                                    );
                                })()}
                                {/* Dynamic gradients for all vendors */}
                                {compareVendorId === 'all' && vendors.map((v) => {
                                    const color = v.color || '#FFD700'; // Default to yellow
                                    return (
                                        <linearGradient key={v.id} id={`color${v.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="period"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                            {compareVendorId === 'all' ? (
                                // Render all vendors with their custom colors
                                vendors.map((v) => {
                                    const color = v.color || '#FFD700'; // Default to yellow
                                    return (
                                        <Area
                                            key={v.id}
                                            type="monotone"
                                            dataKey={v.id}
                                            name={v.name}
                                            stroke={color}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill={`url(#color${v.id})`}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    );
                                })
                            ) : (
                                // Render single or comparison mode with vendor colors
                                <>
                                    <Area
                                        type="monotone"
                                        dataKey={selectedVendorId}
                                        name={selectedVendor?.name}
                                        stroke={selectedVendor?.color || '#FFD700'}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorMain)"
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />

                                    {compareVendorId !== 'none' && (
                                        <Area
                                            type="monotone"
                                            dataKey={compareVendorId}
                                            name={compareVendor?.name}
                                            stroke={compareVendor?.color || '#FFD700'}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorCompare)"
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    )}
                                </>
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Current Score & Trend */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                stats.trend === 'up' ? "bg-green-100 text-green-600" :
                                    stats.trend === 'down' ? "bg-red-100 text-red-600" :
                                        "bg-slate-100 text-slate-600"
                            )}>
                                {stats.trend === 'up' ? <TrendingUp size={20} /> :
                                    stats.trend === 'down' ? <TrendingDown size={20} /> :
                                        <Minus size={20} />}
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Trend</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{Math.round(stats.current)}%</span>
                            {stats.change !== 0 && (
                                <span className={clsx(
                                    "text-sm font-bold",
                                    stats.change > 0 ? "text-green-600" : "text-red-600"
                                )}>
                                    {stats.change > 0 ? '+' : ''}{Math.round(stats.change)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">vs previous month</p>
                    </div>

                    {/* Best Month */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                <Award size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Best Month</span>
                        </div>
                        <div className="text-4xl font-black text-slate-900">{Math.round(stats.max)}%</div>
                        <p className="text-xs text-slate-400 mt-2 font-bold">{stats.bestMonth}</p>
                    </div>

                    {/* Lowest Month */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <AlertCircle size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lowest Month</span>
                        </div>
                        <div className="text-4xl font-black text-slate-900">{Math.round(stats.min)}%</div>
                        <p className="text-xs text-slate-400 mt-2 font-bold">{stats.worstMonth}</p>
                    </div>

                    {/* Average */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Calendar size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average</span>
                        </div>
                        <div className="text-4xl font-black text-slate-900">{Math.round(stats.avg)}%</div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">All time average</p>
                    </div>
                </div>
            )}
        </div>
    );
};
