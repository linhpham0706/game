import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, Timer, Users, Play, Settings2, User, X, Volume2, VolumeX, Music } from 'lucide-react';

// Game constants
const ALL_ICONS = [
  "🍎", "🐶", "🚗", "🎈", "🍕", "🚀", "🎸", "🌈", 
  "🍦", "🍔", "🚲", "🎮", "⚽", "🐱", "🦁", "🐼",
  "🍓", "🍩", "🛸", "🎨", "🎭", "🎪", "🎬", "🎤",
  "🎧", "🎹", "🎷", "🎺", "🎻", "🥁", "🏰", "🌋"
];

const PLAYER_COLORS = [
  { name: 'Neon Rose', bg: 'bg-[#FF2D55]', text: 'text-[#FF2D55]', border: 'border-[#FF2D55]', shadow: 'shadow-[#FF2D55]/40', glow: 'drop-shadow-[0_0_8px_rgba(255,45,85,0.6)]' },
  { name: 'Electric Blue', bg: 'bg-[#007AFF]', text: 'text-[#007AFF]', border: 'border-[#007AFF]', shadow: 'shadow-[#007AFF]/40', glow: 'drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' },
  { name: 'Vibrant Green', bg: 'bg-[#34C759]', text: 'text-[#34C759]', border: 'border-[#34C759]', shadow: 'shadow-[#34C759]/40', glow: 'drop-shadow-[0_0_8px_rgba(52,199,89,0.6)]' },
  { name: 'Bright Orange', bg: 'bg-[#FF9500]', text: 'text-[#FF9500]', border: 'border-[#FF9500]', shadow: 'shadow-[#FF9500]/40', glow: 'drop-shadow-[0_0_8px_rgba(255,149,0,0.6)]' },
];

type Difficulty = 'easy' | 'medium' | 'hard';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
  color: string;
}

interface Player {
  id: number;
  score: number;
  color: typeof PLAYER_COLORS[0];
}

