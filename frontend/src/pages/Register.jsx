import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [workspace, setWorkspace] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(email, password, workspace);
            
            // NEW: Auto-join if they came from an invite link!
            const pendingInvite = localStorage.getItem('pendingInvite');
            if (pendingInvite) {
                try {
                    await api.post(`/workspaces/join/${pendingInvite}`);
                } catch (inviteError) {
                    console.error("Auto-join failed:", inviteError);
                } finally {
                    localStorage.removeItem('pendingInvite'); // Clear it
                }
            }
            
            navigate('/dashboard'); // Redirect on success
        } catch (error) {
            alert('Registration failed.');
        }
    };
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <form onSubmit={handleSubmit} className="w-96 rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">Create an Account</h2>
                
                <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Workspace Name</label>
                    <input 
                        type="text" 
                        value={workspace}
                        onChange={(e) => setWorkspace(e.target.value)}
                        className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none" 
                        required 
                    />
                </div>

                <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none" 
                        required 
                    />
                </div>

                <div className="mb-6">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none" 
                        required 
                    />
                </div>

                <button type="submit" className="w-full rounded-md bg-green-600 py-2 text-white hover:bg-green-700">
                    Register
                </button>
                
                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login here</Link>
                </p>
            </form>
        </div>
    );
}