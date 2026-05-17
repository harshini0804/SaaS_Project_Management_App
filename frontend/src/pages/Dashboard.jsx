import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state for new projects
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Fetch projects automatically when the page loads
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects/');
            setProjects(response.data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects/', { name, description });
            setIsModalOpen(false); // Close the modal
            setName('');           // Clear the form
            setDescription('');
            fetchProjects();       // Refresh the list to show the new project
        } catch (error) {
            alert("Failed to create project");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation Bar */}
            <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800">SaaS Manager</h1>
                <div className="flex items-center gap-4">
                    <NotificationBell /> 
                    <span className="text-sm text-gray-600">{user?.email}</span>
                    <Link to="/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                        Settings
                    </Link>

                    <button onClick={logout} className="font-medium text-red-600 hover:text-red-800">
                        Logout
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="mx-auto max-w-7xl px-6 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        + New Project
                    </button>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {projects.length === 0 ? (
                        <p className="col-span-3 text-gray-500">No projects yet. Create one to get started!</p>
                    ) : (
                        projects.map((project) => (
                            // 1. Change this div to a Link
                            <Link 
                                to={`/projects/${project.id}`} 
                                key={project.id} 
                                className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <h3 className="mb-2 text-lg font-semibold text-gray-900">{project.name}</h3>
                                <p className="text-sm text-gray-600 line-clamp-3">
                                    {project.description || "No description provided."}
                                </p>
                            </Link>
                        ))
                    )}
                </div>
            </main>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-900">Create New Project</h2>
                        <form onSubmit={handleCreateProject}>
                            <div className="mb-4">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Project Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none" 
                                    required 
                                />
                            </div>
                            <div className="mb-6">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none" 
                                    rows="3"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}