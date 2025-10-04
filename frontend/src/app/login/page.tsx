"use client";
import "./login.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<'username' | 'email'>('username');
  const router = useRouter();
  
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Clear error when input changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [usernameOrEmail, password]);

  const isEmail = (input: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameOrEmail || !password) {
      return;
    }

    // Determine if input is email or username
    const isEmailInput = isEmail(usernameOrEmail);
    
    const credentials = isEmailInput 
      ? { email: usernameOrEmail, password }
      : { username: usernameOrEmail, password };

    try {
      const result = await login(credentials);
      if (result.meta.requestStatus === 'fulfilled') {
        router.push("/dashboard");
      }
    } catch (error) {
      // Error is handled by the auth slice
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,_#2584eb_0%,_#4fc3f7_100%)] px-4 py-10">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white p-14 rounded-3xl shadow-[0_8px_32px_0_rgba(37,99,235,0.18)] border border-blue-100 w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-black text-primary mb-2 tracking-wider drop-shadow-sm">LIASE</h1>
            <p className="text-gray-500 text-lg mb-0 font-medium">Literature Automation and Segregation</p>
          </div>
          <div className="mb-7">
            <label className="block mb-2 font-bold text-gray-800">Username or Email</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
              value={usernameOrEmail}
              onChange={e => setUsernameOrEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="Enter username or email"
            />
          </div>
          <div className="mb-7">
            <label className="block mb-2 font-bold text-gray-800">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <small className="text-xs text-gray-400 block mt-1">Minimum 6 characters required</small>
          </div>
          {/* Role selection removed */}
          {error && <div className="mb-5 text-red-600 text-center font-semibold">{error}</div>}
          <button
            type="submit"
            disabled={isLoading || !usernameOrEmail || !password}
            className="w-full bg-primary text-white py-3 rounded-lg font-bold text-lg shadow-md hover:bg-primary-dark transition mb-8 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
