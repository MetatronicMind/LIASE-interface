"use client";
import "./login.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passwordValid = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
    if (!passwordValid) {
      setError("Password must be at least 8 characters, include a capital letter and a special character.");
      return;
    }
    setError("");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row relative">
      {/* Blue gradient overlay */}
      <div className="pointer-events-none absolute inset-0 z-0" style={{
        background: "linear-gradient(135deg, rgba(37,132,235,0.75) 0%, rgba(79,195,247,0.65) 100%)"
      }} />
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/background_loginpage.svg')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Left Side (Desktop Only) */}
      <div
        className="hidden md:flex w-1/2 flex-col justify-center items-center relative bg-cover bg-center"
      >
        <div className="absolute inset-0" /> {/* overlay */}
        <div className="relative z-10 text-center text-white px-8">
          <div className="bg-white rounded-2xl shadow-xl p-5 mb-8 inline-block">
            <Image
              src={require("../../assets/login_page_icon.png")}
              alt="LIASE Book Icon"
              width={64}
              height={64}
              className="rounded-xl drop-shadow"
              priority
            />
          </div>
          <h2 className="text-4xl font-extrabold mb-3 drop-shadow">Literature Automation<br />and Segmentation</h2>
        </div>
      </div>

      {/* Right Side (Login Form) */}
      <div
        className="flex flex-1 justify-center items-center px-4 py-4 md:py-10 bg-cover bg-center md:bg-none"
      >
        <div
          className="w-full max-w-md rounded-2xl shadow-xl border border-blue-200 bg-white/90 backdrop-blur-md p-8 md:p-12 mx-auto transition-all"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-full p-4 mb-5 shadow-sm">
              <Image
                src={require("../../assets/login_page_icon.png")}
                alt="LIASE Book Icon"
                width={48}
                height={48}
                className="rounded-xl drop-shadow"
                priority
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900 mb-2 tracking-tight drop-shadow-sm text-center">Welcome to LIASE</h1>
            <p className="text-blue-600 text-base md:text-lg font-medium mb-0 text-center">Literature Automation and Segmentation</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-6">
              <label className="block mb-2 font-semibold text-blue-800">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </span>
                <input
                  type="text"
                  className="w-full border border-blue-200 rounded-lg px-10 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base transition bg-white text-blue-900 placeholder-blue-300 shadow-sm font-medium"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block mb-2 font-semibold text-blue-800">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <input
                  type="password"
                  className="w-full border border-blue-200 rounded-lg px-10 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base transition bg-white text-blue-900 placeholder-blue-300 shadow-sm font-medium"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <small className="text-xs text-blue-400 block mt-1">Minimum 8 characters, 1 uppercase letter, 1 special character</small>
            </div>

            {/* Error */}
            {error && <div className="mb-5 text-red-600 text-center font-semibold rounded bg-red-50 py-2 px-3 border border-red-200">{error}</div>}

            {/* Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-lg font-bold text-lg shadow-md hover:from-blue-700 hover:to-blue-900 transition mb-6 tracking-wide flex items-center justify-center gap-2 border border-blue-700/20 focus:ring-2 focus:ring-blue-300"
            >
              <span>Log in</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
