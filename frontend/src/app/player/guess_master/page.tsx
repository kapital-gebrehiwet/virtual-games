"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GuessMasterGame() {
  const [session, setSession] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [revealedNumbers, setRevealedNumbers] = useState<number[]>([]);
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [drawTriggered, setDrawTriggered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [me, setMe] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(() => {
      try {
        const headers = getAuthHeaders();
        fetchSession(headers);
        fetchLobby(headers);
        fetchMyEntries(headers);
      } catch (err) {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isDrawing = session?.status === "finished" || session?.status === "tie_breaker";
    if (isDrawing && session?.drawn_numbers) {
      if (revealedNumbers.length < session.drawn_numbers.length) {
        const timer = setTimeout(() => {
          setRevealedNumbers(prev => [...prev, session.drawn_numbers[prev.length]]);
        }, 500); // Reveal one ball every 500ms
        return () => clearTimeout(timer);
      }
    } else if (revealedNumbers.length > 0 && session?.status === "waiting") {
      setRevealedNumbers([]);
    }
  }, [session, revealedNumbers]);

  useEffect(() => {
    if (session?.expires_in !== undefined) {
       if (timeLeft === null || Math.abs(timeLeft - session.expires_in) > 3) {
         setTimeLeft(session.expires_in);
       }
    }
  }, [session?.expires_in]);

  useEffect(() => {
    if (timeLeft === null || (session?.status !== "waiting" && session?.status !== "tie_breaker")) {
        setDrawTriggered(false);
        return;
    }
    
    if (timeLeft <= 0 && !drawTriggered) {
       setDrawTriggered(true);
       drawNumbers();
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, session?.status, drawTriggered]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      throw new Error("Not authenticated");
    }
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchInitialData = async () => {
    try {
      const headers = getAuthHeaders();
      
      // Get Wallet
      const wRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/wallets/me`, { headers });
      if (wRes.ok) setWallet(await wRes.json());

      // Get Me (User ID) to check for tie-breakers
      const uRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/users/me`, { headers });
      if (uRes.ok) setMe(await uRes.json());

      await fetchSession(headers);
      await fetchMyEntries(headers);
      await fetchLobby(headers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLobby = async (headers: any) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/plugins/guess_master/lobby`, { headers });
      if (res.ok) setLobbyPlayers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSession = async (headers: any) => {
    try {
      const sRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/plugins/guess_master/session`, { headers });
      if (sRes.ok) {
        const data = await sRes.json();
        if (data.status !== "none") {
          setSession(data);
        } else {
          setSession(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyEntries = async (headers: any) => {
    try {
      const eRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/plugins/guess_master/my_entries`, { headers });
      if (eRes.ok) setMyEntries(await eRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else {
      if (selectedNumbers.length < 5) {
        setSelectedNumbers([...selectedNumbers, num]);
      }
    }
  };

  const submitGuess = async () => {
    setError("");
    setSuccess("");
    if (selectedNumbers.length !== 5) {
      setError("You must select exactly 5 numbers.");
      return;
    }

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/plugins/guess_master/submit_guess`, {
        method: "POST",
        headers,
        body: JSON.stringify({ guesses: selectedNumbers })
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess("Guess submitted successfully!");
        setSelectedNumbers([]);
        fetchInitialData();
      } else {
        setError(data.detail || "Failed to submit guess.");
      }
    } catch (err) {
      setError("Network error.");
    }
  };

  const drawNumbers = async () => {
    setError("");
    setSuccess("");
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/plugins/guess_master/draw`, {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (res.ok) {
        fetchInitialData();
      } else {
        if (data.detail === "Draw timer has not expired yet") {
            setTimeout(() => setDrawTriggered(false), 1000);
        } else if (res.status === 404 || (data.detail && data.detail.includes("No active"))) {
            // Someone else triggered the draw and the session is already finished
            fetchInitialData();
        } else {
            setError(data.detail || "Draw failed.");
        }
      }
    } catch (err) {
      setError("Network error.");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading...</div>;

  const isTieBreaker = session?.status === "tie_breaker";
  const amIInTieBreaker = isTieBreaker && me && session.tie_breaker_players.includes(me.id);
  const tieBreakerEntry = myEntries.find(e => e.round === session?.round_number && session?.round_number > 1);
  const alreadySubmitted = !!tieBreakerEntry;
  
  const isDrawingStatus = session?.status === "finished" || session?.status === "tie_breaker";
  const animFinished = isDrawingStatus && session?.drawn_numbers && revealedNumbers.length === session.drawn_numbers.length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 relative z-10">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400 tracking-tight">
            Guess Master
          </h1>
          <p className="text-gray-400 mt-1 font-medium">Pick 5 numbers. Match the most to win the pool!</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 font-medium shadow-inner">
            Balance: <span className="text-emerald-400">{wallet?.balance || 0} PTS</span>
          </div>
          <Link href="/player" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            Back
          </Link>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-8 relative z-10 flex items-center gap-3">
          <span>⚠️</span> {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-8 relative z-10 flex items-center gap-3">
          <span>✅</span> {success}
        </div>
      )}

      {/* Result Banners AFTER animation */}
      {(() => {
        // In tie breaker, the session round is ALREADY incremented, so the previous round is session.round_number - 1
        const checkRound = session?.status === "tie_breaker" ? session?.round_number - 1 : session?.round_number;
        const previousEntries = myEntries.filter(e => e.round === checkRound);
        const iWon = previousEntries.some(e => e.is_winner);
        const isSpectator = previousEntries.length === 0;

        if (!animFinished || isSpectator) return null;

        if (session?.status === "tie_breaker") {
          return amIInTieBreaker ? (
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black p-6 rounded-2xl mb-8 relative z-10 text-center animate-bounce shadow-[0_0_30px_rgba(250,204,21,0.5)]">
              <h2 className="text-3xl font-black mb-2">🔥 IT'S A TIE! 🔥</h2>
              <p className="font-bold">You tied for 1st place! Pick 5 new numbers below for the Tie-Breaker Draw!</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 border border-gray-700 text-gray-300 p-4 rounded-xl mb-8 relative z-10 text-center">
              <p>The game went into a Tie-Breaker, but you didn't make the cut. Better luck next time!</p>
            </div>
          );
        }

        if (session?.status === "finished") {
          const myHighestEntry = previousEntries.reduce((prev, current) => ((prev.matches || 0) > (current.matches || 0)) ? prev : current, { matches: 0, guesses: [] });
          const matchedNums = (myHighestEntry.guesses || []).filter((n: number) => session?.drawn_numbers?.includes(n));
          
          return iWon ? (
            <div className="bg-gradient-to-r from-emerald-400 to-cyan-500 text-black p-6 rounded-2xl mb-8 relative z-10 text-center animate-[bounce_1s_infinite] shadow-[0_0_30px_rgba(16,185,129,0.5)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none rounded-2xl">
                <div className="absolute w-2 h-2 bg-yellow-400 rounded-full top-4 left-10 animate-ping"></div>
                <div className="absolute w-3 h-3 bg-white rounded-full bottom-4 left-1/4 animate-pulse"></div>
                <div className="absolute w-2 h-2 bg-yellow-300 rounded-full top-8 right-1/4 animate-ping"></div>
                <div className="absolute w-4 h-4 bg-emerald-200 rounded-full bottom-6 right-12 animate-pulse"></div>
              </div>
              <h2 className="text-4xl font-black mb-2 relative z-10">🎉 YOU WON! 🎉</h2>
              <p className="font-bold relative z-10 mb-2">Your points have been credited to your wallet.</p>
              <p className="text-sm font-black bg-black/20 inline-block px-4 py-1 rounded-lg relative z-10">Matches: {myHighestEntry.matches || 0} ({matchedNums.join(", ") || "None"})</p>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl mb-8 relative z-10 text-center">
              <h2 className="text-2xl font-bold mb-1">💀 YOU LOST 💀</h2>
              <p className="mb-2">Not enough matches this time.</p>
              <p className="text-sm font-bold bg-red-500/20 inline-block px-4 py-1 rounded-lg">Matches: {myHighestEntry.matches || 0} ({matchedNums.join(", ") || "None"})</p>
            </div>
          );
        }

        return null;
      })()}

      {isTieBreaker && amIInTieBreaker && !alreadySubmitted && animFinished && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 p-6 rounded-2xl mb-8 relative z-10 animate-pulse">
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">🔥 TIE BREAKER ROUND 🔥</h2>
          <p className="text-yellow-200/80">You tied for 1st place! Pick 5 new numbers for FREE to break the tie.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Left Column: Number Picker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Pick Your 5 Numbers</h2>
              <div className="bg-white/5 px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
                Selected: <span className="text-cyan-400">{selectedNumbers.length}/5</span>
              </div>
            </div>

            <div className="grid grid-cols-10 gap-2 mb-8">
              {Array.from({ length: 90 }, (_, i) => i + 1).map(num => {
                const isSelected = selectedNumbers.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    disabled={alreadySubmitted}
                    className={`aspect-square rounded-lg text-sm font-bold transition-all ${
                      isSelected 
                        ? "bg-cyan-500 text-white scale-110 shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
                        : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                    } ${alreadySubmitted ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {num}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-gray-400">
                {selectedNumbers.length > 0 ? (
                  <div className="flex gap-2">
                    {selectedNumbers.map(n => (
                      <span key={n} className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center font-bold text-cyan-300">
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  "Select 5 numbers to place your bet."
                )}
              </div>
              
              <button 
                onClick={submitGuess}
                disabled={selectedNumbers.length !== 5 || alreadySubmitted}
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {alreadySubmitted 
                  ? "Guess Submitted" 
                  : (isTieBreaker && amIInTieBreaker ? "Submit Tie Breaker (FREE)" : "Submit Guess (100 PTS)")}
              </button>
            </div>
          </div>

          {/* Your Entries History */}
          {myEntries.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
              <h2 className="text-xl font-bold mb-4">Your Entries</h2>
              <div className="space-y-3">
                {myEntries.map((e, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                    <div>
                      <span className="text-sm text-gray-500 mr-4">Round {e.round}</span>
                      <div className="inline-flex gap-1 mt-1">
                        {e.guesses.map((n: number, i: number) => {
                          const isMatched = revealedNumbers.includes(n);
                          return (
                            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${isMatched ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                              {n}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      {e.matches > 0 && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-sm font-semibold">
                          {e.matches} Matches
                        </span>
                      )}
                      {e.is_winner && (
                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                          <span>🏆</span> Winner
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Lobby & Draw */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl"></div>
            
            <h2 className="text-xl font-bold mb-2">{session ? `Game #${session.id}` : "Live Lobby"}</h2>
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${session?.status === 'waiting' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                {session ? session.status : "No Active Session"}
              </span>
              {session && (
                <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-md text-gray-300">
                  Round {session.round_number}
                </span>
              )}
            </div>

            <div className="bg-black/50 rounded-2xl p-6 border border-white/5 mb-8 text-center">
              <p className="text-sm text-gray-400 mb-1">Prize Pool</p>
              <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                {(session?.status === "finished" && animFinished) ? 0 : (session?.prize_pool || 0)} <span className="text-xl text-emerald-500">PTS</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">1 Winner: 100%. 2 Winners: 40% each (20% House Cut). 3+ Tie-Breaker!</p>
            </div>

            {lobbyPlayers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 mb-3">Players in Lobby</h3>
                <div className="flex flex-col gap-3">
                  {lobbyPlayers.map((player, idx) => (
                    <div key={idx} className="bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-300">@{player.username}</span>
                        {player.matches > 0 && animFinished && (
                          <span className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-md">
                            {player.matches} Matches
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {player.guesses.map((n: number, i: number) => {
                          const isMatched = revealedNumbers.includes(n);
                          return (
                            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${isMatched ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black shadow-[0_0_10px_rgba(250,204,21,0.6)] scale-110' : 'bg-white/5 border border-white/10 text-gray-500'}`}>
                              {n}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session?.status === "finished" && session?.drawn_numbers?.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 mb-3">Drawn Numbers</h3>
                <div className="flex flex-wrap gap-3 justify-center bg-black/30 p-4 rounded-2xl border border-white/5">
                  {revealedNumbers.map((n: number, i: number) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border border-white/50 flex items-center justify-center text-sm font-black text-black shadow-[0_0_15px_rgba(250,204,21,0.6)] transform hover:scale-110 transition-transform"
                    >
                      {n}
                    </div>
                  ))}
                  {/* Empty placeholders for balls not yet revealed */}
                  {Array.from({ length: session.drawn_numbers.length - revealedNumbers.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-transparent">
                      00
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(session?.status === "waiting" || session?.status === "tie_breaker") && (
              <div className="w-full bg-black/50 border border-white/10 py-6 rounded-xl text-center shadow-inner">
                <p className="text-sm text-gray-400 font-bold mb-2 uppercase tracking-widest">Draw Starts In</p>
                <p className={`text-5xl font-black font-mono ${timeLeft !== null && timeLeft <= 10 ? 'text-red-500 animate-bounce' : 'text-white'}`}>
                  {timeLeft !== null ? formatTime(timeLeft) : "03:00"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