export default function App() {
  // Game State
  const [gameStatus, setGameStatus] = useState<'menu' | 'playing' | 'won'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [playerCount, setPlayerCount] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(false);
  
  // Playing State
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<Difficulty>('easy');
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard
      .filter(entry => entry.difficulty === leaderboardTab)
      .sort((a, b) => a.time - b.time)
      .slice(0, 10);
  }, [leaderboard, leaderboardTab]);

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    setLeaderboardError(null);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch leaderboard');
      }
      const data = await res.json();
      setLeaderboard(data);
    } catch (e: any) {
      console.error("Failed to fetch leaderboard", e);
      setLeaderboardError(e.message);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const saveScore = async (name: string, time: number) => {
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          time,
          difficulty,
          date: new Date().toISOString()
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save score');
      }
      
      fetchLeaderboard();
    } catch (e: any) {
      console.error("Failed to save score", e);
      // Optional: show a non-blocking toast or alert
    }
  };

  // Audio Context Ref
  const audioCtx = useRef<AudioContext | null>(null);
  const bgMusicNode = useRef<OscillatorNode | null>(null);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  };

  const playSound = (type: 'flip' | 'match' | 'win' | 'fail' | 'start') => {
    if (isMuted || !audioCtx.current) return;
    
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    
    const now = audioCtx.current.currentTime;

    switch (type) {
      case 'start':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'flip':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'match':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'fail':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'win':
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.15);
        osc.frequency.setValueAtTime(783.99, now + 0.3);
        osc.frequency.setValueAtTime(1046.50, now + 0.45);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
    }
  };

  const toggleMusic = () => {
    initAudio();
    if (isMusicOn) {
      bgMusicNode.current?.stop();
      bgMusicNode.current = null;
      setIsMusicOn(false);
    } else {
      if (!audioCtx.current) return;
      
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, audioCtx.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(115, audioCtx.current.currentTime + 4);
      osc.frequency.exponentialRampToValueAtTime(110, audioCtx.current.currentTime + 8);
      
      gain.gain.setValueAtTime(0.02, audioCtx.current.currentTime);
      
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      
      osc.start();
      bgMusicNode.current = osc;
      setIsMusicOn(true);
    }
  };

  const gridConfig = useMemo(() => {
    switch (difficulty) {
      case 'easy': return { cols: 4, pairs: 8 };
      case 'medium': return { cols: 6, pairs: 18 };
      case 'hard': return { cols: 8, pairs: 32 };
      default: return { cols: 4, pairs: 8 };
    }
  }, [difficulty]);

  // Shuffle logic
  const initGame = useCallback(() => {
    initAudio();
    playSound('start');
    const numPairs = gridConfig.pairs;
    const selectedIcons = ALL_ICONS.slice(0, numPairs);
    const initialCards = [...selectedIcons, ...selectedIcons];
    
    const shuffled = initialCards
      .sort(() => Math.random() - 0.5)
      .map((value, index) => {
        const iconIndex = ALL_ICONS.indexOf(value);
        const colors = [
          'bg-rose-500/20 border-rose-500/50 text-rose-400',
          'bg-blue-500/20 border-blue-500/50 text-blue-400',
          'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
          'bg-amber-500/20 border-amber-500/50 text-amber-400',
          'bg-purple-500/20 border-purple-500/50 text-purple-400',
          'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
          'bg-pink-500/20 border-pink-500/50 text-pink-400',
          'bg-indigo-500/20 border-indigo-500/50 text-indigo-400',
          'bg-teal-500/20 border-teal-500/50 text-teal-400',
          'bg-orange-500/20 border-orange-500/50 text-orange-400',
        ];
        return {
          id: index,
          value,
          isFlipped: false,
          isMatched: false,
          color: colors[iconIndex % colors.length]
        };
      });

    const initialPlayers = Array.from({ length: playerCount }).map((_, i) => ({
      id: i,
      score: 0,
      color: PLAYER_COLORS[i],
    }));

    setCards(shuffled);
    setPlayers(initialPlayers);
    setFlippedCards([]);
    setCurrentPlayerIndex(0);
    setTotalMatches(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameStatus('playing');
  }, [gridConfig, playerCount]);

  // Timer logic
  useEffect(() => {
    let interval: number;
    if (gameStatus === 'playing' && startTime) {
      interval = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStatus, startTime]);

  // Handle card click
  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || cards[id].isFlipped || cards[id].isMatched || gameStatus !== 'playing') return;

    playSound('flip');
    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      checkMatch(newFlipped);
    }
  };

  // Check for match
  const checkMatch = (flipped: number[]) => {
    const [first, second] = flipped;
    if (cards[first].value === cards[second].value) {
      // Match found
      setTimeout(() => {
        playSound('match');
        const newCards = [...cards];
        newCards[first].isMatched = true;
        newCards[second].isMatched = true;
        setCards(newCards);
        setFlippedCards([]);
        
        // Update player score
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex].score += 1;
        setPlayers(newPlayers);

        const newTotalMatches = totalMatches + 1;
        setTotalMatches(newTotalMatches);
        
        if (newTotalMatches === gridConfig.pairs) {
          playSound('win');
          setGameStatus('won');
          // Save score if single player
          if (playerCount === 1) {
            saveScore(`Player ${players[0].id + 1}`, elapsedTime);
          }
        }
      }, 500);
    } else {
      // No match
      setTimeout(() => {
        playSound('fail');
        const newCards = [...cards];
        newCards[first].isFlipped = false;
        newCards[second].isFlipped = false;
        setCards(newCards);
        setFlippedCards([]);
        
        // Next player's turn
        setCurrentPlayerIndex((prev) => (prev + 1) % playerCount);
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const winners = useMemo(() => {
    if (gameStatus !== 'won') return [];
    const maxScore = Math.max(...players.map(p => p.score));
    return players.filter(p => p.score === maxScore);
  }, [gameStatus, players]);

  return (
    <div className="h-screen bg-[#0F172A] text-slate-200 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden flex flex-col">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {gameStatus === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex items-center justify-center p-4 relative z-10"
          >
            <div className="w-full max-w-lg bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] shadow-2xl p-6 md:p-8 border border-slate-800/50">
              <div className="text-center mb-6">
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="inline-block mb-3"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-4 ring-white/10">
                    <Trophy className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </motion.div>
                <h1 className="text-4xl font-black tracking-tighter text-white mb-1 italic">
                  MEMORY<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">MASTER</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[7px]">Neural Interface v2.1</p>
              </div>

              <div className="space-y-6">
                {/* Player Count Selection */}
                <section>
                  <div className="flex items-center justify-between mb-2 px-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3 h-3" />
                      <h2 className="text-[9px] font-bold uppercase tracking-wider">Players</h2>
                    </div>
                    <span className="text-indigo-400 font-black text-[10px]">{playerCount} Active</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => { initAudio(); setPlayerCount(num); }}
                        className={`py-2.5 rounded-xl font-black transition-all duration-300 border-2 ${
                          playerCount === num 
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105' 
                            : 'bg-slate-800/50 border-transparent text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Difficulty Selection */}
                <section>
                  <div className="flex items-center justify-between mb-2 px-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Settings2 className="w-3 h-3" />
                      <h2 className="text-[9px] font-bold uppercase tracking-wider">Difficulty</h2>
                    </div>
                    <span className="text-pink-400 font-black text-[10px] uppercase">{difficulty}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => { initAudio(); setDifficulty(level); }}
                        className={`py-2.5 rounded-xl font-black capitalize transition-all duration-300 border-2 ${
                          difficulty === level 
                            ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)] scale-105' 
                            : 'bg-slate-800/50 border-transparent text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={toggleMusic}
                      className={`p-3 rounded-xl transition-all ${isMusicOn ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-400'}`}
                    >
                      <Music className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowLeaderboard(true)}
                      className="p-3 bg-slate-800/50 rounded-xl text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <Trophy className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={initGame}
                    className="w-full py-3 bg-white text-slate-900 rounded-xl font-black text-base uppercase tracking-tight shadow-2xl hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Launch
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameStatus === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col p-4 relative z-10"
          >
            {/* Compact Header */}
            <div className="w-full max-w-5xl mx-auto flex justify-between items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setGameStatus('menu')}
                  className="group p-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
                >
                  <X className="w-4 h-4 text-slate-500 group-hover:text-rose-500" />
                </button>
                <div className="flex flex-col items-start">
                  <h2 className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase italic leading-none mb-1">In Session</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-indigo-400 leading-none drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">
                      {formatTime(elapsedTime)}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600">{difficulty}</span>
                  </div>
                </div>
              </div>

              {/* Player Scores */}
              <div className="flex gap-1.5">
                {players.map((player, idx) => (
                  <motion.div
                    key={player.id}
                    animate={{ 
                      scale: currentPlayerIndex === idx ? 1.05 : 1,
                    }}
                    className={`px-2 py-1.5 rounded-lg border flex items-center gap-2 transition-all duration-300 ${
                      currentPlayerIndex === idx 
                        ? `${player.color.border} bg-slate-800/80 text-white ${player.color.shadow}` 
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${player.color.bg} text-white`}>
                      <User className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-base font-black leading-none">{player.score}</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-800/50">
                <span className="text-base font-black text-white">{totalMatches}</span>
                <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${(totalMatches / gridConfig.pairs) * 100}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-600">{gridConfig.pairs}</span>
              </div>
            </div>

            {/* Grid Container - Dynamic Sizing with Scroll Fallback */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar px-2 py-4">
              <div 
                className="grid gap-1 md:gap-1.5 w-full max-w-full mx-auto content-center"
                style={{ 
                  gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                  maxWidth: difficulty === 'hard' ? '680px' : difficulty === 'medium' ? '480px' : '380px',
                }}
              >
                {cards.map((card) => (
                  <motion.div
                    key={card.id}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.1}
                    whileDrag={{ scale: 1.1, zIndex: 50 }}
                    className={`relative cursor-pointer aspect-square perspective-1000 transition-all duration-500 ${card.isMatched ? 'opacity-0 pointer-events-none scale-50' : 'opacity-100'}`}
                    onClick={() => handleCardClick(card.id)}
                  >
                    <motion.div
                      className="w-full h-full relative preserve-3d"
                      initial={false}
                      animate={{ rotateY: card.isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 25 }}
                    >
                      {/* Front */}
                      <div className="absolute inset-0 backface-hidden bg-slate-800 rounded-md md:rounded-lg flex items-center justify-center shadow-lg border border-slate-700/50 overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
                        <div className="text-slate-600 text-[10px] md:text-xs font-black group-hover:text-indigo-400 transition-all">?</div>
                      </div>

                      {/* Back */}
                      <div 
                        className={`absolute inset-0 backface-hidden rotate-y-180 rounded-md md:rounded-lg flex items-center justify-center text-2xl md:text-3xl shadow-xl border-2 ${card.color}`}
                      >
                        <span className="drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-110 md:scale-125">{card.value}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {gameStatus === 'won' && (
          <motion.div
            key="won"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 p-6 md:p-10 rounded-[3rem] max-w-xl w-full text-center shadow-[0_0_100px_rgba(99,102,241,0.2)] border border-slate-800 relative overflow-hidden"
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/20 rotate-12">
                <Trophy className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic mb-1">
                {winners.length > 1 ? "STALEMATE!" : `PLAYER ${winners[0].id + 1} WINS!`}
              </h2>
              <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[8px] mb-8">Neural Sync Complete</p>

              <div className="grid gap-2 mb-6 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                {players.sort((a, b) => b.score - a.score).map((player, idx) => (
                  <div 
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      winners.some(w => w.id === player.id) 
                        ? `${player.color.border} bg-slate-800/50` 
                        : 'bg-slate-900/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs ${player.color.bg}`}>
                        {idx + 1}
                      </div>
                      <div className="text-left">
                        <span className="block text-[7px] font-black uppercase tracking-widest text-slate-500">Player {player.id + 1}</span>
                        <span className="text-xs font-black text-white">{player.score === winners[0].score ? 'Champion' : 'Contender'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-white">{player.score}</span>
                      <span className="text-[7px] font-black uppercase text-slate-500 ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setGameStatus('menu')}
                  className="flex-1 py-3.5 bg-slate-800 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-rose-500 hover:text-white transition-all"
                >
                  Thoát Game
                </button>
                <button
                  onClick={initGame}
                  className="flex-1 py-3.5 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl hover:bg-indigo-500 hover:text-white transition-all"
                >
                  Chơi Tiếp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  Top Scores
                </h2>
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Difficulty Tabs */}
              <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl mb-6">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setLeaderboardTab(level)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      leaderboardTab === level 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {isLoadingLeaderboard ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Syncing Data...</p>
                  </div>
                ) : leaderboardError ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-rose-400 text-sm font-bold mb-2">Connection Error</p>
                    <p className="text-slate-500 text-[10px] leading-relaxed mb-4">{leaderboardError}</p>
                    <button 
                      onClick={fetchLeaderboard}
                      className="px-4 py-2 bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:bg-slate-700 transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                ) : filteredLeaderboard.length === 0 ? (
                  <p className="text-center text-slate-500 py-12 italic text-sm">No scores for {leaderboardTab} mode yet.</p>
                ) : (
                  filteredLeaderboard.map((entry, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30 hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs ${
                          i === 0 ? 'bg-amber-400 text-amber-900 shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 
                          i === 1 ? 'bg-slate-300 text-slate-900 shadow-[0_0_15px_rgba(203,213,225,0.4)]' :
                          i === 2 ? 'bg-amber-700 text-amber-100 shadow-[0_0_15px_rgba(180,83,9,0.4)]' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-bold text-sm">{entry.name}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider">{new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-mono font-black text-indigo-400">{formatTime(entry.time)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
