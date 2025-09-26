"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    organizationName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
    adminFirstName: "",
    adminLastName: "",
    plan: "basic"
  });
  
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const { register, isLoading, error, clearError, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Clear error when form changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [formData]);

  // Check password match
  useEffect(() => {
    setPasswordsMatch(
      formData.adminPassword === formData.confirmPassword || 
      formData.confirmPassword === ""
    );
  }, [formData.adminPassword, formData.confirmPassword]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordsMatch) {
      return;
    }

    if (formData.adminPassword.length < 8) {
      return;
    }

  

    const registrationData = {
      organizationName: formData.organizationName,
      adminEmail: formData.adminEmail,
      adminPassword: formData.adminPassword,
      adminFirstName: formData.adminFirstName,
      adminLastName: formData.adminLastName,
      plan: formData.plan
    };

    try {
      const result = await register(registrationData);
      if (result.meta.requestStatus === 'fulfilled') {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,_#2584eb_0%,_#4fc3f7_100%)] px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white p-14 rounded-3xl shadow-[0_8px_32px_0_rgba(37,99,235,0.18)] border border-blue-100 text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your organization has been created successfully. You will be redirected to the login page shortly.
            </p>
            <Link 
              href="/login"
              className="inline-block bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,_#2584eb_0%,_#4fc3f7_100%)] px-4 py-10">
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(37,99,235,0.18)] border border-blue-100">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-primary mb-2 tracking-wider drop-shadow-sm">LIASE</h1>
            <p className="text-gray-500 text-lg font-medium">Create Your Organization</p>
          </div>

          {/* Organization Details */}
          <div className="mb-6">
            <label className="block mb-2 font-bold text-gray-800">Organization Name</label>
            <input
              type="text"
              name="organizationName"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
              value={formData.organizationName}
              onChange={handleInputChange}
              required
              placeholder="Your Company Name"
            />
          </div>

          {/* Admin User Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block mb-2 font-bold text-gray-800">First Name</label>
              <input
                type="text"
                name="adminFirstName"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
                value={formData.adminFirstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-bold text-gray-800">Last Name</label>
              <input
                type="text"
                name="adminLastName"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
                value={formData.adminLastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-bold text-gray-800">Admin Email</label>
            <input
              type="email"
              name="adminEmail"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
              value={formData.adminEmail}
              onChange={handleInputChange}
              required
              placeholder="admin@company.com"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block mb-2 font-bold text-gray-800">Password</label>
              <input
                type="password"
                name="adminPassword"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
                value={formData.adminPassword}
                onChange={handleInputChange}
                required
                minLength={8}
              />
              <small className="text-xs text-gray-400 block mt-1">Minimum 8 characters</small>
            </div>
            <div>
              <label className="block mb-2 font-bold text-gray-800">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none text-base transition bg-white text-black ${
                  passwordsMatch ? 'border-gray-300 focus:border-primary' : 'border-red-500 focus:border-red-500'
                }`}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              {!passwordsMatch && (
                <small className="text-xs text-red-500 block mt-1">Passwords do not match</small>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-bold text-gray-800">Plan</label>
            <select
              name="plan"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-base transition bg-white text-black"
              value={formData.plan}
              onChange={handleInputChange}
            >
              <option value="basic">Basic Plan</option>
              <option value="professional">Professional Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>

          {error && <div className="mb-5 text-red-600 text-center font-semibold">{error}</div>}
          
          <button
            type="submit"
            disabled={isLoading || !passwordsMatch || formData.adminPassword.length < 8}
            className="w-full bg-primary text-white py-3 rounded-lg font-bold text-lg shadow-md hover:bg-primary-dark transition mb-6 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Organization...' : 'Create Organization'}
          </button>

          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}