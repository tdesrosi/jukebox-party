import React, { useState, useEffect, useRef } from 'react';
import { Filter } from 'bad-words';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Ticket, CreditCard } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { KIOSK_SECRET } from '../config';


const Picker = () => {
    const [isKiosk, setIsKiosk] = useState(false);
    const [songs, setSongs] = useState([]);
    const [genres, setGenres] = useState(["All"]);
    const [activeGenre, setActiveGenre] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSong, setSelectedSong] = useState(null);
    const [userName, setUserName] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [credits, setCredits] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();
    const [notification, setNotification] = useState(null);

    const scrollContainerRef = useRef(null);
    const filter = new Filter();

    // 1. Hardware Authorization Check
    useEffect(() => {
        const deviceSecret = localStorage.getItem('kiosk_secret');
        // Matches the secret we discussed for your trusted iPads
        if (deviceSecret === KIOSK_SECRET) {
            setIsKiosk(true);
        }
    }, []);

    // 2. Global Credit Listener (Only relevant for Kiosk mode)
    useEffect(() => {
        const credRef = doc(db, "party", "current_state");
        const unsubscribe = onSnapshot(credRef, (snapshot) => {
            if (snapshot.exists()) {
                // Maintained field name: 'credits'
                setCredits(snapshot.data().credits);
            }
        });
        return () => unsubscribe();
    }, []);

    // 3. Fetch Library
    useEffect(() => {
        axios.get('/api/library')
            .then(res => {
                const libraryData = res.data;
                setSongs(libraryData);
                const uniqueCategories = ["All", ...new Set(libraryData.map(s => s.category).filter(Boolean))];
                setGenres(uniqueCategories);
            });
    }, []);

    // 4. Payment Status Handling
    useEffect(() => {
        const paymentStatus = searchParams.get('payment');

        if (paymentStatus === 'success') {
            setNotification({
                type: 'success',
                message: 'Payment received! Your request is in the queue.'
            });
            // Clean the URL
            setSearchParams({}, { replace: true });
        } else if (paymentStatus === 'cancelled') {
            setNotification({
                type: 'error',
                message: 'Payment cancelled. Your request was not submitted.'
            });
            setSearchParams({}, { replace: true });
        }

        // Auto-hide notification after 5 seconds
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, notification, setSearchParams]);

    const filteredSongs = songs.filter(song => {
        const matchesGenre = activeGenre === "All" || song.category === activeGenre;
        const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGenre && matchesSearch;
    });

    const validateName = (name) => {
        if (!name) return "";
        const isObscene = filter.isProfane(name);
        const hasGibberish = /([^aeiouy\W]{4,})|(.)\2{4,}/i.test(name);
        const isTooLong = name.length > 30;
        if (isObscene || hasGibberish || isTooLong) return "";
        return name;
    };

    // 4. Dual-Mode Request Handler
    const handleRequest = async () => {
        const cleanName = validateName(userName.trim());

        if (isKiosk) {
            // KIOSK MODE: Check the physical ticket pool
            if (credits <= 0) {
                alert("No credits remaining! Please see the attendant.");
                return;
            }

            try {
                await axios.post('/api/request', {
                    songId: selectedSong.id,
                    userName: cleanName
                }, {
                    headers: { 'X-Kiosk-Secret': KIOSK_SECRET }
                });
                setIsModalOpen(false);
                setUserName('');
            } catch (err) {
                alert("Request failed. Please try again.");
            }
        } else {
            // INDIVIDUAL MODE: Initiate Stripe Flow
            try {
                const response = await axios.post('/api/create-checkout-session', {
                    songId: selectedSong.id,
                    userName: cleanName
                });
                // Redirect guest to Stripe Checkout
                if (response.data && response.data.url) {
                    window.location.href = response.data.url;
                } else {
                    console.error("The backend didn't send a URL property.", response.data);
                }
            } catch (err) {
                alert("Payment system unavailable. Please use the kiosk.");
            }
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-[#0a0a0a] text-white font-sans overflow-y-visible">
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/5 px-6 pt-8 pb-6">
                <div className="max-w-7xl mx-auto text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-serif italic text-[#FF5A5F]">Classical Remix</h1>
                            <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] mt-1">
                                {isKiosk ? "Kiosk Station" : "Mobile Request"}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search library..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#FF5A5F]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Show credits ONLY if in Kiosk mode */}
                            {isKiosk && (
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
                                    <div className="text-right">
                                        <p className="text-xl font-serif italic text-[#FF5A5F] leading-none">{credits}</p>
                                    </div>
                                    <Ticket className="text-[#FF5A5F]/50" size={24} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative flex items-center">
                        <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-12 scroll-smooth">
                            {genres.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setActiveGenre(g)}
                                    className={`px-8 py-3 rounded-full text-sm font-bold transition-all border ${activeGenre === g ? 'bg-[#FF5A5F] border-[#FF5A5F]' : 'bg-white/5 border-white/10 text-white/40'}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SONG GRID */}
            <div className="relative max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    {filteredSongs.map(song => (
                        <motion.div
                            key={song.id}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => { setSelectedSong(song); setIsModalOpen(true); }}
                            className="bg-[#111] rounded-[2.5rem] overflow-hidden border border-white/5 cursor-pointer group hover:border-[#FF5A5F]/40 transition-all"
                        >
                            <div className="aspect-square relative overflow-hidden bg-gray-900">
                                <img src={song.albumArtUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-sm truncate mb-1">{song.title}</h3>
                                <p className="text-[#FF5A5F] text-[10px] uppercase tracking-[0.2em] truncate opacity-70">{song.artist}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* REQUEST MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                        <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
                        <motion.div className="relative bg-[#111] border border-white/10 p-10 rounded-[3rem] max-w-md w-full shadow-2xl text-center z-10">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/20 hover:text-white">
                                <X size={24} />
                            </button>

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-32 h-32 rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-6">
                                    <img src={selectedSong?.albumArtUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <h2 className="text-2xl font-serif italic text-[#FF5A5F] mb-1">{selectedSong?.title}</h2>
                                <p className="text-white/40 uppercase tracking-widest text-xs">{selectedSong?.artist}</p>
                            </div>

                            <div className="mb-8">
                                <p className="text-white/60 text-sm mb-4">Dedicate this piece? (Optional)</p>
                                <input
                                    autoFocus
                                    className="w-full bg-black border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#FF5A5F] text-center text-lg"
                                    placeholder="Enter Your Name"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                />
                            </div>

                            <button onClick={handleRequest} className="w-full bg-[#FF5A5F] text-white font-bold rounded-2xl py-5 shadow-lg shadow-[#FF5A5F]/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3">
                                {isKiosk ? (
                                    <>Confirm Request</>
                                ) : (
                                    <>
                                        <CreditCard size={20} />
                                        Pay & Request ($5)
                                    </>
                                )}
                            </button>

                            {!isKiosk && (
                                <p className="text-white/20 text-[10px] uppercase tracking-widest mt-6">
                                    Processed securely via Stripe
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 20, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${notification.type === 'success'
                            ? 'bg-green-500/10 border-green-500/50 text-green-400'
                            : 'bg-red-500/10 border-red-500/50 text-red-400'
                            } backdrop-blur-xl`}
                    >
                        {notification.type === 'success' ? (
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        ) : (
                            <X size={18} />
                        )}
                        <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Picker;