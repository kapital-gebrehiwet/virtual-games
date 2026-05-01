"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PlayerDashboard() {
  const [wallet, setWallet] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Modal states
  const [showTransfer, setShowTransfer] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  
  // Form states
  const [transferUser, setTransferUser] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/users/me`, { headers });
      if (res.ok) {
        setUserProfile(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchWallet = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/wallets/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/transactions/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/transactions/transfer`, {
        method: "POST",
        headers: getAuthHeaders()!,
        body: JSON.stringify({
          receiver_username: transferUser,
          amount: parseFloat(transferAmount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Successfully transferred ${transferAmount} PTS to @${transferUser}!`);
        setShowTransfer(false);
        setTransferUser("");
        setTransferAmount("");
        fetchWallet();
        fetchTransactions();
      } else {
        setActionError(data.detail || "Transfer failed");
      }
    } catch (err) {
      setActionError("Network error");
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/redemptions/request`, {
        method: "POST",
        headers: getAuthHeaders()!,
        body: JSON.stringify({
          amount: parseFloat(redeemAmount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Successfully requested redemption of ${redeemAmount} PTS. Pending approval.`);
        setShowRedeem(false);
        setRedeemAmount("");
        fetchWallet();
        fetchTransactions();
      } else {
        setActionError(data.detail || "Redemption failed");
      }
    } catch (err) {
      setActionError("Network error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading...</div>;

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === "game_reward" || type === "game_bet") return "🎮";
    if (amount > 0) return "↓";
    return "↑";
  };

  const getTransactionColor = (type: string, amount: number, status: string) => {
    if (status === "pending") return "text-yellow-400 bg-yellow-500/20";
    if (status === "failed" || status === "rejected") return "text-gray-400 bg-gray-500/20";
    if (type === "game_reward" || amount > 0) return "text-green-400 bg-green-500/20";
    return "text-red-400 bg-red-500/20";
  };

  const getTransactionTitle = (type: string, reference_id: string) => {
    if (type === "game_reward") return "Bingo Win!";
    if (type === "game_bet") return "Bingo Card Purchase";
    if (type === "transfer_in") return `Received Transfer`;
    if (type === "transfer_out") return `Sent Transfer`;
    if (type === "redemption") return "Redemption Request";
    if (type === "adjustment") return "Wallet Adjustment";
    return type;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 relative">
      {/* Toast Notifications */}
      {actionSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-green-500/20 border border-green-500/50 text-green-400 px-6 py-3 rounded-2xl z-50 backdrop-blur-md shadow-xl flex items-center gap-3 animate-fade-in-down">
          <span>✅</span> {actionSuccess}
          <button onClick={() => setActionSuccess("")} className="ml-4 hover:text-white">✕</button>
        </div>
      )}

      {actionError && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-3 rounded-2xl z-50 backdrop-blur-md shadow-xl flex items-center gap-3 animate-fade-in-down">
          <span>❌</span> {actionError}
          <button onClick={() => setActionError("")} className="ml-4 hover:text-white">✕</button>
        </div>
      )}

      <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center border border-pink-500/50">
            <span className="text-xl">👤</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
              Player Dashboard
            </h1>
            <p className="text-sm text-gray-400 flex items-center">
              Welcome back{userProfile?.username ? `, @${userProfile.username}` : ''}! 
              <span className="ml-2 px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-xs uppercase tracking-wider font-semibold">
                {userProfile?.role || 'PLAYER'}
              </span>
            </p>
          </div>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          Log Out
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 relative z-10">
        <div className="md:col-span-1 bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-white/10 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div>
            <h2 className="text-lg text-gray-300 mb-2 font-medium">Wallet Balance</h2>
            <p className="text-5xl font-extrabold text-white mb-6">{wallet?.balance || 0} <span className="text-xl text-pink-400 font-medium">PTS</span></p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowTransfer(true)} className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 font-medium">
              Transfer
            </button>
            <button onClick={() => setShowRedeem(true)} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-xl transition-all hover:scale-105 active:scale-95 font-medium shadow-lg shadow-pink-500/25">
              Redeem
            </button>
          </div>
        </div>

        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Games Library</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bingo Game Card */}
            <div className="group relative bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 overflow-hidden hover:border-purple-500/60 transition-all cursor-pointer">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/30 rounded-full blur-xl group-hover:bg-purple-500/50 transition-all"></div>
              <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Bingo</h3>
              <p className="text-sm text-gray-300 mb-6 relative z-10">Live multiplayer drawing. Match 5 and win!</p>
              <Link href="/player/bingo" className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-transform hover:scale-105 shadow-lg shadow-purple-500/25 relative z-10">
                Play Now
              </Link>
            </div>

            {/* Guess Master Game Card */}
            <div className="group relative bg-gradient-to-br from-cyan-500/20 to-emerald-600/20 border border-cyan-500/30 rounded-2xl p-6 overflow-hidden hover:border-cyan-500/60 transition-all cursor-pointer">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/30 rounded-full blur-xl group-hover:bg-cyan-500/50 transition-all"></div>
              <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Guess Master</h3>
              <p className="text-sm text-gray-300 mb-6 relative z-10">Pick 5 numbers. Match the most to win the pool!</p>
              <Link href="/player/guess_master" className="inline-block bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-transform hover:scale-105 shadow-lg shadow-emerald-500/25 relative z-10">
                Play Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Refer Your Friends Section */}
      <div className="grid grid-cols-1 mb-12 relative z-10">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl transform translate-x-1/4 translate-y-1/4 pointer-events-none"></div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-white">🤝 Refer Your Friends</h2>
              <p className="text-gray-300">Invite friends using your unique referral code. When they make their first valid deposit (50+ PTS), you'll automatically receive <strong className="text-pink-400">5 Points</strong> as a reward!</p>
            </div>
            <div className="bg-black/50 border border-white/10 rounded-2xl p-4 min-w-[250px] text-center">
              <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Your Referral Code</p>
              <p className="text-3xl font-mono font-black text-blue-400 tracking-wider select-all">{userProfile?.referral_code || "LOADING..."}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 mb-12 relative z-10">

        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Recent Transactions</h2>
            <button className="text-pink-400 hover:text-pink-300 text-sm font-medium transition-colors">View All</button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {transactions.length === 0 ? (
              <div className="text-gray-500 text-sm italic text-center py-8">
                Your recent transactions will appear here...
              </div>
            ) : (
              transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                const sign = isPositive ? "+" : "";
                
                return (
                  <div key={tx.id} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getTransactionColor(tx.type, tx.amount, tx.status)}`}>
                        {getTransactionIcon(tx.type, tx.amount)}
                      </div>
                      <div>
                        <p className="font-semibold">{getTransactionTitle(tx.type, tx.reference_id)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {tx.status !== 'completed' && <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] uppercase tracking-wider">{tx.status}</span>}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {sign}{parseFloat(tx.amount).toFixed(2)}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Transfer Points</h2>
            <form onSubmit={handleTransfer} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Recipient Username</label>
                <input 
                  type="text" 
                  value={transferUser}
                  onChange={(e) => setTransferUser(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-colors"
                  placeholder="@username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Amount (PTS)</label>
                <input 
                  type="number" 
                  min="1"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-colors"
                  placeholder="e.g. 500"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowTransfer(false)} className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-pink-500/25 transition-all">
                  Send Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redeem Modal */}
      {showRedeem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-2">Redeem Points</h2>
            <p className="text-gray-400 text-sm mb-6">Submit a request to cash out your points. A cashier will review and approve it.</p>
            <form onSubmit={handleRedeem} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Amount (PTS)</label>
                <input 
                  type="number" 
                  min="1"
                  step="0.01"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-colors"
                  placeholder="e.g. 1000"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowRedeem(false)} className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-purple-500/25 transition-all">
                  Request Cashout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

