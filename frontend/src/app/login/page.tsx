"use client";
import "./login.css";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Password validation: min 8 chars, 1 capital, 1 special char
    const passwordValid = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
    if (!passwordValid) {
      setError("Password must be at least 8 characters, include a capital letter and a special character.");
      return;
    }
    setError("");
    // TODO: Implement authentication logic
    // alert("Login successful (stub)");
    router.push("/dashboard");
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
            <label className="block mb-2 font-bold text-gray-800">Username</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
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
            <small className="text-xs text-gray-400 block mt-1">Minimum 8 characters, 1 uppercase letter, 1 special character</small>
          </div>
          {/* Role selection removed */}
          {error && <div className="mb-5 text-red-600 text-center font-semibold">{error}</div>}
          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg font-bold text-lg shadow-md hover:bg-primary-dark transition mb-8 tracking-wide"
          >
            Sign In
          </button>
          <hr className="my-1 border-gray-200" />
          <div className="demo-credentials text-center">
            <div className="font-bold text-gray-700 mb-3 text-base">Demo Credentials:</div>
            <div className="credentials-list space-y-1">
              <div><span className="text-primary font-bold">Admin:</span> <span className="text-gray-700">admin</span> <span className="text-gray-400">/</span> <span className="text-gray-700">Admin123!</span></div>
              <div><span className="text-primary font-bold">Pharmacovigilance:</span> <span className="text-gray-700">pv_user1</span> <span className="text-gray-400">/</span> <span className="text-gray-700">Pharma123!</span></div>
              <div><span className="text-primary font-bold">Sponsor/Auditor:</span> <span className="text-gray-700">auditor</span> <span className="text-gray-400">/</span> <span className="text-gray-700">Audit123!</span></div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
