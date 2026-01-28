import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Minus, CheckCircle, RotateCcw, Ticket, History, PlayCircle, Trash2 } from 'lucide-react';

const Admin = () => {
    const [queue, setQueue] = useState([]);
    const [credits, setCredits] = useState(0);

    useEffect(() => {
        const q = query(collection(db, "queue"), orderBy("timestamp", "desc"));
        const unsubscribeQueue = onSnapshot(q, (snapshot) => {
            setQueue(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const credRef = doc(db, "settings", "global_credits");
        const unsubscribeCredits = onSnapshot(credRef, (snapshot) => {
            if (snapshot.exists()) setCredits(snapshot.data().count);
        });

        return () => { unsubscribeQueue(); unsubscribeCredits(); };
    }, []);

    const adjustCredits = async (amount) => {
        const credRef = doc(db, "settings", "global_credits");
        const newCount = Math.max(0, credits + amount);
        await updateDoc(credRef, { count: newCount });
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
            {/* 1. CREDIT MANAGEMENT */}
            <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 mb-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-white/40 uppercase tracking-widest text-xs font-bold">
                        <Ticket size={16} />
                        <span>System Credits</span>
                    </div>
                    <span className="text-4xl font-serif italic text-[#FF5A5F]">{credits}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => adjustCredits(1)} className="flex items-center justify-center gap-2 bg-[#FF5A5F] py-5 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-[#FF5A5F]/20">
                        <Plus size={20} /> Add 1
                    </button>
                    <button onClick={() => adjustCredits(-1)} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-5 rounded-2xl font-bold active:scale-95 transition-all text-white/60">
                        <Minus size={20} /> Remove 1
                    </button>
                </div>
            </div>

            {/* 2. RECENTLY COMPLETED (Enhanced Visibility) */}
            {completedSongs.length > 0 && (
                <div className="mb-10">
                    <div className="flex items-center gap-2 ml-4 mb-4 text-white/40 uppercase tracking-[0.3em] text-[10px] font-bold">
                        <History size={12} />
                        <span>Recently Completed</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {completedSongs.slice(0, 3).map(song => (
                            <div key={song.id} className="flex-shrink-0 flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                                <img
                                    src={song.albumArtUrl}
                                    className="w-10 h-10 rounded-lg object-cover saturate-[.5]"
                                    alt=""
                                />
                                <div className="max-w-[120px]">
                                    <p className="font-bold text-[11px] text-white/90 truncate">{song.title}</p>
                                </div>
                                <button
                                    onClick={() => toggleComplete(song.id, false)}
                                    className="p-2 text-white/60 hover:text-white bg-white/10 rounded-lg active:scale-90 transition-transform"
                                >
                                    <RotateCcw size={14} />
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
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] p-6 rounded-[2.5rem] border-2 border-[#FF5A5F] shadow-[0_0_30px_rgba(255,90,95,0.15)]">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <img src={nowPlaying.albumArtUrl} className="w-24 h-24 rounded-2xl object-cover shadow-2xl" alt="" />
                                <div className="absolute -bottom-2 -right-2 bg-[#FF5A5F] p-2 rounded-full shadow-lg">
                                    <PlayCircle size={16} className="text-white" />
                                </div>
                            </div>
                            <div className="flex-1 truncate">
                                <h4 className="text-xl font-bold truncate leading-tight">{nowPlaying.title}</h4>
                                <p className="text-[#FF5A5F] font-medium text-sm uppercase tracking-wider mb-2">{nowPlaying.artist}</p>
                                <p className="text-white/40 text-[10px] italic bg-white/5 inline-block px-3 py-1 rounded-full">
                                    For: {nowPlaying.requestedBy || 'Anonymous'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleComplete(nowPlaying.id, true)}
                            className="w-full mt-6 bg-[#FF5A5F] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <CheckCircle size={20} /> Mark as Finished
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-[2.5rem] text-white/10 italic">
                        No active performance
                    </div>
                )}
            </div>

            {/* LIVE QUEUE MANAGEMENT */}
            <div className="space-y-4">
                <h3 className="text-white/20 text-[10px] font-bold tracking-[0.4em] uppercase ml-4">Up Next ({upNext.length})</h3>
                {upNext.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-4 bg-[#111] p-4 rounded-3xl border border-white/5 group">
                        <span className="text-white/10 font-bold ml-2 w-4">{index + 1}</span>
                        <img src={song.albumArtUrl} className="w-14 h-14 rounded-xl object-cover" alt="" />

                        <div className="flex-1 truncate">
                            <p className="font-bold truncate text-sm">{song.title}</p>
                            <p className="text-[#FF5A5F]/60 text-[10px] truncate uppercase tracking-widest">{song.artist}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* NEW: Remove Button */}
                            <button
                                onClick={() => removeRequest(song.id)}
                                className="p-3 text-white/10 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>

                            <button
                                onClick={() => toggleComplete(song.id, true)}
                                className="p-3 text-white/20 hover:text-[#FF5A5F] transition-colors"
                            >
                                <CheckCircle size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Admin;