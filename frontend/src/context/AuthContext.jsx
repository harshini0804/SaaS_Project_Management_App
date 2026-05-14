import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On initial load, check if we have a token and fetch the user's profile
    useEffect(() => {
        const fetchMe = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                } catch (err) {
                    console.error("Token invalid or expired");
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        fetchMe();
    }, []);

    const login = async (email, password) => {
        // FastAPI's OAuth2PasswordRequestForm requires URL encoded form data, NOT raw JSON
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/auth/login', formData);
        localStorage.setItem('token', response.data.access_token);

        // Immediately fetch the user profile after a successful login
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data);
    };

    const register = async (email, password, workspace_name) => {
        // Registration takes raw JSON
        await api.post('/auth/register', { email, password, workspace_name });
        
        // Automatically log them in right after they register
        await login(email, password);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};