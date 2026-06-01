import { useState, useEffect } from 'react';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, 
    AreaChart, Area 
} from 'recharts';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);

    // Modern SaaS Semantic Colors
    const STATUS_COLORS = { 'To Do': '#cbd5e1', 'In Progress': '#3b82f6', 'In Review': '#f59e0b', 'Done': '#10b981' };
    const PRIORITY_COLORS = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#3b82f6' };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await api.get('/analytics/workspace');
            setAnalytics(response.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        }
    };

    if (!analytics) return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <div className="flex flex-1 items-center justify-center text-slate-500 animate-pulse">Loading workspace insights...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Workspace Overview</h2>
                </div>
                
                {/* High-Level Metric Cards */}
                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Backlog</h3>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                {/* Icon placeholder */}
                                📋
                            </span>
                        </div>
                        <p className="mt-4 text-4xl font-bold text-slate-900">{analytics.total_tasks}</p>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm ring-1 ring-blue-500/20 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Assigned To You</h3>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-blue-700">
                                👤
                            </span>
                        </div>
                        <p className="mt-4 text-4xl font-bold text-blue-900">{analytics.my_tasks}</p>
                        {analytics.my_tasks > 0 && (
                            <p className="mt-2 text-xs font-semibold text-blue-600">Requires your attention</p>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Completion Rate</h3>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                                🚀
                            </span>
                        </div>
                        <p className="mt-4 text-4xl font-bold text-slate-900">
                            {analytics.total_tasks > 0 
                                ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100) 
                                : 0}%
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{analytics.completed_tasks} tasks finished</p>
                    </div>
                </div>

                {/* Main Analytics Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    
                    {/* 1. Velocity / Burn-up Chart (Are we keeping up?) */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <h3 className="mb-6 text-lg font-bold text-slate-800">Task Velocity (Last 7 Days)</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.velocity_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                                    <Area type="monotone" dataKey="completed" name="Tasks Completed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                                    <Area type="monotone" dataKey="added" name="New Tasks Added" stroke="#94a3b8" strokeWidth={2} fill="none" strokeDasharray="5 5" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Status Donut Chart */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-bold text-slate-800">Current Status</h3>
                        {analytics.status_distribution.length === 0 ? (
                            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-500">
                                No tasks in this workspace yet.
                            </div>
                        ) : (
                            <div className="h-64 w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={analytics.status_distribution}
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {analytics.status_distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* 3. Team Workload Bar Chart */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-bold text-slate-800">Team Workload</h3>
                        {analytics.workload_distribution.length === 0 ? (
                            <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">
                                <span className="mb-1 text-2xl">👤</span>
                                <p>No active tasks are assigned to anyone.</p>
                                <p>Assign tasks on the board to see workload!</p>
                            </div>
                        ) : (
                            <div className="h-64 w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.workload_distribution} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="tasks" name="Active Tasks" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}