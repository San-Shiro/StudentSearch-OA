'use client';

import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { Search, User, MapPin, Hash, AlertCircle, ShieldCheck } from 'lucide-react';

// --- Types ---

interface Student {
  name: string;
  roll: string;
  hometown: string;
}

interface TurnstileProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onExpire: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

// Extend the Window interface to include Cloudflare's Turnstile global
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

// --- Custom Turnstile Component ---

function Turnstile({ siteKey, onSuccess, onExpire, theme = 'light' }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    // 1. Check if script is already present
    let script = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]') as HTMLScriptElement | null;
    
    // 2. Define render function
    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetId.current) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          callback: (token: string) => onSuccess(token),
          'expired-callback': () => onExpire(),
        });
      }
    };

    // 3. Load script if not present
    if (!script) {
      script = document.createElement('script');
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => renderWidget();
    } else if (window.turnstile) {
      // Script already loaded
      renderWidget();
    }

    return () => {
      // Cleanup
      if (window.turnstile && widgetId.current) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey, onSuccess, onExpire, theme]);

  return <div ref={containerRef} className="min-h-[65px]" />;
}

// --- Main Application ---

export default function StudentSearch() {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  
  // Updated with your specific Worker URL
  const WORKER_URL = 'https://studentsearch-oa.ketan-saini62.workers.dev';

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    if (!token) {
      setError('Verifying security... please wait a moment.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setHasSearched(true);

    try {
      const res = await fetch(`${WORKER_URL}?id=${encodeURIComponent(query)}`, {
        headers: {
            'x-turnstile-token': token
        }
      });
      
      if (res.status === 403 || res.status === 401) {
          setToken(null);
          throw new Error('Security check failed or token expired. Please retry.');
      }

      if (!res.ok) throw new Error('Failed to connect to search service');
      
      const str = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(str, "text/xml");
      const employees = xmlDoc.getElementsByTagName("employee");

      const parsedData: Student[] = Array.from(employees).map(emp => ({
        name: emp.querySelector('firstName')?.textContent || 'Unknown',
        roll: emp.querySelector('rollno')?.textContent || 'N/A',
        hometown: emp.querySelector('Home_town')?.textContent || 'N/A',
      }));

      setResults(parsedData);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
            NEXUS SEARCH
          </h1>
          <p className="mt-2 text-slate-400">
            Secure Gateway // IITK Database
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="mt-8 relative flex flex-col gap-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg transition-all shadow-xl"
              placeholder="Enter Identity (Name or ID)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading || !token}
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg px-6 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? 'Accessing...' : 'Scan'}
            </button>
          </div>

          {/* TURNSTILE WIDGET (Custom Implementation) */}
          <div className="flex justify-center h-[65px]">
            <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                theme="dark"
                onSuccess={(t) => {
                    setToken(t);
                    setError('');
                }}
                onExpire={() => setToken(null)}
            />
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-500/50 p-4 flex items-center gap-3 animate-pulse">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {results.map((student, idx) => (
            <div 
              key={idx} 
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:bg-slate-800 hover:border-blue-500/50 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="bg-slate-700 rounded-full p-2 group-hover:bg-blue-600/20 transition-colors">
                  <User className="h-5 w-5 text-slate-300 group-hover:text-blue-400" />
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              
              <h3 className="text-lg font-bold text-white capitalize mb-1 truncate">
                {student.name.toLowerCase()}
              </h3>
              
              <div className="space-y-2 mt-4 text-sm text-slate-400">
                <div className="flex items-center">
                  <Hash className="w-4 h-4 mr-2 opacity-50" />
                  <span>{student.roll}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 opacity-50" />
                  <span>{student.hometown}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}