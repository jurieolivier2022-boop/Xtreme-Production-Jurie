import React from 'react';
import { useAuth } from '../lib/authContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="card-minimal max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 bg-blue-50 text-brand rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
          <LogIn size={32} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-3xl font-bold text-text-main tracking-tight mb-2">Welcome Back</h1>
        <p className="text-text-muted mb-10">Sign in to your SignPro ERP account to continue.</p>
        
        <button 
          onClick={login}
          className="w-full flex items-center justify-center gap-4 bg-white border border-border py-4 rounded-2xl font-bold text-text-main hover:bg-gray-50 transition-all shadow-sm group"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Sign in with Google
        </button>
        
        <p className="mt-8 text-[11px] text-text-light font-bold uppercase tracking-widest leading-loose">
          Secure identity management<br/>powered by Firebase Auth
        </p>
      </div>
    </div>
  );
}
