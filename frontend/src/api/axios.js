import axios from 'axios';

// Point this to your FastAPI backend URL
const api = axios.create({
    baseURL: 'http://127.0.0.1:8081/api/v1',
});

// Automatically attach the JWT token to every request if it exists
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;