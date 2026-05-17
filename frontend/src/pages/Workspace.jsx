import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function Workspace() {
    const [projects, setProjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

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
            setIsModalOpen(false);
            setName('');           
            setDescription('');
            fetchProjects();       
        } catch (error) {
            alert("Failed to create project");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-6 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Workspace Projects</h2>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        + New Project
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {projects.length === 0 ? (
                        <div className="col-span-3 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                            <h3 className="text-sm font-medium text-gray-900">No projects yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
                        </div>
                    ) : (
                        projects.map((project) => (
                            <Link 
                                to={`/projects/${project.id}`} 
                                key={project.id} 
                                className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                            >
                                <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600">{project.name}</h3>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-900">Create New Project</h2>
                        <form onSubmit={handleCreateProject}>
                            <div className="mb-4">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Project Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                    required 
                                />
                            </div>
                            <div className="mb-6">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                    rows="3"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}