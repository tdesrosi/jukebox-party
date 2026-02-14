import React, { useState, useEffect, useRef } from 'react';
import { Filter } from 'bad-words';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Ticket, CreditCard } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { LazyImage } from './LazyImage';


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
    const [contribution, setContribution] = useState("5"); // Store as string for better input handling

    const scrollContainerRef = useRef(null);
    const filter = new Filter();

    // 1. Hardware Authorization Check
    useEffect(() => {
        const deviceSecret = localStorage.getItem('kiosk_secret');
        if (deviceSecret) {
            setIsKiosk(true);
        }
    }, []);

    // 2. Global Credit Listener
    useEffect(() => {
        const credRef = doc(db, "party", "current_state");
        const unsubscribe = onSnapshot(credRef, (snapshot) => {
            if (snapshot.exists()) {
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

    // 4. Robust Payment Status Handling
    // 4. Emergency Payment Handler (Client-Side Queueing)
    useEffect(() => {
        const paymentStatus = searchParams.get('payment');

        if (paymentStatus === 'success') {
            // A. Check for pending request data
            const pendingData = localStorage.getItem('pending_request');

            if (pendingData) {
                const { songId, userName } = JSON.parse(pendingData);

                // B. Fire the request immediately
                axios.post('/api/emergency-request', { songId, userName })
                    .then(() => {
                        setNotification({
                            type: 'success',
                            message: 'Payment verified! Request added to queue.'
                        });
                        // C. Clear storage so we don't duplicate on refresh
                        localStorage.removeItem('pending_request');
                    })
                    .catch(() => {
                        setNotification({
                            type: 'error',
                            message: 'Error queuing song. Please show this to staff.'
                        });
                    });
            } else {
                // Fallback if local storage failed
                setNotification({ type: 'success', message: 'Payment Received' });
            }
        } else if (paymentStatus === 'cancelled') {
            setNotification({
                type: 'error',
                message: 'Payment cancelled.'
            });
        }

        // Cleanup URL
        if (paymentStatus) {
            const timer = setTimeout(() => {
                setSearchParams({}, { replace: true });
            }, 1000); // 1 second delay
            return () => clearTimeout(timer);
        }
    }, [searchParams, setSearchParams]);

    // 5. Notification Auto-Dismiss
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

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

    // 6. Request Handler
    const handleRequest = async () => {
        const cleanName = validateName(userName.trim());

        if (isKiosk) {
            if (credits <= 0) {
                alert("No credits remaining! Please see the attendant.");
                return;
            }

            try {
                await axios.post('/api/request', {
                    songId: selectedSong.id,
                    userName: cleanName
                }, {
                    headers: { 'X-Kiosk-Secret': localStorage.getItem('kiosk_secret') }
                });
                setIsModalOpen(false);
                setUserName('');
            } catch (err) {
                alert("Request failed. Please try again.");
            }
        } else {
            // INDIVIDUAL MODE: Initiate Stripe Flow
            try {
                // 1. SAVE DATA TO PHONE STORAGE BEFORE LEAVING
                localStorage.setItem('pending_request', JSON.stringify({
                    songId: selectedSong.id,
                    userName: cleanName
                }));

                const amountToSend = Math.max(5, parseInt(contribution) || 5) * 100;

                const response = await axios.post('/api/create-checkout-session', {
                    songId: selectedSong.id,
                    userName: cleanName,
                    amount: amountToSend // Use the safe parsed variable
                });

                if (response.data && response.data.url) {
                    window.location.assign(response.data.url);
                }
            } catch (err) {
                alert("Payment system unavailable.");
            }
        }
    };

    return (
        <div className="relative w-full min-h-[100dvh] bg-[#0a0a0a] text-white font-sans overflow-y-visible">
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/10 px-6 pt-8 pb-6">
                <div className="max-w-7xl mx-auto text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-serif italic text-[#FF5A5F]">Classical Remix</h1>
                            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mt-1 font-bold">
                                {isKiosk ? "Kiosk Station" : "Mobile Request"}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search library..."
                                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/40 outline-none focus:border-[#FF5A5F] transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Show credits ONLY if in Kiosk mode */}
                            {isKiosk && (
                                <div className="flex items-center gap-4 bg-white/10 border border-white/20 px-6 py-4 rounded-2xl">
                                    <div className="text-right">
                                        <p className="text-xl font-serif italic text-[#FF5A5F] leading-none">{credits}</p>
                                    </div>
                                    <Ticket className="text-[#FF5A5F]" size={24} />
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
                                    className={`px-8 py-3 rounded-full text-sm font-bold transition-all border ${activeGenre === g ? 'bg-[#FF5A5F] border-[#FF5A5F] text-white' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'}`}
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
                            className="bg-[#111] rounded-[2.5rem] overflow-hidden border border-white/10 cursor-pointer group hover:border-[#FF5A5F]/60 transition-all"
                        >
                            <div className="aspect-square relative overflow-hidden">
                                <LazyImage src={song.albumArtUrl} alt={song.title} />
                            </div>

                            <div className="p-6">
                                <h3 className="font-bold text-sm truncate mb-1 text-white">{song.title}</h3>
                                <p className="text-[#FF5A5F] text-[10px] uppercase tracking-[0.2em] truncate font-medium opacity-80">{song.artist}</p>
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
                        <motion.div className="relative bg-[#111] border border-white/20 p-10 rounded-[3rem] max-w-md w-full shadow-2xl text-center z-10">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl mb-6">
                                    <img src={selectedSong?.albumArtUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <h2 className="text-2xl font-serif italic text-[#FF5A5F] mb-1">{selectedSong?.title}</h2>
                                <p className="text-white/60 uppercase tracking-widest text-xs font-bold">{selectedSong?.artist}</p>
                            </div>

                            <div className="mb-8">
                                <p className="text-white/60 text-sm mb-4">Dedicate this piece? (Optional)</p>
                                <input
                                    autoFocus
                                    className="w-full bg-black border border-white/20 rounded-2xl p-5 text-white outline-none focus:border-[#FF5A5F] text-center text-lg placeholder-white/30"
                                    placeholder="Enter Your Name"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                />
                            </div>

                            {!isKiosk && (
                                <div className="mb-8">
                                    <p className="text-white/60 text-sm mb-4">Support the Festival (Min $5)</p>
                                    <div className="relative max-w-[200px] mx-auto">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF5A5F] font-bold text-xl">$</span>
                                        <input
                                            type="number"
                                            inputMode="numeric" // Helps mobile keyboards show numbers
                                            pattern="[0-9]*"    // improved mobile support
                                            className="w-full bg-black border border-white/20 rounded-2xl p-5 pl-10 text-white outline-none focus:border-[#FF5A5F] text-center text-2xl font-bold"

                                            // 1. Bind strictly to the state
                                            value={contribution}

                                            // 2. Allow ANY number or empty string while typing
                                            onChange={(e) => setContribution(e.target.value)}

                                            // 3. Enforce the minimum ONLY when they are done typing
                                            onBlur={() => {
                                                const val = parseInt(contribution);
                                                if (!val || val < 5) {
                                                    setContribution("5");
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button onClick={handleRequest} className="w-full bg-[#FF5A5F] text-white font-bold rounded-2xl py-5 shadow-lg shadow-[#FF5A5F]/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-3">
                                {isKiosk ? (
                                    <>Confirm Request</>
                                ) : (
                                    <>
                                        <CreditCard size={20} />
                                        Pay & Request
                                    </>
                                )}
                            </button>

                            {!isKiosk && (
                                <p className="text-white/30 text-[10px] uppercase tracking-widest mt-6 font-medium">
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
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className={`fixed top-4 left-0 right-0 mx-auto z-[200] w-[90%] max-w-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border backdrop-blur-xl ${notification.type === 'success'
                            ? 'bg-green-500/10 border-green-500/50 text-green-400'
                            : 'bg-red-500/10 border-red-500/50 text-red-400'
                            }`}
                    >
                        {notification.type === 'success' ? (
                            <div className="flex-shrink-0 w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                        ) : (
                            <X size={20} className="flex-shrink-0" />
                        )}
                        <span className="font-bold text-sm tracking-wide leading-tight">
                            {notification.message}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Picker;