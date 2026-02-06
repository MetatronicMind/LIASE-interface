"use client";
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/config/api';

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authToken = localStorage.getItem('auth_token');
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('auth_user');
      const organization = localStorage.getItem('auth_organization');

      setDebugInfo({
        authToken: authToken ? `Present (${authToken.substring(0, 20)}...)` : 'Missing',
        token: token ? `Present (${token.substring(0, 20)}...)` : 'Missing',
        user: user ? JSON.parse(user) : 'Missing',
        organization: organization ? JSON.parse(organization) : 'Missing',
        allKeys: Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('token')
        )
      });
    }
  }, []);

  const handleClearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleTestAPI = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      alert(`API Response: ${response.status} - ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`API Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">LocalStorage Debug</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleClearStorage}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Clear All Storage
          </button>
          
          <button
            onClick={handleTestAPI}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Test Users API
          </button>
          
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}