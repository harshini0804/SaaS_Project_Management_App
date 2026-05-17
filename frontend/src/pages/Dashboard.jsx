import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981']; 

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
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="flex h-[80vh] items-center justify-center text-gray-500">Loading metrics...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-8">
                <div className="mb-10">
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">Performance Analytics</h2>
                    
                    {/* High-Level Metric Cards */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-500">Total Workspace Tasks</h3>
                            <p className="mt-2 text-4xl font-bold text-gray-900">{analytics.total_tasks}</p>
                        </div>
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm ring-1 ring-blue-500">
                            <h3 className="text-sm font-semibold text-blue-800">Assigned To You</h3>
                            <p className="mt-2 text-4xl font-bold text-blue-900">{analytics.my_tasks}</p>
                            {analytics.my_tasks > 0 && <p className="mt-1 text-xs font-medium text-blue-600 animate-pulse">Action required</p>}
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-500">Completed Tasks</h3>
                            <p className="mt-2 text-4xl font-bold text-green-600">{analytics.completed_tasks}</p>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Task Distribution Pie Chart */}
                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-lg font-semibold text-gray-800">Task Distribution</h3>
                            {analytics.status_distribution.length === 0 ? (
                                <p className="text-sm text-gray-500">No data available.</p>
                            ) : (
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.status_distribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {analytics.status_distribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Velocity / Progress Bar Chart */}
                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-lg font-semibold text-gray-800">Pipeline Volume</h3>
                            {analytics.status_distribution.length === 0 ? (
                                <p className="text-sm text-gray-500">No data available.</p>
                            ) : (
                                <div className="h-72 w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.status_distribution}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}