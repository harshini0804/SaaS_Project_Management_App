import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Settings() {
    const { user, logout } = useContext(AuthContext);
    const [workspace, setWorkspace] = useState(null);
    const [newName, setNewName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member'); // Default invite role

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
            alert("Failed to update workspace. Are you an owner or admin?");
        }
    };

    const handleGenerateInvite = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/workspaces/invites', { 
                email: inviteEmail, 
                role: inviteRole 
            });
            
            navigator.clipboard.writeText(response.data.invite_link);
            alert(`Invite link for ${inviteRole} generated and copied to your clipboard!`);
            setInviteEmail('');
        } catch (error) {
            const msg = error.response?.data?.detail || "Failed to generate invite.";
            alert(msg);
        }
    };

    const handleRemoveMember = async (userId, userEmail) => {
        if (!window.confirm(`Are you sure you want to remove ${userEmail} from the workspace?`)) return;
        
        try {
            await api.delete(`/workspaces/members/${userId}`);
            fetchWorkspace(); 
        } catch (error) {
            alert(error.response?.data?.detail || "Failed to remove member.");
        }
    };

    if (!workspace) return <div className="flex h-screen items-center justify-center">Loading settings...</div>;

    // Determine the current logged-in user's role to control the UI
    const currentUserRole = workspace.members.find(m => m.email === user?.email)?.role;
    const isPrivileged = currentUserRole === 'owner' || currentUserRole === 'admin';

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
                <Link to="/dashboard" className="text-xl font-bold text-blue-600 hover:text-blue-800">
                    ← Back to Dashboard
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-800 uppercase">({currentUserRole})</span>
                    <span className="text-sm text-gray-600">{user?.email}</span>
                    <button onClick={logout} className="font-medium text-red-600 hover:text-red-800">Logout</button>
                </div>
            </nav>

            <main className="mx-auto max-w-3xl px-6 py-8">
                <h1 className="mb-8 text-3xl font-bold text-gray-900">Workspace Settings</h1>

                {/* Only let owners/admins rename the workspace */}
                {isPrivileged && (
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
                )}

                {/* Invite Member Section (Only for privileged users) */}
                {isPrivileged && (
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
                            {/* Role Selection Dropdown including Viewer */}
                            <select 
                                value={inviteRole} 
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="rounded-md border p-2 bg-white text-gray-700 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                                <option value="viewer">Viewer</option>
                            </select>
                            <button type="submit" className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                                Generate Magic Link
                            </button>
                        </form>
                    </div>
                )}

                {/* Team Members List */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold">Team Members ({workspace.members.length})</h2>
                    <ul className="divide-y divide-gray-200">
                        {workspace.members.map((member) => {
                            const isSelf = member.email === user?.email;
                            const isTargetOwner = member.role === 'owner';

                            return (
                                <li key={member.id} className="flex items-center justify-between py-3">
                                    <div className="flex flex-col">
                                        <span className="text-gray-800 font-medium">{member.email}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Dynamic Badge Styling based on Role */}
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${
                                            member.role === 'owner' ? 'bg-purple-100 text-purple-800' : 
                                            member.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                                            member.role === 'viewer' ? 'bg-gray-100 text-gray-800' : 
                                            'bg-green-100 text-green-800'
                                        }`}>
                                            {member.role}
                                        </span>
                                        
                                        {/* Only show remove if current user is privileged, target is not self, and target is not owner */}
                                        {isPrivileged && !isSelf && !isTargetOwner && (
                                            <button 
                                                onClick={() => handleRemoveMember(member.id, member.email)}
                                                className="text-sm font-semibold text-red-500 hover:text-red-700 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </main>
        </div>
    );
}