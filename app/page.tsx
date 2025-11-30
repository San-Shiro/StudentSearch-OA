'use client';

import React, { useState, FormEvent } from 'react';
import { Search, User, MapPin, Hash, AlertCircle, ShieldCheck } from 'lucide-react';

// --- Types ---

interface Student {
  name: string;
  roll: string;
  hometown: string;
}

// --- Main Application ---

export default function StudentSearch() {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // Updated with your specific Worker URL
  const WORKER_URL = 'https://studentsearch-oa.ketan-saini62.workers.dev';

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setResults([]);
    setHasSearched(true);

    try {
      // Removed headers object since we no longer send the token
      const res = await fetch(`${WORKER_URL}?id=${encodeURIComponent(query)}`);
      
      if (!res.ok) {
        // This helps debug if the error is 403 (CORS/Origin) or 500 (Server)
        throw new Error(`Connection failed: ${res.status} ${res.statusText}`);
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

    } catch (err) {
      if (err instanceof Error) {
        console.error("Search Error:", err);
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
            Student Search Lite
          </h1>
          <p className="mt-2 text-slate-400">
            IITK Database
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
