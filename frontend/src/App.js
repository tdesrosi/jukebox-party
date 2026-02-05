import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import our components
import Picker from './components/Picker';
import Projector from './components/Projector';
import Admin from './components/Admin';
import Login from './components/Login';
import Kiosk from './components/Kiosk'; // <--- NEW IMPORT

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('admin_auth') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * App.js - The Navigation Hub
 */
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-jukebox-gold selection:text-black">

        <Routes>
          {/* THE GUEST VIEW: Standard mobile picker (Stripe mode by default) */}
          <Route path="/picker" element={<Picker />} />

          {/* THE KIOSK SETUP: Enter password here to unlock "Kiosk Mode" */}
          <Route path="/kiosk" element={<Kiosk />} />

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

          {/* THE HOME/LANDING PAGE: System Dashboard */}
          <Route path="/" element={
            <div className="flex flex-col items-center justify-center h-screen space-y-6">
              <div className="text-center">
                <h1 className="text-5xl font-serif text-[#FF5A5F] italic mb-2">Classical Remix</h1>
                <p className="text-gray-500 uppercase tracking-widest text-sm">System Dashboard</p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-64">
                {/* 1. Guest Picker Link */}
                <a href="/picker" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-[#FF5A5F] transition-colors">
                  Open Song Picker
                </a>

                {/* 2. Kiosk Setup Link (NEW) */}
                <a href="/kiosk" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-[#FF5A5F] transition-colors text-[#FF5A5F]">
                  Setup Kiosk
                </a>

                <div className="h-px bg-gray-800 w-full my-2"></div>

                {/* 3. Projector Link */}
                <a href="/projector" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-[#FF5A5F] transition-colors">
                  Stage Projector
                </a>

                {/* 4. Admin Link */}
                <a href="/admin" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-[#FF5A5F] transition-colors">
                  Admin Remote
                </a>
              </div>
            </div>
          } />
        </Routes>

      </div>
    </Router>
  );
}

export default App;