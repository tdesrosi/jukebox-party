import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

const Login = () => {
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Set the festival credentials
        // I don't really care about doing this "right", this works well for now...
        if (password === 'Remix1234') {
            localStorage.setItem('admin_auth', 'true');
            navigate('/admin');
        } else {
            alert("Incorrect access code.");
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
            <form onSubmit={handleLogin} className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl">
                <div className="bg-[#FF5A5F]/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Lock className="text-[#FF5A5F]" size={28} />
                </div>
                <h1 className="text-2xl font-serif italic text-white mb-2">Director Access</h1>
                <p className="text-white/40 text-sm mb-8 uppercase tracking-widest">Classical Remix Music Festival</p>

                <input
                    type="password"
                    autoFocus
                    className="w-full bg-black border border-white/10 rounded-2xl p-5 text-white text-center outline-none focus:border-[#FF5A5F] mb-6 text-xl tracking-[0.5em]"
                    placeholder="••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    type="submit"
                    className="w-full bg-[#FF5A5F] text-white font-bold py-5 rounded-2xl shadow-lg shadow-[#FF5A5F]/20 active:scale-95 transition-all"
                >
                    Unlock Console
                </button>
            </form>
        </div>
    );
};

export default Login;