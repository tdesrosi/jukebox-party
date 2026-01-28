import React, { useState, useEffect, useRef } from 'react';
import { Filter } from 'bad-words';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronRight } from 'lucide-react'; // KEEP 'X' HERE


const Picker = () => {
    const [songs, setSongs] = useState([]);
    const [genres, setGenres] = useState(["All"]);
    const [activeGenre, setActiveGenre] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSong, setSelectedSong] = useState(null);
    const [userName, setUserName] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const scrollContainerRef = useRef(null);

    const filter = new Filter();

    useEffect(() => {
        axios.get('/api/library')
            .then(res => {
                const libraryData = res.data;
                setSongs(libraryData);
                const uniqueCategories = ["All", ...new Set(libraryData.map(s => s.category).filter(Boolean))];
                setGenres(uniqueCategories);
            });
    }, []);

    const filteredSongs = songs.filter(song => {
        const matchesGenre = activeGenre === "All" || song.category === activeGenre;
        const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGenre && matchesSearch;
    });

    // A basic filter for common obscenities and gibberish patterns
    const validateName = (name) => {
        if (!name) return "";

        // 1. Common Obscenity Filter (Expand this list as needed)
        const isObscene = filter.isProfane(name);

        // 2. Gibberish Detection (Checks for 4+ consecutive consonants or repeated chars)
        const hasGibberish = /([^aeiouy\W]{4,})|(.)\2{4,}/i.test(name);

        // 3. Length Check (Names longer than 30 chars are likely junk)
        const isTooLong = name.length > 30;

        if (isObscene || hasGibberish || isTooLong) {
            console.warn("Input flagged and sanitized.");
            return ""; // Treat as anonymous
        }

        return name;
    };

    const handleRequest = async () => {
        try {
            // Sanitize the name before sending
            const cleanName = validateName(userName.trim());

            await axios.post('/api/request', {
                songId: selectedSong.id,
                userName: cleanName
            });

            setIsModalOpen(false);
            setUserName('');
            // No alert needed for success unless you want one
        } catch (err) {
            alert("No credits remaining! Please see the attendant.");
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-[#0a0a0a] text-white font-sans overflow-y-visible">

            {/* STICKY HEADER */}
            <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/5 px-6 pt-8 pb-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <h1 className="text-3xl font-serif italic text-[#FF5A5F]">Classical Remix</h1>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                            <input
                                type="text"
                                placeholder="Search library..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#FF5A5F]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="relative flex items-center">
                        <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-12 scroll-smooth">
                            {genres.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setActiveGenre(g)}
                                    className={`px-8 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${activeGenre === g ? 'bg-[#FF5A5F] border-[#FF5A5F]' : 'bg-white/5 border-white/10 text-white/40'
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                        <div className="absolute right-0 top-0 bottom-2 w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none flex items-center justify-end">
                            <ChevronRight className="text-white/40 animate-pulse mr-2" />
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

            {/* MODAL WITH HIGH Z-INDEX */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
                    >
                        <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-[#111] border border-white/10 p-10 rounded-[3rem] max-w-md w-full shadow-2xl text-center z-10"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/20 hover:text-white">
                                <X size={24} />
                            </button>
                            {/* ... Rest of modal content ... */}
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
                            <button onClick={handleRequest} className="w-full bg-[#FF5A5F] text-white font-bold rounded-2xl py-5 shadow-lg shadow-[#FF5A5F]/20 active:scale-95 transition-all text-lg">
                                Confirm Request
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Picker;