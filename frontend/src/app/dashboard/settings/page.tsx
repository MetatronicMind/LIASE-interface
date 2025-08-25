"use client";
import { useState, useContext } from "react";
import { ThemeContext } from "../../providers";

export default function SettingsPage() {
  // Example state for profile and settings
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john.doe@email.com",
    avatar: "https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff",
  });
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [notifications, setNotifications] = useState({ email: true, sms: false });
  const { theme, toggleTheme } = useContext(ThemeContext);

  // Placeholder handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword({ ...password, [e.target.name]: e.target.value });
  };
  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotifications({ ...notifications, [e.target.name]: e.target.checked });
  };
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save logic
    alert("Settings saved!");
  };
  const handleCancel = () => {
    // TODO: Reset logic
    alert("Changes canceled.");
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-blue-100 dark:border-gray-800 px-4 py-4 sm:px-8 sm:py-12">
      <h1 className="text-3xl font-black text-primary dark:text-blue-100 mb-4 tracking-wider drop-shadow-sm text-center">Settings</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center">Update your profile and preferences here.</p>
      <form onSubmit={handleSave} className="space-y-10">
        {/* Profile Section */}
        <section className="flex flex-col sm:flex-row items-center gap-6 bg-blue-50 dark:bg-gray-800 rounded-xl p-6">
          <img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-blue-200 dark:border-gray-700 shadow" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Name</label>
              <input
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className="w-full border border-blue-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Email</label>
              <input
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                className="w-full border border-blue-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Your email"
                type="email"
              />
            </div>
          </div>
        </section>

        {/* Theme Section */}
        <section className="flex items-center justify-between bg-blue-50 dark:bg-gray-800 rounded-xl p-6">
          <div>
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">Theme</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Switch between light and dark mode.</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900 text-white font-semibold shadow hover:from-blue-700 hover:to-blue-900 dark:hover:from-blue-900 dark:hover:to-blue-950 transition"
          >
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>
        </section>

        {/* Password Section */}
        <section className="bg-blue-50 dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">Change Password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Current Password</label>
              <input
                name="current"
                type="password"
                value={password.current}
                onChange={handlePasswordChange}
                className="w-full border border-blue-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Current password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">New Password</label>
              <input
                name="new"
                type="password"
                value={password.new}
                onChange={handlePasswordChange}
                className="w-full border border-blue-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="New password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Confirm Password</label>
              <input
                name="confirm"
                type="password"
                value={password.confirm}
                onChange={handlePasswordChange}
                className="w-full border border-blue-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Confirm password"
              />
            </div>
          </div>
        </section>

        {/* Notification On/Off Toggle */}
        <div className="flex items-center bg-blue-50 dark:bg-gray-800 rounded-xl p-6">
          <span className="text-lg font-semibold text-blue-900 dark:text-blue-100 mr-4">Notifications</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={e => setNotifications({ ...notifications, email: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 transition-all"></div>
            <div className="absolute left-1 top-1 bg-white dark:bg-gray-900 w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
          </label>
          <span className="ml-3 text-blue-900 dark:text-blue-100 text-sm">{notifications.email ? "On" : "Off"}</span>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex justify-end gap-4 mt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 rounded bg-white dark:bg-gray-900 border border-blue-200 dark:border-gray-700 text-blue-700 dark:text-blue-200 font-semibold hover:bg-blue-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900 text-white font-bold shadow hover:from-blue-700 hover:to-blue-900 dark:hover:from-blue-900 dark:hover:to-blue-950 transition"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
