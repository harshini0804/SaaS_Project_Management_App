import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

export default function JoinWorkspace() {
    const { token } = useParams(); // Grabs the UUID from the URL
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [status, setStatus] = useState('Processing your invitation...');

    useEffect(() => {
        if (user) {
            acceptInvite();
        }
    }, [user]);

    const acceptInvite = async () => {
        try {
            await api.post(`/workspaces/join/${token}`);
            setStatus('Successfully joined! Redirecting to dashboard...');
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (error) {
            setStatus(error.response?.data?.detail || 'Failed to join workspace.');
        }
    };

    // If they click the link but aren't logged in, intercept them.
    if (!user) {
        localStorage.setItem('pendingInvite', token);
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900">You've been invited!</h2>
                    <p className="mb-8 text-gray-600">Please log in or create an account using the email address the invite was sent to.</p>
                    <div className="flex justify-center gap-4">
                        <Link to="/login" className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
                            Log In
                        </Link>
                        <Link to="/register" className="rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700">
                            Register
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
                <h2 className="text-xl font-bold text-gray-900">{status}</h2>
            </div>
        </div>
    );
}