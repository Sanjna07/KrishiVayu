'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [role, setRole] = useState<'farmer' | 'buyer' | 'public'>('farmer');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    // Store demo session in localStorage
    const sessionData = {
      role,
      name: name.trim() || (role === 'farmer' ? 'Demo Farmer' : role === 'buyer' ? 'Demo Buyer' : 'Public Viewer'),
      identifier: identifier.trim() || 'demo-user',
      loggedInAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('krishivayu_user', JSON.stringify(sessionData));
    }

    setTimeout(() => {
      if (role === 'farmer') {
        router.push('/market/sell');
      } else {
        router.push('/market');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white border border-[#D9DEE5] rounded-xl p-6 sm:p-8 shadow-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-[#1F3A5F] font-bold text-2xl mb-1">
            <span>🌾</span> KrishiVayu
          </Link>
          <h1 className="text-lg font-bold text-[#1B2430]">Portal Role Switcher</h1>
          <p className="text-xs text-[#5B6675] mt-1">
            Simulated demonstration access · No password required
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-8 animate-in fade-in space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#2E7D32] mx-auto animate-bounce" />
            <p className="text-[#1B2430] font-bold">Switching role to {role.toUpperCase()}...</p>
            <p className="text-xs text-[#5B6675]">Redirecting to portal workspace...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5B6675] mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['farmer', 'buyer', 'public'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-2 rounded-md text-xs font-semibold border capitalize transition-colors ${
                      role === r
                        ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-xs'
                        : 'bg-white text-[#5B6675] border-[#D9DEE5] hover:text-[#1B2430]'
                    }`}
                  >
                    {r === 'farmer' ? '🌾 Farmer' : r === 'buyer' ? '🏭 Buyer' : '👁️ Public'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5B6675] mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                placeholder={role === 'farmer' ? 'Gurpreet Singh' : role === 'buyer' ? 'Punjab Biomass Hub' : 'Citizen Observer'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#D9DEE5] rounded-md px-3 py-2 text-xs text-[#1B2430] focus:ring-2 focus:ring-[#1F3A5F] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5B6675] mb-1">
                Mobile / Identifier (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-white border border-[#D9DEE5] rounded-md px-3 py-2 text-xs text-[#1B2430] focus:ring-2 focus:ring-[#1F3A5F] outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1F3A5F] hover:bg-[#162C49] text-white font-semibold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Continue as {role.toUpperCase()}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#E5E9F0] text-center">
          <Link href="/" className="text-xs text-[#1F3A5F] hover:underline font-semibold">
            ← Return to Alert & Match Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
