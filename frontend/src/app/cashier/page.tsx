"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CashierDashboard() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  
  // Sell Points Modal States
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellUsername, setSellUsername] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        router.push("/login");
        return;
      }
      
      // Fetch Pending Redemptions
      const redemptionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/redemptions/pending`, { headers });
      if (redemptionsRes.ok) {
        const redemptionsData = await redemptionsRes.json();
        setRedemptions(redemptionsData);
      } else if (redemptionsRes.status === 401 || redemptionsRes.status === 403) {
        router.push("/login");
        return;
      }

      // Fetch Cashier Wallet
      const walletRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/wallets/me`, { headers });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData);
      }

      // Fetch User Profile
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/users/me`, { headers });
      if (userRes.ok) {
        setUserProfile(await userRes.json());
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: "approve" | "reject") => {
    try {
      setActionError("");
      setActionSuccess("");
      const headers = getAuthHeaders();
      if (!headers) return;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/redemptions/${id}/${action}`, {
        method: "POST",
        headers
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setActionSuccess(`Redemption request ${action}d successfully!`);
        fetchData();
      } else {
        setActionError(data.detail || `Failed to ${action} request`);
      }
    } catch (err) {
      setActionError("Network error");
    }
  };

  const handleSellPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError("");
      setActionSuccess("");
      const headers = getAuthHeaders();
      if (!headers) return;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/transactions/transfer`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          receiver_username: sellUsername,
          amount: parseFloat(sellAmount)
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setActionSuccess(`Successfully sold ${sellAmount} PTS to @${sellUsername}!`);
        setShowSellModal(false);
        setSellUsername("");
        setSellAmount("");
        fetchData();
      } else {
        setActionError(data.detail || `Failed to sell points`);
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

      <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/50">
            <span className="text-xl">💳</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              Cashier Portal
            </h1>
            <p className="text-sm text-gray-400 flex items-center">
              Welcome back{userProfile?.username ? `, @${userProfile.username}` : ''}! 
              <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs uppercase tracking-wider font-semibold">
                {userProfile?.role || 'CASHIER'}
              </span>
            </p>
          </div>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          Log Out
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-1 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-white/10 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div>
            <h2 className="text-lg text-gray-300 mb-2 font-medium">Cashier Wallet Balance</h2>
            <p className="text-5xl font-extrabold text-white mb-6">{wallet?.balance || 0} <span className="text-xl text-blue-400 font-medium">PTS</span></p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowSellModal(true)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl transition-all hover:scale-105 active:scale-95 font-medium shadow-lg shadow-blue-500/25">
              Sell Points
            </button>
          </div>
        </div>

        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
            Pending Redemptions
            <span className="bg-pink-500 text-xs px-2 py-1 rounded-full">{redemptions.length}</span>
          </h2>
          
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm">
                  <th className="py-4 px-4 font-medium">User</th>
                  <th className="py-4 px-4 font-medium">Amount (PTS)</th>
                  <th className="py-4 px-4 font-medium">Requested At</th>
                  <th className="py-4 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 italic">
                      No pending redemptions at the moment.
                    </td>
                  </tr>
                ) : (
                  redemptions.map((req) => (
                    <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-medium text-blue-300">@{req.username}</td>
                      <td className="py-4 px-4 font-bold text-white">{req.amount.toFixed(2)}</td>
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {new Date(req.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => handleAction(req.id, "reject")}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl transition-colors text-sm font-medium"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, "approve")}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 rounded-xl transition-colors text-sm font-medium"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sell Points Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-2">Sell Points</h2>
            <p className="text-gray-400 text-sm mb-6">Transfer points from your Cashier wallet to a player.</p>
            <form onSubmit={handleSellPoints} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Player Username</label>
                <input 
                  type="text" 
                  value={sellUsername}
                  onChange={(e) => setSellUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
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
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. 1000"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowSellModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all">
                  Sell & Credit Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

