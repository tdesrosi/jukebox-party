import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import our components
import Picker from './components/Picker';
import Projector from './components/Projector';
import Admin from './components/Admin';
import Login from './components/Login';

const PrivateRoute = ({ children }) => {
  // We check for the 'admin_auth' flag we set during login
  const isAuthenticated = localStorage.getItem('admin_auth') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * App.js - The Navigation Hub
 */
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FF5A5F] selection:text-white">

        <Routes>
          {/* THE GUEST VIEW: Standard mobile picker */}
          <Route path="/picker" element={<Picker />} />

          {/* THE STAGE VIEW: Projector output */}
          <Route path="/projector" element={<Projector />} />

          {/* THE LOGIN PAGE: Entry point for Directors AND Kiosk Setup */}
          <Route path="/login" element={<Login />} />

          {/* PROTECTED ADMIN ROUTE */}
          <Route path="/admin" element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          } />

          {/* THE HOME DASHBOARD */}
          <Route path="/" element={
            <div className="flex flex-col items-center justify-center h-screen space-y-6">
              <div className="text-center">
                <h1 className="text-5xl font-serif text-[#FF5A5F] italic mb-2">Classical Remix</h1>
                <p className="text-gray-500 uppercase tracking-widest text-sm">System Dashboard</p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-64">
                {/* Link 1: Guest Picker */}
                <a href="/picker" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-[#FF5A5F] transition-colors">
                  Open Guest Picker
                </a>

                {/* Link 2: Admin/Kiosk Login */}
                <a href="/login" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-[#FF5A5F] transition-colors text-[#FF5A5F]">
                  Director / Kiosk Login
                </a>

                <div className="h-px bg-gray-800 w-full my-2"></div>

                {/* Link 3: Projector */}
                <a href="/projector" className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center hover:border-[#FF5A5F] transition-colors">
                  Stage Projector
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