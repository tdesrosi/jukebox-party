import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import our components
import Picker from './components/Picker';
import Projector from './components/Projector';
import Admin from './components/Admin';
import Login from './components/Login';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('admin_auth') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * App.js - The Navigation Hub
 * * We use React Router to determine which "App" to show based on the URL.
 * iPad: /picker
 * Projector Laptop: /projector
 * Performance Phone: /admin
 */
function App() {
  return (
    <Router>
      {/* This div wraps every page, ensuring we have a consistent 
        black background (classic for performance) and the standard text color.
      */}
      <div className="min-h-screen bg-black text-white font-sans selection:bg-jukebox-gold selection:text-black">

        <Routes>
          {/* THE GUEST VIEW: Designed for iPads on music stands */}
          <Route path="/picker" element={<Picker />} />

          {/* THE STAGE VIEW: Designed for high-res projectors/TVs */}
          <Route path="/projector" element={<Projector />} />

          {/* THE LOGIN PAGE: For admin access */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Route */}
          <Route path="/admin" element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          } />

          {/* THE HOME/LANDING PAGE: For debugging or internal navigation */}
          <Route path="/" element={
            <div className="flex flex-col items-center justify-center h-screen space-y-6">
              <div className="text-center">
                <h1 className="text-5xl font-serif text-jukebox-gold italic mb-2">Classical Remix</h1>
                <p className="text-gray-500 uppercase tracking-widest text-sm">System Dashboard</p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-64">
                <a href="/picker" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-jukebox-gold transition-colors">
                  iPad Picker
                </a>
                <br></br>
                <a href="/projector" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-jukebox-gold transition-colors">
                  Stage Projector
                </a>
                <br></br>
                <a href="/admin" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-jukebox-gold transition-colors">
                  Admin Remote
                </a>
                <br></br>
              </div>
            </div>
          } />
        </Routes>

      </div>
    </Router>
  );
}

export default App;