import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/classical-remix.jpeg';

const Projector = () => {
    const [queue, setQueue] = useState([]);

    useEffect(() => {
        if (!db) return;
        const q = query(
            collection(db, "queue"),
            where("isCompleted", "==", false),
            orderBy("timestamp", "asc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setQueue(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const currentSong = queue.length > 0 ? queue[0] : null;
    const upNext = queue.length > 1 ? queue.slice(1) : [];

    return (
        // "Fixed Inset-0" ensures a true black cinematic background that covers any browser scaling issues
        <div className="fixed inset-0 h-full w-full bg-[#0a0a0a] flex flex-col items-center justify-between py-[5vh] overflow-hidden font-sans select-none text-white">

            {/* TOP LAYER: Logo (Left) and Up Next (Right) are Z-indexed to stay above content */}
            <div className="absolute top-[5vh] w-full px-[5vw] flex justify-between items-start z-20">
                <div className="transition-opacity duration-1000">
                    <img
                        src={logo}
                        className="w-64 opacity-90 rounded-xl shadow-2xl border border-white/10"
                        alt="Classical Remix"
                        key="logo"
                    />
                </div>

                {/* UP NEXT: Positioned Top-Right to clear the center-bottom area for long titles */}
                {upNext.length > 0 && (
                    <div className="w-96 space-y-6">
                        <h3 className="text-white/20 text-sm font-bold tracking-[0.4em] uppercase border-b border-white/10 pb-2">Up Next</h3>
                        <div className="flex flex-col gap-4">
                            <AnimatePresence initial={false}>
                                {upNext.slice(0, 3).map((song, i) => (
                                    <motion.div
                                        key={song.id}
                                        layout // Smoothly slides items up when the current song changes
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.6 }}
                                        className="flex items-center gap-6 bg-white/[0.03] p-4 rounded-3xl border border-white/5 backdrop-blur-md"
                                    >
                                        <img
                                            src={song.albumArtUrl || 'https://via.placeholder.com/150'}
                                            className="w-16 h-16 object-cover rounded-xl shadow-lg"
                                            alt=""
                                        />
                                        <div className="truncate">
                                            <p className="text-white font-bold truncate text-lg">{song.title}</p>
                                            <p className="text-[#FF5A5F] text-xs uppercase tracking-widest truncate">{song.artist}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {/* CENTER: Artwork Zone - Height constrained to prevent vertical overflow */}
            <div className="h-[45vh] flex items-center justify-center mt-[5vh]">
                <AnimatePresence mode="wait">
                    {currentSong && (
                        <motion.div
                            key={`art-${currentSong.id}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                            className="relative h-full aspect-square"
                        >
                            {/* Deep shadow glow specifically for 4K contrast */}
                            <div className="absolute inset-0 bg-black/80 blur-[80px] rounded-full scale-90 translate-y-12 -z-10"></div>
                            <img
                                src={currentSong.albumArtUrl}
                                className="h-full w-full object-cover rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10"
                                alt={currentSong.title}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM: Text and Dedication Zone */}
            <div className="flex-1 flex flex-col items-center justify-center w-full px-[10vw] z-10">
                <AnimatePresence mode="wait">
                    {currentSong ? (
                        <motion.div
                            key={`text-${currentSong.id}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="flex flex-col items-center text-center max-w-[70vw]"
                        >
                            {/* Title and Artist remain the same */}
                            <h1
                                className="font-serif italic text-[#FF5A5F] drop-shadow-md leading-tight mb-4"
                                style={{ fontSize: 'clamp(2.5rem, 7vh, 5.5rem)' }}
                            >
                                {currentSong.title}
                            </h1>

                            <h2 className="text-4xl font-light tracking-[0.5em] text-white/70 uppercase border-t border-white/10 pt-8 mb-12">
                                {currentSong.artist}
                            </h2>

                            {/* CONDITIONAL RENDER: Only show if requestedBy is not empty or "Anonymous" */}
                            {currentSong.requestedBy && currentSong.requestedBy.trim() !== "" && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-4 px-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl"
                                >
                                    <p className="text-2xl text-white/50 italic font-serif">
                                        Requested by <span className="text-white not-italic font-sans font-bold ml-2 uppercase tracking-widest">{currentSong.requestedBy}</span>
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        /* Idle State */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.15 }}
                            className="text-white text-6xl italic font-serif tracking-widest animate-pulse"
                        >
                            Classical Remix Music Festival
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Projector;