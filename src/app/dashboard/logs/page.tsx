'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Clock, 
  User, 
  Layers,
  Database,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  category: string;
  userId: string | null;
  traceId: string | null;
  version: string;
  context: any;
  error: any;
}

interface Stats {
  levelStats: {
    info: number;
    warn: number;
    error: number;
  };
  categoryStats: Record<string, number>;
  recentErrors: SystemLog[];
  chartData: Array<{
    date: string;
    info: number;
    warn: number;
    error: number;
  }>;
}

interface LogResponse {
  logs: SystemLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  // Filter states
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);

  // Fetch logs stats
  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const data = await apiFetch<Stats>('/logs/stats');
      setStats(data);
    } catch {
      toast.error('Failed to load log statistics');
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Fetch logs list
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (levelFilter) queryParams.append('level', levelFilter);
      if (categoryFilter) queryParams.append('category', categoryFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '15');

      const data = await apiFetch<LogResponse>(`/logs?${queryParams.toString()}`);
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      setTotalLogs(data.pagination.total);
    } catch {
      toast.error('Failed to load log entries');
    } finally {
      setIsLoading(false);
    }
  }, [levelFilter, categoryFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle trace link filter
  const handleTraceClick = (traceId: string) => {
    setSearchQuery(traceId);
    setLevelFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
    setSelectedLog(null);
  };

  const clearFilters = () => {
    setLevelFilter('');
    setCategoryFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Observability & Logs"
        description="Monitor system events, exceptions, publish results, and debug errors."
        actions={
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              fetchStats();
              fetchLogs();
              toast.success('Logs refreshed');
            }}
            className="flex items-center gap-2 rounded-full"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Observability Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-100 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Errors</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-500 mt-1">
                {isStatsLoading ? '...' : stats?.levelStats.error}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-100 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Warnings</p>
              <h3 className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">
                {isStatsLoading ? '...' : stats?.levelStats.warn}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-100 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Info Events</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-500 mt-1">
                {isStatsLoading ? '...' : stats?.levelStats.info}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-500">
              <Info className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-100 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Status</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">Database Live</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center text-green-600 dark:text-green-500">
              <Database className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Quick List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CSS Chart for last 7 days */}
        <Card className="lg:col-span-2 bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">System Events Trend (7 Days)</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Visual distribution of info, warn, and error logs.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 h-52 flex items-end justify-between gap-2 sm:gap-4 px-4 sm:px-6">
            {!isStatsLoading && stats?.chartData ? (
              stats.chartData.map((day) => {
                const total = day.info + day.warn + day.error;
                const maxVal = Math.max(...(stats.chartData.map(d => d.info + d.warn + d.error))) || 1;
                const heightPercentage = Math.max(10, Math.min(100, (total / maxVal) * 100));

                const errorPct = total > 0 ? (day.error / total) * 100 : 0;
                const warnPct = total > 0 ? (day.warn / total) * 100 : 0;
                const infoPct = total > 0 ? (day.info / total) * 100 : 0;

                const formattedDate = new Date(day.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute bg-zinc-950 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 text-[10px] p-2 rounded shadow-lg transition-opacity duration-200 pointer-events-none mb-40 flex flex-col gap-0.5 z-10 font-medium border border-black/10">
                      <p className="font-bold border-b border-white/10 dark:border-black/10 pb-0.5 mb-1">{formattedDate}</p>
                      <p className="text-red-500">Errors: {day.error}</p>
                      <p className="text-amber-500">Warns: {day.warn}</p>
                      <p className="text-blue-500">Info: {day.info}</p>
                      <p className="font-semibold text-zinc-400 mt-0.5 pt-0.5 border-t border-white/5">Total: {total}</p>
                    </div>

                    {/* Stacked bar */}
                    <div 
                      style={{ height: `${heightPercentage}%` }} 
                      className="w-full sm:w-8 rounded-t overflow-hidden flex flex-col justify-end transition-all duration-300 hover:scale-105 hover:shadow-md cursor-pointer"
                    >
                      {/* Error component */}
                      <div style={{ height: `${errorPct}%` }} className="bg-red-500 w-full" />
                      {/* Warn component */}
                      <div style={{ height: `${warnPct}%` }} className="bg-amber-400 w-full" />
                      {/* Info component */}
                      <div style={{ height: `${infoPct}%` }} className="bg-blue-500 w-full flex-1" />
                    </div>
                    
                    <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-full">
                      {formattedDate}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                Loading chart trend data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Errors Box */}
        <Card className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Recent Failures</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Directly investigate recent error events.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[192px] overflow-y-auto">
              {!isStatsLoading && stats?.recentErrors ? (
                stats.recentErrors.length > 0 ? (
                  stats.recentErrors.map((log) => (
                    <div 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="p-3 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer flex flex-col gap-1 transition-all duration-150"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-red-600 dark:text-red-400 uppercase text-[10px]">{log.category}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="font-medium text-[#1d1d1f] dark:text-zinc-200 truncate">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No errors logged. System is operating perfectly!
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading recent failures...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Logs Table */}
      <Card className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight">Event Log List</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Showing {logs.length} out of {totalLogs} logged entries.</CardDescription>
            </div>
            
            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search log messages..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 text-xs rounded-full bg-white dark:bg-zinc-950"
                />
              </div>

              <select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 py-1 bg-white dark:bg-zinc-950 border border-input rounded-full text-xs font-medium text-[#1d1d1f] dark:text-white"
              >
                <option value="">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 py-1 bg-white dark:bg-zinc-950 border border-input rounded-full text-xs font-medium text-[#1d1d1f] dark:text-white"
              >
                <option value="">All Categories</option>
                <option value="api">API</option>
                <option value="auth">Auth</option>
                <option value="database">Database</option>
                <option value="publisher">Publisher</option>
                <option value="scheduler">Scheduler</option>
                <option value="frontend">Frontend</option>
              </select>

              {(levelFilter || categoryFilter || searchQuery) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-xs font-medium h-9 text-muted-foreground hover:text-red-500 rounded-full"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-muted-foreground font-semibold">
                  <th className="p-3">Level</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Message</th>
                  <th className="p-3 hidden sm:table-cell">Time</th>
                  <th className="p-3 hidden md:table-cell">Trace ID</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading log records...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => {
                    let badgeColor = 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';
                    
                    if (log.level === 'error') {
                      badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
                    } else if (log.level === 'warn') {
                      badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                    } else if (log.level === 'info') {
                      badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
                    }

                    return (
                      <tr 
                        key={log.id} 
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10 transition-colors"
                      >
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeColor}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-zinc-600 dark:text-zinc-300 uppercase text-[10px] tracking-wide">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3 max-w-[200px] sm:max-w-md truncate font-medium text-[#1d1d1f] dark:text-zinc-200">
                          {log.message}
                        </td>
                        <td className="p-3 hidden sm:table-cell text-muted-foreground text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 hidden md:table-cell font-mono text-[10px] text-muted-foreground max-w-[120px] truncate">
                          {log.traceId || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-7 text-xs font-semibold px-3 text-[#0071e3] hover:text-[#0071e3]/80 rounded-full"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No matching log entries found. Try clearing filter terms.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[11px] text-muted-foreground font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="h-8 rounded-full"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="h-8 rounded-full"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-0 max-h-[85vh] flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-1 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase 
                  ${selectedLog.level === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : ''}
                  ${selectedLog.level === 'warn' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : ''}
                  ${selectedLog.level === 'info' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : ''}
                `}>
                  {selectedLog.level}
                </span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-300 uppercase text-[10px] tracking-wide">
                  {selectedLog.category}
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-[#1d1d1f] dark:text-white mt-2 leading-snug">
                {selectedLog.message}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(selectedLog.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Trace ID, User ID & Version information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-850 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Trace ID</span>
                  {selectedLog.traceId ? (
                    <button 
                      onClick={() => handleTraceClick(selectedLog.traceId!)}
                      className="font-mono text-xs text-left font-bold text-[#0071e3] hover:underline flex items-center gap-1 group"
                    >
                      {selectedLog.traceId}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">-</span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">User ID</span>
                  <span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedLog.userId || 'System (Background)'}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">App Version</span>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    v{selectedLog.version || '1.0.0'}
                  </span>
                </div>
              </div>

              {/* Context display */}
              {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    Log Context
                  </h4>
                  <pre className="p-4 bg-zinc-950 text-zinc-100 text-[11px] font-mono rounded-xl overflow-x-auto max-h-48 border border-zinc-800">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error Stacktrace display */}
              {selectedLog.error && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    Exception Details
                  </h4>
                  <div className="border border-red-200/50 dark:border-red-900/30 rounded-xl overflow-hidden">
                    <div className="bg-red-50/50 dark:bg-red-950/20 px-4 py-2 border-b border-red-200/50 dark:border-red-900/30">
                      <p className="text-xs font-bold text-red-800 dark:text-red-400 font-mono">
                        {selectedLog.error.type}: {selectedLog.error.message}
                      </p>
                    </div>
                    {selectedLog.error.stackTrace && (
                      <pre className="p-4 bg-zinc-950 text-red-400/90 text-[10px] font-mono rounded-b-xl overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
                        {selectedLog.error.stackTrace}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-100 dark:border-zinc-800 flex justify-end flex-shrink-0">
              <Button 
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 rounded-full text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black"
              >
                Close Details
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
