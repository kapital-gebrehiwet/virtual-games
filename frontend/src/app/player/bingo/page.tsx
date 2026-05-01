"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BingoGame() {
  const [session, setSession] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchWallet();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      throw new Error("Not authenticated");
    }
    return {
      "Authorization": `Bearer ${token}`
    };
  };

  const fetchWallet = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/wallets/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      } else if (res.status === 401) {
        router.push("/login");
      } else {
        setError("Could not load wallet.");
      }
    } catch (err) {
      // Not authenticated or network error
    } finally {
      setLoading(false);
    }
  };

  const buyCard = async () => {
    setError("");
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/plugins/bingo/buy_card`, {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (res.ok) {
        setCards([...cards, data]);
        fetchWallet(); // Update balance
        if (!session) {
          setSession({ id: data.session_id, drawn_numbers: [] });
        }
      } else {
        setError(data.detail || "Failed to buy card.");
      }
    } catch (err) {
      setError("API Error");
    }
  };

  const drawNumber = async () => {
    if (!session) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/plugins/bingo/draw/${session.id}`, {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (res.ok) {
        setSession({ ...session, drawn_numbers: data.all_drawn });
        if (data.winners.length > 0) {
          alert(`BINGO! Winner IDs: ${data.winners.join(", ")}`);
        }
      } else {
        setError(data.detail);
      }
    } catch (err) {
      setError("API Error");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Bingo Room
          </h1>
          <p className="text-gray-400 mt-1">Live Multiplayer Game</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 font-medium">
            Balance: <span className="text-pink-400">{wallet?.balance || 0} PTS</span>
          </div>
          <Link href="/player" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            Back
          </Link>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl mb-8">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your Cards</h2>
              <button 
                onClick={buyCard}
                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-pink-500/25 transition-all hover:scale-105 active:scale-95"
              >
                Buy Card (50 PTS)
              </button>
            </div>
            
            {cards.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                You haven't bought any cards for this session yet.
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4">
                {cards.map((card, idx) => (
                  <BingoGrid key={idx} grid={card.grid} drawnNumbers={session?.drawn_numbers || []} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Caller</h2>
              {session && (
                <button 
                  onClick={drawNumber}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  Draw Number
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {session?.drawn_numbers?.map((num: number, i: number) => (
                <div key={i} className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/50 flex items-center justify-center font-bold text-pink-300">
                  {num}
                </div>
              ))}
              {(!session || !session.drawn_numbers || session.drawn_numbers.length === 0) && (
                <div className="text-gray-500 text-sm">No numbers drawn yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component to render the 5x5 grid
function BingoGrid({ grid, drawnNumbers }: { grid: any, drawnNumbers: number[] }) {
  const cols = ["B", "I", "N", "G", "O"];
  const drawnSet = new Set([...drawnNumbers, "FREE"]);

  return (
    <div className="bg-[#121212] p-4 rounded-2xl border border-white/10 shadow-xl flex-shrink-0">
      <div className="grid grid-cols-5 gap-2 mb-2">
        {cols.map(c => (
          <div key={c} className="text-center font-black text-xl text-pink-500">{c}</div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, rowIdx) => (
          cols.map(col => {
            const val = grid[col][rowIdx];
            const isDrawn = drawnSet.has(val);
            return (
              <div 
                key={`${col}-${rowIdx}`}
                className={`w-12 h-12 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  isDrawn 
                    ? "bg-pink-500 text-white scale-105 shadow-[0_0_15px_rgba(236,72,153,0.5)]" 
                    : "bg-white/5 text-gray-300 border border-white/10"
                }`}
              >
                {val}
              </div>
            )
          })
        ))}
      </div>
    </div>
  );
}

