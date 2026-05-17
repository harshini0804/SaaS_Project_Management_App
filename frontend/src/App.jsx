import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; 
import Settings from './pages/Settings';
import JoinWorkspace from './pages/JoinWorkspace';
import ProjectBoard from './pages/ProjectBoard';
import Workspace from './pages/Workspace';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

        {/* 2. Swap out the inline code for the Dashboard component */}
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/login" />} 
        />

        <Route path="*" element={<Navigate to="/login" />} />

        <Route 
          path="/settings" 
          element={user ? <Settings /> : <Navigate to="/login" />} 
        />
        <Route path="/join/:token" element={<JoinWorkspace />} />

        <Route 
          path="/projects/:projectId" 
          element={user ? <ProjectBoard /> : <Navigate to="/login" />} 
        />

        <Route path="/workspace" element=<Workspace />/>
        
      </Routes>
    </Router>
  );
}

export default App;