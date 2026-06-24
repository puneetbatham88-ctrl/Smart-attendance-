import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Sparkles, Clock, TrendingUp, AlertCircle, RefreshCw, HelpCircle, ShieldCheck, Zap, Users, Calendar
} from 'lucide-react';
import { User, Shift, PunchLog } from '../types';

interface GeminiWeeklyAnalyticsProps {
  users: User[];
  shifts: Shift[];
  punchLogs: PunchLog[];
}

interface WeeklyInsights {
  summary: string;
  lateArrivalsAnalysis: string;
  occupancyInsights: string;
  recommendations: string[];
}

export default function GeminiWeeklyAnalytics({ users, shifts, punchLogs }: GeminiWeeklyAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<WeeklyInsights | null>(null);

  // 1. Process 7-day Late Arrivals Trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const lateArrivalsData = last7Days.map(dateStr => {
    const dayLogs = punchLogs.filter(log => log.date === dateStr);
    const lateCount = dayLogs.filter(log => log.status === 'late').length;
    const onTimeCount = dayLogs.filter(log => log.status === 'on-time' || log.status === 'present').length;
    const totalCount = dayLogs.length;

    return {
      date: dateStr,
      displayDate: formatDisplayDate(dateStr),
      'Late Arrivals': lateCount,
      'On-Time': onTimeCount,
      'Total Punches': totalCount,
    };
  });

  // 2. Process 24-Hour Peak Office Occupancy Distribution
  const hourlyOccupancyData = Array.from({ length: 24 }, (_, hour) => {
    let count = 0;
    punchLogs.forEach(log => {
      try {
        const inTime = new Date(log.punchInTime);
        if (isNaN(inTime.getTime())) return;
        
        const inHour = inTime.getHours();
        
        let outHour = 17; // standard fallback
        if (log.punchOutTime) {
          const outTime = new Date(log.punchOutTime);
          if (!isNaN(outTime.getTime())) {
            outHour = outTime.getHours();
          }
        } else {
          const todayStr = new Date().toISOString().split('T')[0];
          if (log.date === todayStr) {
            outHour = Math.max(inHour, new Date().getHours());
          } else {
            outHour = inHour + 8; // standard 8-hour shift
          }
        }
        
        // Handle midnight shift wrap-arounds cleanly
        if (outHour < inHour) {
          if (hour >= inHour || hour <= outHour) {
            count++;
          }
        } else {
          if (hour >= inHour && hour <= outHour) {
            count++;
          }
        }
      } catch (e) {
        // ignore date parse errors
      }
    });

    return {
      hourNum: hour,
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      'Occupancy (People)': count,
    };
  });

  // Load insights from localStorage on mount if available
  useEffect(() => {
    const cached = localStorage.getItem('gemini_weekly_analytics_insights');
    if (cached) {
      try {
        setInsights(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem('gemini_weekly_analytics_insights');
      }
    }
  }, []);

  // Fetch from server Gemini endpoint
  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-weekly-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: punchLogs,
          employees: users.filter(u => u.role === 'employee'),
          shifts,
          lateArrivalsTrend: lateArrivalsData,
          hourlyOccupancy: hourlyOccupancyData,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Network error generating analytics');
      }

      const data = await response.json();
      setInsights(data);
      localStorage.setItem('gemini_weekly_analytics_insights', JSON.stringify(data));
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to connect to the weekly insights server. Ensure your Gemini API Key is configured.');
    } finally {
      setLoading(false);
    }
  };

  const CustomLateTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 p-3 rounded-2xl shadow-xl font-sans text-xs space-y-1.5" id="recharts-late-tooltip">
          <p className="font-extrabold text-white pb-1 border-b border-slate-800 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            {label}
          </p>
          <div className="space-y-1 font-semibold">
            <div className="flex justify-between items-center gap-6">
              <span className="text-slate-400">Late Arrivals:</span>
              <span className="font-mono text-amber-400 font-extrabold text-sm">{payload[0].value}</span>
            </div>
            {payload[1] && (
              <div className="flex justify-between items-center gap-6">
                <span className="text-slate-400">On-Time:</span>
                <span className="font-mono text-emerald-400 font-extrabold">{payload[1].value}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomOccupancyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 p-3 rounded-2xl shadow-xl font-sans text-xs space-y-1.5" id="recharts-occ-tooltip">
          <p className="font-extrabold text-white pb-1 border-b border-slate-800 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            Time Slot: {label}
          </p>
          <div className="flex justify-between items-center gap-6 font-semibold">
            <span className="text-slate-400">Active Staff:</span>
            <span className="font-mono text-sky-400 font-extrabold text-sm">{payload[0].value} active</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8" id="gemini-weekly-analytics-container">
      
      {/* 1. Header and Trigger Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-3xl p-6 border border-indigo-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-[-40px] top-[-40px] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute left-[10%] bottom-[-50px] w-48 h-48 bg-sky-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-extrabold tracking-widest uppercase">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              <span>Gemini Analytics Engine</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">AI Weekly Attendance Summary & Insights</h3>
            <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
              Synthesize active biometric logs to extract lateness trends, analyze office density profiles, and generate actionable scheduling strategies.
            </p>
          </div>

          <button
            onClick={generateInsights}
            disabled={loading}
            className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-sky-500 hover:opacity-90 disabled:opacity-50 text-white rounded-2xl border-0 font-bold shadow-lg shadow-indigo-500/20 text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer outline-none shrink-0"
            id="trigger-gemini-weekly-btn"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{loading ? 'Analyzing...' : 'Generate AI Insights'}</span>
          </button>
        </div>
      </div>

      {/* 2. Visual Trends - Recharts Pair */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="analytics-recharts-grid">
        
        {/* Late Arrival Trends Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="space-y-0.5">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span>Weekly Late Arrival Trend</span>
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold">Evolution of late punches over the last 7 calendar days</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg">Real-time Data</span>
          </div>

          <div className="w-full h-64 font-sans text-xs relative" id="late-arrivals-line-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lateArrivalsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: '#f1f5f9' }}
                  tickLine={false}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: '#f1f5f9' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomLateTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={24}
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                />
                <Line 
                  name="Late Arrivals" 
                  type="monotone" 
                  dataKey="Late Arrivals" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  activeDot={{ r: 6 }} 
                  dot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line 
                  name="On-Time" 
                  type="monotone" 
                  dataKey="On-Time" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={{ r: 3, stroke: '#fff', strokeWidth: 1.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Office Occupancy Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="space-y-0.5">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-500" />
                <span>Office Occupancy Profiles</span>
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold">Active staff density distribution across a 24-hour cycle</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-lg">Biometric Footprint</span>
          </div>

          <div className="w-full h-64 font-sans text-xs relative" id="occupancy-area-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyOccupancyData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="hourLabel" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: '#f1f5f9' }}
                  tickLine={false}
                  interval={3} // Show every 3rd hour for neat layout
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: '#f1f5f9' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomOccupancyTooltip />} />
                <ReferenceLine x="09:00" stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: 'Morning Standard', fill: '#94a3b8', fontSize: 9, position: 'insideTopLeft' }} />
                <ReferenceLine x="17:00" stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: 'Evening Start', fill: '#94a3b8', fontSize: 9, position: 'insideTopLeft' }} />
                <Area 
                  name="Occupancy" 
                  type="monotone" 
                  dataKey="Occupancy (People)" 
                  stroke="#0ea5e9" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorOccupancy)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Dynamic AI Insights Display Panel */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center space-y-4"
            id="gemini-insights-loading"
          >
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin"></div>
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-slate-700">Synthesizing Historical Attendance Footprints...</h5>
              <p className="text-[11px] text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                Gemini is correlating late punches, shift overlaps, and peak occupancy curves to compile your strategic summary.
              </p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-start gap-3.5 text-rose-600"
            id="gemini-insights-error"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold uppercase tracking-wider">Analysis Connection Failure</h5>
              <p className="text-xs font-semibold leading-relaxed">{error}</p>
              <button 
                onClick={generateInsights}
                className="mt-2.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-[10px] border-0 cursor-pointer outline-none transition-all uppercase tracking-wide"
              >
                Retry Request
              </button>
            </div>
          </motion.div>
        )}

        {insights && !loading && !error && (
          <motion.div
            key="insights-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            id="gemini-insights-result-grid"
          >
            
            {/* Left: Performance Narrative & Summary */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Executive Summary Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Executive Roster Summary</h4>
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed italic border-l-2 border-indigo-500 pl-4">
                  "{insights.summary}"
                </p>
              </div>

              {/* Late Arrivals Deep Dive */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  Lateness Analysis & Stafford Adjustments
                </h4>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">
                  {insights.lateArrivalsAnalysis}
                </p>
              </div>

              {/* Occupancy Analytics */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
                  Occupancy & Office Traffic Analytics
                </h4>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">
                  {insights.occupancyInsights}
                </p>
              </div>

            </div>

            {/* Right: Smart Recommendations Roster Fixes */}
            <div className="space-y-6">
              
              <div className="bg-gradient-to-b from-indigo-50/60 to-white p-6 rounded-3xl border border-indigo-100/50 shadow-xs space-y-5 h-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Zap className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">Roster Optimizations</h4>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">Actionable scheduling tips</p>
                </div>

                <div className="space-y-4" id="insights-recommendations-list">
                  {insights.recommendations.map((rec, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3.5 bg-white border border-slate-100 rounded-2xl flex gap-3 shadow-xs hover:border-indigo-100/80 hover:shadow-xs transition-all"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center font-mono font-bold text-xs text-indigo-600 shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed pt-0.5">
                        {rec}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100/80 flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Verified by Gemini cognitive models</span>
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {!insights && !loading && !error && (
          <motion.div
            key="empty-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center space-y-4"
            id="gemini-insights-placeholder"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Sparkles className="h-6 w-6 text-indigo-500 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-slate-700">No Weekly Analysis Generated Yet</h5>
              <p className="text-[11px] text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                Click the "Generate AI Insights" button above to run real-time cognitive models over your biometric database.
              </p>
            </div>
            <button
              onClick={generateInsights}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold border-0 text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Analyze Now</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
