'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Search, User, MapPin, Hash, AlertCircle, ShieldCheck, Lock, KeyRound, ArrowRight, LogOut } from 'lucide-react';

// --- Types ---
interface Student {
  name: string;
  roll: string;
  hometown: string;
}

// --- Config Flag ---
// Set to "disabled" to bypass login and show the search page (guest mode).
// Set to "enabled" to require CC login.
const requireAuthentication = "enabled"; // <-- change this to "disabled" to enable guest mode

// --- Main Application ---
export default function StudentSearch() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true); // Initial loading state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- Search State ---
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Use the worker URL (ensure this matches your deployed worker)
  const WORKER_URL = 'https://student-search-oa.chinshoe-up.workers.dev/';

  // --- 1. Check Auth on Load and when requireAuthentication changes ---
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      // If guest mode is enabled, immediately set authenticated and skip session check
      if (requireAuthentication === "disabled") {
        if (!mounted) return;
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
        return;
      }

      // For "enabled" mode: ensure we start unauthenticated and show loading while checking
      if (!mounted) return;
      setIsAuthenticated(false);
      setIsCheckingAuth(true);

      try {
        const res = await fetch(`${WORKER_URL}?check_auth=true`, {
          credentials: 'include',
        });

        if (!mounted) return;
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.log("Session check failed", e);
        if (!mounted) return;
        setIsAuthenticated(false);
      } finally {
        if (!mounted) return;
        setIsCheckingAuth(false);
      }
    };

    checkSession();

    return () => { mounted = false; };
  }, [requireAuthentication]); // <-- important: reacts when flag changes

  // --- 2. Login Handler ---
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginUser || !loginPass) {
      setAuthError('Identity required.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', 
        body: JSON.stringify({
          action: 'login',
          username: loginUser,
          password: loginPass
        })
      });

      if (res.ok) {
        setIsAuthenticated(true);
        setLoginPass(''); // Clear sensitive data
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Access Denied');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // --- 3. Logout Handler ---
  const handleLogout = async () => {
    try {
        await fetch(WORKER_URL, {
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ action: 'logout' })
        });
        // On logout, respect requireAuthentication flag:
        if (requireAuthentication === "disabled") {
          // still in guest mode: treat as authenticated guest
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
        setResults([]);
        setQuery('');
    } catch (e) {
        console.error("Logout failed", e);
    }
  };

  // --- 4. Search Handler ---
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch(`${WORKER_URL}?id=${encodeURIComponent(query)}`, {
        credentials: 'include' 
      });
      
      if (res.status === 401 || res.status === 403) {
          setIsAuthenticated(false); // Session expired
          throw new Error('Session expired. Please log in again.');
      }

      if (!res.ok) {
        throw new Error(`Connection failed: ${res.status}`);
      }
      
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

    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // --- Loading Screen ---
  if (isCheckingAuth) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  // --- View: Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center py-12 px-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4 text-blue-500 ring-1 ring-slate-700">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">IITK Student Search</h1>
            <p className="text-slate-500 text-sm mt-2">Use CC Login to access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-700 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  placeholder="Username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="password" 
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-700 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/20 p-3 rounded-lg border border-red-900/30 animate-pulse">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-blue-900/20"
            >
              {authLoading ? 'Verifying...' : (
                <>
                  <span>Authenticate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- View: Search Screen (Shown when isAuthenticated) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* Header with Logout */}
        <div className="flex justify-between items-start w-full">
            <div className="w-10"></div> {/* Spacer */}
            <div className="text-center flex-1">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
                    Student Search Lite
                </h1>

                {/* Subtitle */}
                <p className="mt-2 text-slate-400 text-sm tracking-widest uppercase">
                    Something is better than nothing
                </p>

                {/* Improved notice line */}
                <p className="mt-1 text-slate-500 text-xs">
                  Note: After the next update, CC login will be required to access this page to secure the data.
                </p>

                {/* Guest mode label when auth is bypassed */}
                {requireAuthentication === "disabled" && (
                  <div className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium bg-yellow-800/30 text-yellow-200 border border-yellow-700/40">
                    Guest mode — authentication bypassed
                  </div>
                )}
            </div>
            <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                title="Logout"
            >
                <LogOut className="w-5 h-5" />
            </button>
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
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg px-6 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? 'Accessing...' : 'Scan'}
            </button>
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
