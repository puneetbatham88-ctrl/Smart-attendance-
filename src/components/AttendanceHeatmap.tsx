import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Sparkles, Calendar, Clock, RotateCcw, HelpCircle, Flame, Users, CalendarDays } from 'lucide-react';
import { PunchLog } from '../types';

interface AttendanceHeatmapProps {
  punchLogs: PunchLog[];
}

export default function AttendanceHeatmap({ punchLogs }: AttendanceHeatmapProps) {
  const [viewType, setViewType] = useState<'hourly' | 'calendar'>('hourly');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 320 });
  const [hoveredCell, setHoveredCell] = useState<{
    label: string;
    count: number;
    extra?: string;
    x: number;
    y: number;
  } | null>(null);

  // Monitor container width to support fluid responsive layout
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // set dimensions with some minimum and margins
        const targetWidth = Math.max(width, 400);
        setDimensions({
          width: targetWidth,
          height: viewType === 'hourly' ? 340 : 180
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [viewType]);

  // Generate data and render chart using D3.js
  useEffect(() => {
    if (!svgRef.current || !punchLogs) return;

    // Clear svg content first
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 40, right: 30, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const chartGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    if (viewType === 'hourly') {
      // HOURLY HEATMAP: 7 days of the week vs 24 hours of local time
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const hours = Array.from({ length: 24 }, (_, i) => i);

      // Initialize dataset
      const matrix: { day: string; dayIndex: number; hour: number; count: number }[] = [];
      days.forEach((day, dayIndex) => {
        hours.forEach((hour) => {
          matrix.push({ day, dayIndex, hour, count: 0 });
        });
      });

      // Populate matrices
      punchLogs.forEach((log) => {
        const date = new Date(log.punchInTime);
        // Translate JS Sunday (0) to Sunday as 6, Monday as 0
        const dayIdx = (date.getDay() + 6) % 7;
        const hour = date.getHours();
        const cell = matrix.find((c) => c.dayIndex === dayIdx && c.hour === hour);
        if (cell) {
          cell.count += 1;
        }
      });

      // D3 Scales
      const xScale = d3.scaleBand<number>()
        .domain(hours)
        .range([0, chartWidth])
        .padding(0.06);

      const yScale = d3.scaleBand<string>()
        .domain(days)
        .range([0, chartHeight])
        .padding(0.06);

      const maxCount = d3.max(matrix, (d) => d.count) || 1;

      // Premium tailwind-style slate/sky color gradient
      const colorScale = d3.scaleLinear<string>()
        .domain([0, 1, maxCount * 0.4, maxCount])
        .range(['#f8fafc', '#bae6fd', '#38bdf8', '#0284c7']);

      // Draw horizontal background grids or lines
      chartGroup.selectAll('.grid-line')
        .data(days)
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('y1', (d) => (yScale(d) || 0) + yScale.bandwidth() / 2)
        .attr('x2', chartWidth)
        .attr('y2', (d) => (yScale(d) || 0) + yScale.bandwidth() / 2)
        .attr('stroke', '#f1f5f9')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      // Render cells
      chartGroup.selectAll('.cell')
        .data(matrix)
        .enter()
        .append('rect')
        .attr('class', 'cell cursor-pointer')
        .attr('x', (d) => xScale(d.hour) || 0)
        .attr('y', (d) => yScale(d.day) || 0)
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('rx', 4)
        .attr('fill', (d) => colorScale(d.count))
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 0.5)
        .style('transition', 'all 0.15s ease')
        .on('mouseover', function (event, d) {
          d3.select(this)
            .attr('stroke', '#0284c7')
            .attr('stroke-width', 1.5)
            .attr('filter', 'drop-shadow(0px 2px 4px rgba(2, 132, 199, 0.25))');

          // Tooltip position calculation relative to root offset
          const [mx, my] = d3.pointer(event, containerRef.current);
          const amPm = d3.timeFormat('%I %p')(new Date(2026, 0, 1, d.hour));
          setHoveredCell({
            label: `${d.day} at ${amPm}`,
            count: d.count,
            extra: d.count === 1 ? '1 punch-in recorded' : `${d.count} punch-ins recorded`,
            x: mx,
            y: my - 10
          });
        })
        .on('mousemove', function (event) {
          const [mx, my] = d3.pointer(event, containerRef.current);
          setHoveredCell((prev) => prev ? { ...prev, x: mx, y: my - 10 } : null);
        })
        .on('mouseout', function () {
          d3.select(this)
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 0.5)
            .attr('filter', null);
          setHoveredCell(null);
        });

      // X-Axis (Hours)
      chartGroup.append('g')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat((h) => {
          if (h === 0) return '12 AM';
          if (h === 12) return '12 PM';
          if (h % 3 === 0) {
            return h > 12 ? `${h - 12} PM` : `${h} AM`;
          }
          return '';
        }))
        .selectAll('text')
        .attr('class', 'fill-slate-500 font-sans font-semibold text-[10px]')
        .attr('dy', '1em');

      // Y-Axis (Days of week)
      chartGroup.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('class', 'fill-slate-600 font-sans font-bold text-[10px]')
        .attr('dx', '-0.5em');

      // Hide default axis lines and tick marks to maintain minimalist visual style
      chartGroup.selectAll('.domain').remove();
      chartGroup.selectAll('.tick line').attr('stroke', '#e2e8f0');

    } else {
      // CALENDAR DENSITY: Github-style calendar grid tracking the last 18 weeks
      // Calculate today and target weeks back
      const today = new Date();
      const numWeeks = Math.max(14, Math.floor(chartWidth / 22)); // dynamically scale weeks based on container screen
      const totalDaysToShow = numWeeks * 7;

      // Start date: alignment to Monday of standard calendar weeks
      const startDate = new Date();
      startDate.setDate(today.getDate() - totalDaysToShow);
      // Rollback to previous Monday
      const dayOfWeekIdx = startDate.getDay();
      const diffToMonday = dayOfWeekIdx === 0 ? 6 : dayOfWeekIdx - 1;
      startDate.setDate(startDate.getDate() - diffToMonday);

      // Generate base matrix
      const dateList: { dateString: string; dateObj: Date; count: number; weekIndex: number; dayIndex: number }[] = [];
      const tempDate = new Date(startDate);

      for (let i = 0; i < totalDaysToShow; i++) {
        const dateString = tempDate.toISOString().split('T')[0];
        const weekIndex = Math.floor(i / 7);
        const dayIndex = (tempDate.getDay() + 6) % 7; // Mon=0, Sun=6

        dateList.push({
          dateString,
          dateObj: new Date(tempDate),
          count: 0,
          weekIndex,
          dayIndex
        });

        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Populate counts
      punchLogs.forEach((log) => {
        const matchingCell = dateList.find((cell) => cell.dateString === log.date);
        if (matchingCell) {
          matchingCell.count += 1;
        }
      });

      const maxCount = d3.max(dateList, (d) => d.count) || 1;

      // Beautiful Emerald scale for standard calendar metrics
      const colorScale = d3.scaleLinear<string>()
        .domain([0, 1, maxCount * 0.4, maxCount])
        .range(['#fafafa', '#a7f3d0', '#34d399', '#059669']);

      // Setup spacing configs
      const cellGap = 3;
      const totalYPadding = cellGap * 6;
      const cellHeight = (chartHeight - totalYPadding) / 7;
      const cellWidth = cellHeight; // square cells

      // Draw grid manually for precise responsiveness alignment
      chartGroup.selectAll('.calendar-cell')
        .data(dateList)
        .enter()
        .append('rect')
        .attr('class', 'calendar-cell cursor-pointer')
        .attr('x', (d) => d.weekIndex * (cellWidth + cellGap))
        .attr('y', (d) => d.dayIndex * (cellHeight + cellGap))
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('rx', 2)
        .attr('fill', (d) => colorScale(d.count))
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 0.5)
        .on('mouseover', function (event, d) {
          d3.select(this)
            .attr('stroke', '#059669')
            .attr('stroke-width', 1.2);

          const [mx, my] = d3.pointer(event, containerRef.current);
          const readableDate = d.dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          setHoveredCell({
            label: readableDate,
            count: d.count,
            extra: d.count === 1 ? '1 punch-in logged' : `${d.count} punch-ins logged`,
            x: mx,
            y: my - 10
          });
        })
        .on('mousemove', function (event) {
          const [mx, my] = d3.pointer(event, containerRef.current);
          setHoveredCell((prev) => prev ? { ...prev, x: mx, y: my - 10 } : null);
        })
        .on('mouseout', function () {
          d3.select(this)
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 0.5);
          setHoveredCell(null);
        });

      // Label column on Y Axis (Mon, Wed, Fri block representation)
      const labelDays = [
        { name: 'Mon', index: 0 },
        { name: 'Wed', index: 2 },
        { name: 'Fri', index: 4 },
        { name: 'Sun', index: 6 }
      ];

      chartGroup.selectAll('.day-label')
        .data(labelDays)
        .enter()
        .append('text')
        .attr('class', 'day-label fill-slate-500 font-sans font-semibold text-[9px]')
        .attr('x', -10)
        .attr('y', (d) => d.index * (cellHeight + cellGap) + cellHeight / 2)
        .attr('dy', '0.3em')
        .attr('text-anchor', 'end')
        .text((d) => d.name);

      // Label rows on X Axis (Month names placed roughly on respective weeks index)
      const parsedMonthLabels: { text: string; weekIdx: number }[] = [];
      let lastMonthName = '';

      dateList.forEach((d) => {
        const monthName = d.dateObj.toLocaleDateString([], { month: 'short' });
        if (monthName !== lastMonthName && d.dayIndex === 0) {
          parsedMonthLabels.push({ text: monthName, weekIdx: d.weekIndex });
          lastMonthName = monthName;
        }
      });

      chartGroup.selectAll('.month-label')
        .data(parsedMonthLabels)
        .enter()
        .append('text')
        .attr('class', 'month-label fill-slate-500 font-sans font-bold text-[9px]')
        .attr('x', (d) => d.weekIdx * (cellWidth + cellGap))
        .attr('y', -10)
        .text((d) => d.text);
    }
  }, [punchLogs, viewType, dimensions]);

  // Compute Peak Analytics Highlights
  const getHeatmapInsights = () => {
    if (punchLogs.length === 0) {
      return {
        peakDayHour: 'No logs recorded yet',
        totalRecords: 0,
        activeDaysCount: 0,
        mostProductiveDayName: 'None'
      };
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hourStats = Array.from({ length: 24 }, () => 0);
    const dayStats = Array.from({ length: 7 }, () => 0);
    const matrix: { [key: string]: number } = {};

    punchLogs.forEach((log) => {
      const date = new Date(log.punchInTime);
      const dayIdx = (date.getDay() + 6) % 7;
      const hour = date.getHours();
      
      const key = `${dayIdx}-${hour}`;
      matrix[key] = (matrix[key] || 0) + 1;
      
      hourStats[hour] += 1;
      dayStats[dayIdx] += 1;
    });

    // Find absolute highest cell key
    let peakKey = '';
    let peakValue = -1;
    Object.entries(matrix).forEach(([k, val]) => {
      if (val > peakValue) {
        peakValue = val;
        peakKey = k;
      }
    });

    let peakDayHourStr = 'N/A';
    if (peakKey) {
      const [dIdxStr, hStr] = peakKey.split('-');
      const dIdx = parseInt(dIdxStr, 10);
      const h = parseInt(hStr, 10);
      const amPm = h >= 12 ? `${h === 12 ? 12 : h - 12} PM` : `${h === 0 ? 12 : h} AM`;
      peakDayHourStr = `${days[dIdx]} at ${amPm} (${peakValue} active shifts logged)`;
    }

    // Find highest overall day of week
    const topDayIdx = dayStats.indexOf(Math.max(...dayStats));
    const peakWeekDayName = days[topDayIdx] || 'None';

    // Count unique calendar dates checked in
    const uniqueDates = new Set(punchLogs.map((l) => l.date));

    return {
      peakDayHour: peakDayHourStr,
      totalRecords: punchLogs.length,
      activeDaysCount: uniqueDates.size,
      mostProductiveDayName: `${peakWeekDayName} (${dayStats[topDayIdx]} punches)`
    };
  };

  const insights = getHeatmapInsights();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-white" id="attendance-heatmap-container">
      
      {/* Visual Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-400">
            <Flame className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#38bdf8]">Core Engagement Analytics</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Team Punch-in Density Map
            <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700">
              Live updates
            </span>
          </h3>
          <p className="text-xs text-slate-400 max-w-xl font-medium">
            Identify peak load operational thresholds, review lateness groupings, and audit total weekly attendance counts visually.
          </p>
        </div>

        {/* Tab Controls toggler */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 w-max shrink-0">
          <button
            onClick={() => setViewType('hourly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer
              ${viewType === 'hourly' 
                ? 'bg-[#0284c7] text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Hourly Matrix</span>
          </button>
          <button
            onClick={() => setViewType('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer
              ${viewType === 'calendar' 
                ? 'bg-[#059669] text-white shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendar Grid</span>
          </button>
        </div>
      </div>

      {/* SVG Container block with responsive handling */}
      <div 
        ref={containerRef} 
        className="w-full bg-slate-950/40 rounded-2xl p-4 border border-slate-800/70 relative select-none" 
        style={{ minHeight: viewType === 'hourly' ? '300px' : '160px' }}
      >
        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={viewType === 'hourly' ? 300 : 130} 
          className="w-full overflow-visible"
        />

        {/* Custom absolutely-positioned Tooltip */}
        {hoveredCell && (
          <div 
            className="absolute z-30 bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xl pointer-events-none text-slate-100 flex flex-col gap-1 inline-block shrink-0 animate-fade-in"
            style={{ 
              left: `${hoveredCell.x + 15}px`, 
              top: `${hoveredCell.y}px`,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              transform: 'translateY(-50%)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              {hoveredCell.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${viewType === 'hourly' ? 'bg-[#38bdf8]' : 'bg-[#34d399]'}`}></span>
              <span className="text-slate-100 font-extrabold">{hoveredCell.extra}</span>
            </div>
          </div>
        )}

        {/* Empty State placeholder */}
        {punchLogs.length === 0 && (
          <div className="absolute inset-0 bg-slate-950/70 rounded-2xl flex flex-col justify-center items-center text-center p-8 z-10">
            <CalendarDays className="h-10 w-10 text-slate-500 mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-slate-300">No Check-in Data Synchronized</h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Once employees log client-side geofenced punches, the D3 Heatmap will dynamically model density statistics here.
            </p>
          </div>
        )}
      </div>

      {/* Heatmap Legend Info footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-800/90 text-xs text-slate-400 font-semibold">
        <div className="flex items-center gap-2">
          <span>Density Density Levels:</span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span className="text-slate-500">Less</span>
            <span className={`w-3.5 h-3.5 rounded border ${viewType === 'hourly' ? 'bg-[#f8fafc]/10 border-slate-700' : 'bg-[#fafafa]/10 border-slate-700'}`}></span>
            <span className={`w-3.5 h-3.5 rounded border ${viewType === 'hourly' ? 'bg-[#bae6fd] border-sky-400' : 'bg-[#a7f3d0] border-emerald-400'}`}></span>
            <span className={`w-3.5 h-3.5 rounded border ${viewType === 'hourly' ? 'bg-[#38bdf8] border-sky-400' : 'bg-[#34d399] border-emerald-400'}`}></span>
            <span className={`w-3.5 h-3.5 rounded border ${viewType === 'hourly' ? 'bg-[#0284c7] border-sky-500' : 'bg-[#059669] border-emerald-500'}`}></span>
            <span className="text-slate-500">More</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Hover on individual squares to view exact numerical punch-in volume.</span>
        </div>
      </div>

      {/* Dynamic Key Analytics Insights Panel */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4" id="heatmap-insights-ledger">
        
        <div className="bg-slate-950/35 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
          <div className="p-2 bg-sky-950 text-sky-400 rounded-lg shrink-0 mt-0.5">
            <Flame className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Absolute Hourly Peak</span>
            <span className="text-xs font-bold text-slate-200 block text-wrap">
              {insights.peakDayHour}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/35 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
          <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg shrink-0 mt-0.5">
            <Users className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Top Duty Volume Day</span>
            <span className="text-xs font-bold text-slate-200 block">
              {insights.mostProductiveDayName}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/35 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
          <div className="p-2 bg-purple-950 text-purple-400 rounded-lg shrink-0 mt-0.5">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Chronicle Calendar Days</span>
            <span className="text-xs font-bold text-slate-200 block">
              {insights.activeDaysCount} active days / {insights.totalRecords} total punches
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
