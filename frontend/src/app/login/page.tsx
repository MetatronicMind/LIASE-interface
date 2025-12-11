"use client";
import "./login.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetFormData, setResetFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'username' | 'email'>('username');
  const router = useRouter();
  
  const { login, isLoading, error, clearError, isAuthenticated, passwordWarning } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !passwordWarning) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, passwordWarning, router]);

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
        const payload = result.payload as any;
        if (payload.passwordWarning) {
          setShowWarningModal(true);
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      // Error is handled by the auth slice
      console.error('Login failed:', error);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (resetFormData.newPassword !== resetFormData.confirmPassword) {
      setResetError("New passwords do not match");
      return;
    }

    if (resetFormData.newPassword.length < 8 || resetFormData.newPassword.length > 12) {
      setResetError("Password must be 8-12 characters");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(resetFormData.newPassword)) {
      setResetError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
      return;
    }

    try {
      const token = localStorage.getItem('auth_token'); // Get token directly as we are in a semi-authenticated state
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: resetFormData.newPassword,
          currentPassword: resetFormData.currentPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setResetSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setResetError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,_#2584eb_0%,_#4fc3f7_100%)] px-4 py-10">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white p-14 rounded-3xl shadow-[0_8px_32px_0_rgba(37,99,235,0.18)] border border-blue-100 w-full max-w-md">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <Image 
                src="/logo_black.png" 
                alt="LIASE Logo" 
                width={180} 
                height={72}
                priority
                className="drop-shadow-md"
              />
            </div>
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
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-gray-800">Password</label>
              <button 
                type="button"
                onClick={() => setShowPasswordInfo(!showPasswordInfo)}
                className="text-gray-500 hover:text-blue-600 transition-colors"
                aria-label="Password requirements info"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </button>
            </div>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {showPasswordInfo && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 animate-fadeIn">
                Password must be 8-12 characters with at least 1 special character
              </div>
            )}
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
      
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            {!showResetForm ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Password Expiration Warning</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Your password will expire in less than a week. Would you like to reset it now?
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                    onClick={() => setShowResetForm(true)}
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => router.push("/dashboard")}
                  >
                    Sign In Anyway
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handlePasswordReset}>
                <div className="text-center mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Reset Password</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter your current password and a new password.</p>
                </div>
                
                {resetSuccess ? (
                  <div className="text-center py-4">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-green-600 font-medium">Password updated successfully!</p>
                    <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                          type="password"
                          required
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
                          value={resetFormData.currentPassword}
                          onChange={e => setResetFormData({...resetFormData, currentPassword: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          type="password"
                          required
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
                          value={resetFormData.newPassword}
                          onChange={e => setResetFormData({...resetFormData, newPassword: e.target.value})}
                        />
                        <p className="text-xs text-gray-500 mt-1">8-12 chars, 1 special char</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          required
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
                          value={resetFormData.confirmPassword}
                          onChange={e => setResetFormData({...resetFormData, confirmPassword: e.target.value})}
                        />
                      </div>
                    </div>

                    {resetError && (
                      <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
                        {resetError}
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                      >
                        Update Password
                      </button>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                        onClick={() => setShowResetForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
