"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden">
      {/* Background Animated Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-8">
        <div className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          NEXUS<span className="text-white">PTS</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-2 rounded-xl font-medium hover:bg-white/5 transition-colors">
            Log In
          </Link>
          <Link href="/signup" className="px-6 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 font-medium shadow-lg shadow-pink-500/25 transition-all hover:scale-105 active:scale-95 text-white">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          The Next Generation of <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            Points-Based Gaming
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-12">
          Buy, transfer, and redeem points seamlessly. Join live multiplayer Bingo sessions, 
          connect via Telegram, and manage your wallet with zero friction.
        </p>

        <div className="flex gap-6">
          <Link href="/signup" className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
            Start Playing Now
          </Link>
          <a href="#features" className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-md">
            Explore Features
          </a>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 p-8 md:p-24 bg-black/50 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl mb-6">
              🎮
            </div>
            <h3 className="text-xl font-bold mb-4">Live Multiplayer Bingo</h3>
            <p className="text-gray-400">Join real-time bingo rooms with other players. Buy cards with your points and win huge prizes instantly.</p>
          </div>
          
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-6">
              🤖
            </div>
            <h3 className="text-xl font-bold mb-4">Telegram Bot Integration</h3>
            <p className="text-gray-400">Manage your wallet and play games directly from Telegram. Your balance syncs instantly across all platforms.</p>
          </div>
          
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center text-2xl mb-6">
              💸
            </div>
            <h3 className="text-xl font-bold mb-4">Instant Cashier System</h3>
            <p className="text-gray-400">Securely buy points and request redemptions. Our cashier network processes transactions in real-time.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
