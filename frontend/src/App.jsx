import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

        {/* Temporary Dashboard Route (To prove login worked) */}
        <Route 
          path="/dashboard" 
          element={
            user ? (
              <div className="p-10">
                <h1 className="text-3xl font-bold text-green-600">Welcome, {user.email}!</h1>
                <p>Your workspace is ready.</p>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App; 