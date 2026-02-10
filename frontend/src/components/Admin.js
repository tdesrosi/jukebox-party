import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Minus, CheckCircle, RotateCcw, Ticket, History, PlayCircle, Trash2 } from 'lucide-react';

const Admin = () => {
    const [queue, setQueue] = useState([]);
    const [credits, setCredits] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(collection(db, "queue"), orderBy("timestamp", "desc"));
        const unsubscribeQueue = onSnapshot(q, (snapshot) => {
            setQueue(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const credRef = doc(db, "party", "current_state");
        const unsubscribeCredits = onSnapshot(credRef, (snapshot) => {
            if (snapshot.exists()) setCredits(snapshot.data().credits);
        });

        return () => { unsubscribeQueue(); unsubscribeCredits(); };
    }, []);

    const adjustCredits = async (amount) => {
        const credRef = doc(db, "party", "current_state");
        const newCount = Math.max(0, credits + amount);
        await updateDoc(credRef, { credits: newCount });
    };

    const toggleComplete = async (id, status) => {
        const docRef = doc(db, "queue", id);
        await updateDoc(docRef, { isCompleted: status });
    };

    const removeRequest = async (id) => {
        if (window.confirm("Are you sure you want to remove this request?")) {
            await deleteDoc(doc(db, "queue", id));
        }
    };

    const completedSongs = queue.filter(s => s.isCompleted);
    const fullActiveQueue = queue.filter(s => !s.isCompleted).reverse();

    // Distinguish the "Now Playing" from the rest of the queue
    const nowPlaying = fullActiveQueue.length > 0 ? fullActiveQueue[0] : null;
    const upNext = fullActiveQueue.length > 1 ? fullActiveQueue.slice(1) : [];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 font-sans pb-20">
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 mb-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Dashboard</h2>
                    {/* KIOSK LAUNCHER BUTTON */}
                    <button
                        onClick={() => navigate('/picker')}
                        className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-5 py-3 rounded-xl text-sm font-bold hover:border-[#FF5A5F] transition-colors"
                    >
                        <Ticket size={18} className="text-[#FF5A5F]" />
                        <span>Launch Kiosk</span>
                    </button>
                </div>
            </div>

            {/* 1. CREDIT MANAGEMENT */}
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 mb-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-white/60 uppercase tracking-widest text-xs font-bold">
                        <Ticket size={16} />
                        <span>System Credits</span>
                    </div>
                    <span className="text-5xl font-serif italic text-[#FF5A5F]">{credits}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => adjustCredits(1)} className="flex items-center justify-center gap-2 bg-[#FF5A5F] text-white py-5 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-[#FF5A5F]/20">
                        <Plus size={24} /> Add 1
                    </button>
                    <button onClick={() => adjustCredits(-1)} className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 py-5 rounded-2xl font-bold active:scale-95 transition-all text-white hover:bg-white/20">
                        <Minus size={24} /> Remove 1
                    </button>
                </div>
            </div>

            {/* 2. RECENTLY COMPLETED */}
            {completedSongs.length > 0 && (
                <div className="mb-10">
                    <div className="flex items-center gap-2 ml-4 mb-4 text-white/60 uppercase tracking-[0.3em] text-[10px] font-bold">
                        <History size={12} />
                        <span>Recently Completed</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {completedSongs.slice(0, 3).map(song => (
                            <div key={song.id} className="flex-shrink-0 flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                                <img
                                    src={song.albumArtUrl}
                                    className="w-12 h-12 rounded-lg object-cover saturate-[.5]"
                                    alt=""
                                />
                                <div className="max-w-[140px]">
                                    <p className="font-bold text-xs text-white truncate">{song.title}</p>
                                </div>
                                <button
                                    onClick={() => toggleComplete(song.id, false)}
                                    className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-xl active:scale-90 transition-transform"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. NOW PLAYING HERO */}
            <div className="mb-10">
                <h3 className="text-[#FF5A5F] text-[10px] font-bold tracking-[0.4em] uppercase ml-4 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#FF5A5F] rounded-full animate-pulse"></span>
                    Now Playing
                </h3>
                {nowPlaying ? (
                    <div className="bg-gradient-to-br from-[#222] to-[#111] p-6 rounded-[2.5rem] border-2 border-[#FF5A5F] shadow-[0_0_30px_rgba(255,90,95,0.15)]">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <img src={nowPlaying.albumArtUrl} className="w-24 h-24 rounded-2xl object-cover shadow-2xl" alt="" />
                                <div className="absolute -bottom-2 -right-2 bg-[#FF5A5F] p-2 rounded-full shadow-lg">
                                    <PlayCircle size={16} className="text-white" />
                                </div>
                            </div>
                            <div className="flex-1 truncate">
                                <h4 className="text-xl font-bold truncate leading-tight text-white">{nowPlaying.title}</h4>
                                <p className="text-[#FF5A5F] font-medium text-sm uppercase tracking-wider mb-2">{nowPlaying.artist}</p>
                                <p className="text-white/80 text-xs italic bg-white/10 inline-block px-3 py-1 rounded-full border border-white/5">
                                    For: {nowPlaying.requestedBy || 'Anonymous'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleComplete(nowPlaying.id, true)}
                            className="w-full mt-6 bg-[#FF5A5F] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#FF5A5F]/20"
                        >
                            <CheckCircle size={20} /> Mark as Finished
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-[2.5rem] text-white/30 italic font-medium">
                        No active performance
                    </div>
                )}
            </div>

            {/* LIVE QUEUE MANAGEMENT */}
            <div className="space-y-4">
                <h3 className="text-white/50 text-[10px] font-bold tracking-[0.4em] uppercase ml-4">Up Next ({upNext.length})</h3>
                {upNext.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-4 bg-[#161616] p-4 rounded-3xl border border-white/10 group hover:border-white/20 transition-colors">
                        <span className="text-white/30 font-bold ml-2 w-6 text-lg">{index + 1}</span>
                        <img src={song.albumArtUrl} className="w-14 h-14 rounded-xl object-cover shadow-sm" alt="" />

                        <div className="flex-1 truncate">
                            <p className="font-bold truncate text-sm text-white">{song.title}</p>
                            <p className="text-[#FF5A5F] text-xs truncate uppercase tracking-widest font-medium">{song.artist}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Remove Button */}
                            <button
                                onClick={() => removeRequest(song.id)}
                                className="p-3 text-red-400 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-xl active:scale-90 transition-all border border-red-500/20"
                                title="Remove Request"
                            >
                                <Trash2 size={20} />
                            </button>

                            {/* Mark as Completed Button */}
                            <button
                                onClick={() => toggleComplete(song.id, true)}
                                className="p-3 text-green-400 hover:text-green-200 bg-green-500/10 hover:bg-green-500/20 rounded-xl active:scale-90 transition-all border border-green-500/20"
                            >
                                <CheckCircle size={24} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Admin;