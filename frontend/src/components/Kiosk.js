import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { KIOSK_SECRET } from '../config';

const Kiosk = () => {
    const [secret, setSecret] = useState('');
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    const handleAuthorize = () => {
        // This is the hardcoded "password" for the iPad
        // Not really secure, but sufficient for our use case
        if (secret === KIOSK_SECRET) {
            // 1. Save the key to the browser's permanent storage
            localStorage.setItem('kiosk_secret', secret);

            // 2. Redirect immediately to the Picker
            // The Picker will see the key in storage and switch to "Kiosk Mode"
            navigate('/picker');
        } else {
            setError(true);
            setSecret('');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
            <div className="max-w-md w-full bg-[#111] border border-gray-800 p-8 rounded-3xl text-center shadow-2xl">

                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gray-900 rounded-full border border-gray-800">
                        <Lock className="text-[#FF5A5F]" size={32} />
                    </div>
                </div>

                <h1 className="text-3xl font-serif italic text-[#FF5A5F] mb-2">Kiosk Setup</h1>
                <p className="text-gray-500 text-sm mb-8 uppercase tracking-widest">
                    Authorize this device for physical tickets
                </p>

                <div className="space-y-4">
                    <input
                        type="password"
                        placeholder="Enter Master Key"
                        className={`w-full bg-black border ${error ? 'border-red-500' : 'border-gray-800'} rounded-xl p-4 text-white text-center outline-none focus:border-[#FF5A5F] transition-all`}
                        value={secret}
                        onChange={(e) => {
                            setSecret(e.target.value);
                            setError(false);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAuthorize()}
                    />

                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-500 text-xs uppercase tracking-wider font-bold">
                            <AlertCircle size={14} />
                            <span>Invalid Key</span>
                        </div>
                    )}

                    <button
                        onClick={handleAuthorize}
                        className="w-full bg-[#FF5A5F] text-white font-bold rounded-xl py-4 hover:bg-[#ff4046] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={20} />
                        Authorize Device
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Kiosk;