"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"users" | "transactions" | "mint">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Mint Points Form States
  const [mintUsername, setMintUsername] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        router.push("/login");
        return;
      }
      
      if (activeTab === "users") {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/admin/users`, { headers });
        if (res.ok) setUsers(await res.json());
        else if (res.status === 401 || res.status === 403) router.push("/login");
      } else if (activeTab === "transactions") {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/admin/transactions?limit=100`, { headers });
        if (res.ok) setTransactions(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError("");
      setActionSuccess("");
      const headers = getAuthHeaders();
      if (!headers) return;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/admin/mint`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          username: mintUsername,
          amount: parseFloat(mintAmount)
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setActionSuccess(`Successfully minted ${mintAmount} PTS to @${mintUsername}!`);
        setMintUsername("");
        setMintAmount("");
        // If we are on users tab, refresh the balances
        if (activeTab === "users") fetchData();
      } else {
        setActionError(data.detail || "Failed to mint points");
      }
    } catch (err) {
      setActionError("Network error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
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

      <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/50">
            <span className="text-xl">👑</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
              System Administrator
            </h1>
            <p className="text-sm text-gray-400">Manage Platform & Economy</p>
          </div>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          Log Out
        </button>
      </header>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'users' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
        >
          Users
        </button>
        <button 
          onClick={() => setActiveTab("transactions")}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'transactions' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
        >
          System Transactions
        </button>
        <button 
          onClick={() => setActiveTab("mint")}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'mint' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
        >
          Mint Points
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-full text-gray-500">Loading data...</div>
        ) : (
          <>
            {/* USERS TAB */}
            {activeTab === "users" && (
              <div>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  Platform Users
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-1 rounded-full">{users.length}</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-sm">
                        <th className="py-4 px-4 font-medium">Username</th>
                        <th className="py-4 px-4 font-medium">Role</th>
                        <th className="py-4 px-4 font-medium">Wallet Balance</th>
                        <th className="py-4 px-4 font-medium">Joined At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-medium text-amber-300">@{user.username}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs uppercase tracking-wider ${
                              user.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              user.role === 'cashier' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-white">{user.balance.toFixed(2)} PTS</td>
                          <td className="py-4 px-4 text-sm text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === "transactions" && (
              <div>
                <h2 className="text-xl font-semibold mb-6">System Transactions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-sm">
                        <th className="py-4 px-4 font-medium">ID</th>
                        <th className="py-4 px-4 font-medium">Wallet ID</th>
                        <th className="py-4 px-4 font-medium">Type</th>
                        <th className="py-4 px-4 font-medium">Amount</th>
                        <th className="py-4 px-4 font-medium">Status</th>
                        <th className="py-4 px-4 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-gray-400 text-sm">#{tx.id}</td>
                          <td className="py-4 px-4 text-gray-300">W-{tx.wallet_id}</td>
                          <td className="py-4 px-4">
                            <span className="bg-white/10 px-2 py-1 rounded text-xs">{tx.type}</span>
                          </td>
                          <td className={`py-4 px-4 font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{parseFloat(tx.amount).toFixed(2)}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-xs ${tx.status === 'completed' ? 'text-green-400' : tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-400">{new Date(tx.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MINT TAB */}
            {activeTab === "mint" && (
              <div className="max-w-md">
                <h2 className="text-2xl font-bold mb-2">Mint Points</h2>
                <p className="text-gray-400 text-sm mb-8">
                  Create points out of thin air and deposit them directly into a user's wallet. Usually used to restock Cashiers.
                </p>
                <form onSubmit={handleMint} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Target Username</label>
                    <input 
                      type="text" 
                      value={mintUsername}
                      onChange={(e) => setMintUsername(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors"
                      placeholder="@cashier_username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Amount (PTS)</label>
                    <input 
                      type="number" 
                      min="1"
                      step="0.01"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors"
                      placeholder="e.g. 50000"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-amber-500/25 transition-all">
                    Mint Points
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

