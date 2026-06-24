import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { BarChart3, Clock, AlertCircle, Calendar, UserCheck } from 'lucide-react';
import { PunchLog } from '../types';

interface PunchAnalyticsChartProps {
  punchLogs: PunchLog[];
}

export default function PunchAnalyticsChart({ punchLogs }: PunchAnalyticsChartProps) {
  const [activeBar, setActiveBar] = useState<string | null>(null);

  // 1. Generate the last 7 days (including today)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // 2. Helper to format date label
  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const todayStr = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    // Format like "Jun 24"
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  // 3. Process logs into chart-ready data structure
  const chartData = last7Days.map(dateStr => {
    const dayLogs = punchLogs.filter(log => log.date === dateStr);
    
    const onTimeCount = dayLogs.filter(log => log.status === 'on-time' || log.status === 'present').length;
    const lateCount = dayLogs.filter(log => log.status === 'late').length;
    const halfDayCount = dayLogs.filter(log => log.status === 'half-day').length;

    return {
      date: dateStr,
      displayDate: formatDisplayDate(dateStr),
      'On-Time': onTimeCount,
      'Late': lateCount,
      'Half-Day': halfDayCount,
      total: onTimeCount + lateCount + halfDayCount
    };
  });

  // 4. Calculate last 7 days overall sums for KPIs
  const totalOnTime = chartData.reduce((sum, d) => sum + d['On-Time'], 0);
  const totalLate = chartData.reduce((sum, d) => sum + d['Late'], 0);
  const totalHalfDay = chartData.reduce((sum, d) => sum + d['Half-Day'], 0);
  const totalLogs = totalOnTime + totalLate + totalHalfDay;

  // Custom tooltips matching the dashboard's slate & indigo palette
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl border border-slate-800 shadow-xl font-sans text-xs space-y-2 max-w-[200px]" id="recharts-custom-tooltip">
          <p className="font-extrabold text-white border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            {label}
          </p>
          <div className="space-y-1 font-semibold">
            {payload.map((p: any) => {
              const dotColor = p.name === 'On-Time' ? 'bg-emerald-400' : p.name === 'Late' ? 'bg-amber-400' : 'bg-blue-400';
              return (
                <div key={p.name} className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                    <span className="text-slate-400">{p.name}:</span>
                  </div>
                  <span className="font-mono text-white text-xs">{p.value}</span>
                </div>
              );
            })}
          </div>
          <div className="pt-1.5 border-t border-slate-800/60 flex justify-between text-[10px] text-slate-400 font-bold">
            <span>Total Records:</span>
            <span className="text-indigo-300 font-mono">
              {payload.reduce((acc: number, item: any) => acc + item.value, 0)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6"
      id="biometrics-7day-recharts-card"
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">Biometric punch-ins (Last 7 Days)</h4>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Daily classification breakdown of hardware physical clock logs</p>
        </div>

        {/* Small stats banner of totals over last 7 days */}
        <div className="flex items-center gap-4 flex-wrap bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl" id="chart-7day-totals-strip">
          <div className="text-[10px] text-slate-500 font-bold">
            Last 7 Days Sums:
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600">
              <UserCheck className="h-3 w-3" />
              <span>{totalOnTime} On-Time</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-600">
              <Clock className="h-3 w-3" />
              <span>{totalLate} Late</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-blue-600">
              <AlertCircle className="h-3 w-3" />
              <span>{totalHalfDay} Half-Day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-80 relative" id="recharts-bar-canvas-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              allowDecimals={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: '#f8fafc', radius: 8 }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, fontWeight: 700, fontFamily: 'sans-serif', color: '#475569' }}
            />
            <Bar 
              dataKey="On-Time" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-ontime-${index}`} 
                  fillOpacity={activeBar === null || activeBar === 'On-Time' ? 1 : 0.4} 
                  className="transition-all duration-300"
                />
              ))}
            </Bar>
            <Bar 
              dataKey="Late" 
              fill="#f59e0b" 
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-late-${index}`} 
                  fillOpacity={activeBar === null || activeBar === 'Late' ? 1 : 0.4} 
                  className="transition-all duration-300"
                />
              ))}
            </Bar>
            <Bar 
              dataKey="Half-Day" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-halfday-${index}`} 
                  fillOpacity={activeBar === null || activeBar === 'Half-Day' ? 1 : 0.4} 
                  className="transition-all duration-300"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dynamic Info Strip */}
      <div className="bg-indigo-50/40 border border-indigo-100/60 p-4 rounded-2xl flex items-start gap-3">
        <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg shrink-0">
          <Clock className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Live Punch Synchronizer</h5>
          <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
            This graph updates instantly as hardware logs arrive from registered terminals or third-party brand APIs. Use the <strong className="text-indigo-600">Hardware Biometrics Hub</strong> tab to simulate real-time API integrations or register physical devices.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
