import { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import api from '../api/axios';

export default function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [workspaceName, setWorkspaceName] = useState('Loading...');
    const dropdownRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Fetch workspace name for the dropdown
    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                const res = await api.get('/workspaces/me');
                setWorkspaceName(res.data.name);
            } catch (error) {
                setWorkspaceName('My Workspace');
            }
        };
        if (user) fetchWorkspace();
    }, [user]);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Helper to style active vs inactive icons
    const getIconClass = (path) => {
        return location.pathname === path 
            ? "text-blue-600 bg-blue-50 p-2 rounded-md transition-colors" 
            : "text-gray-500 hover:text-blue-600 hover:bg-gray-50 p-2 rounded-md transition-colors";
    };

    return (
        <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
            {/* Left: App Name */}
            <Link to="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">S</div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">SaaS Manager</h1>
            </Link>

            {/* Right: Icon Navigation */}
            <div className="flex items-center gap-2 md:gap-4">
                
                {/* Workspace (Projects) Icon */}
                <Link to="/workspace" className={getIconClass('/workspace')} title="Workspace Projects">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </Link>

                {/* Dashboard (Analytics) Icon */}
                <Link to="/dashboard" className={getIconClass('/dashboard')} title="Analytics Dashboard">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </Link>

                {/* Notifications Bell */}
                <div className="mx-1 mt-1">
                    <NotificationBell />
                </div>

                {/* Profile Dropdown */}
                <div className="relative ml-2" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors focus:outline-none ${isProfileOpen ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-transparent bg-gray-100 text-gray-600 hover:border-gray-300'}`}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-64 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="border-b border-gray-100 px-4 py-3">
                                <p className="text-sm font-semibold text-gray-900 truncate">{workspaceName}</p>
                                <p className="truncate text-xs font-medium text-gray-500">{user?.email}</p>
                            </div>
                            <div className="py-1">
                                <Link 
                                    to="/settings" 
                                    onClick={() => setIsProfileOpen(false)}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                                >
                                    Workspace Settings
                                </Link>
                            </div>
                            <div className="border-t border-gray-100 py-1">
                                <button 
                                    onClick={handleLogout}
                                    className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}