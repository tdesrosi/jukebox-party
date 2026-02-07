import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';

const Login = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/auth/verify', { password });

            if (res.data.valid) {
                // 1. Authorize Admin
                localStorage.setItem('admin_auth', 'true');

                // 2. Authorize Kiosk (The "Handshake")
                if (res.data.kioskSecret) {
                    localStorage.setItem('kiosk_secret', res.data.kioskSecret);
                }

                navigate('/admin');
            }
        } catch (err) {
            setError(true);
            setPassword('');
        }
    };
    // ... render return ...
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-64">
                <div className="flex justify-center mb-4">
                    <Lock className="text-[#FF5A5F]" size={48} />
                </div>
                <input
                    type="password"
                    placeholder="Admin Password"
                    className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-center outline-none focus:border-[#FF5A5F]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <p className="text-red-500 text-xs text-center">Invalid Credentials</p>}
                <button type="submit" className="bg-[#FF5A5F] py-3 rounded-xl font-bold">
                    Enter Console
                </button>
            </form>
        </div>
    );
};

export default Login;