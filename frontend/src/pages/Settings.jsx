import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Settings() {
    const { user, logout } = useContext(AuthContext);
    const [workspace, setWorkspace] = useState(null);
    const [newName, setNewName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        fetchWorkspace();
    }, []);

    const fetchWorkspace = async () => {
        try {
            const response = await api.get('/workspaces/me');
            setWorkspace(response.data);
            setNewName(response.data.name);
        } catch (error) {
            console.error("Failed to fetch workspace", error);
        }
    };

    const handleUpdateName = async (e) => {
        e.preventDefault();
        try {
            const response = await api.patch('/workspaces/me', { name: newName });
            setWorkspace(response.data);
            alert("Workspace updated successfully!");
        } catch (error) {
            alert("Failed to update workspace. Are you an owner?");
        }
    };

    const handleGenerateInvite = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/workspaces/invites', { 
                email: inviteEmail, 
                role: 'member' 
            });
            
            // Automatically copy to clipboard
            navigator.clipboard.writeText(response.data.invite_link);
            alert("Invite link generated and copied to your clipboard!");
            setInviteEmail('');
        } catch (error) {
            const msg = error.response?.data?.detail || "Failed to generate invite.";
            alert(msg);
        }
    };

    if (!workspace) return <div className="flex h-screen items-center justify-center">Loading settings...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Standard Navigation */}
            <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
                <Link to="/dashboard" className="text-xl font-bold text-blue-600 hover:text-blue-800">
                    ← Back to Dashboard
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{user?.email}</span>
                    <button onClick={logout} className="font-medium text-red-600 hover:text-red-800">Logout</button>
                </div>
            </nav>

            <main className="mx-auto max-w-3xl px-6 py-8">
                <h1 className="mb-8 text-3xl font-bold text-gray-900">Workspace Settings</h1>

                {/* Update Name Section */}
                <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">General</h2>
                    <form onSubmit={handleUpdateName} className="flex gap-4">
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 rounded-md border p-2 focus:border-blue-500 focus:outline-none" 
                            required 
                        />
                        <button type="submit" className="rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-900">
                            Save Name
                        </button>
                    </form>
                </div>

                {/* Invite Member Section */}
                <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">Invite Teammate</h2>
                    <form onSubmit={handleGenerateInvite} className="flex gap-4">
                        <input 
                            type="email" 
                            placeholder="teammate@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="flex-1 rounded-md border p-2 focus:border-blue-500 focus:outline-none" 
                            required 
                        />
                        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                            Generate Magic Link
                        </button>
                    </form>
                </div>

                {/* Team Members List */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">Team Members ({workspace.members.length})</h2>
                    <ul className="divide-y divide-gray-200">
                        {workspace.members.map((member) => (
                            <li key={member.id} className="flex items-center justify-between py-3">
                                <span className="text-gray-800">{member.email}</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${member.role === 'owner' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                    {member.role}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
}