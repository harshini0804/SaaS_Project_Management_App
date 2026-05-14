import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/dashboard'); // Redirect on success
        } catch (error) {
            alert('Login failed. Check your credentials.');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <form onSubmit={handleSubmit} className="w-96 rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">Sign In</h2>
                
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

                <button type="submit" className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700">
                    Login
                </button>
                
                <p className="mt-4 text-center text-sm text-gray-600">
                    Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register here</Link>
                </p>
            </form>
        </div>
    );
}