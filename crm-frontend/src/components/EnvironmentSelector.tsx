"use client";
import { useState, useEffect } from "react";
import { 
  ServerStackIcon, 
  CpuChipIcon, 
  BeakerIcon,
  CloudIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { environmentManager, ENVIRONMENTS, Environment } from "@/config/api";
import { toast } from "react-hot-toast";

const icons: Record<string, any> = {
  dev: CpuChipIcon,
  sandbox: BeakerIcon,
  prod: CloudIcon
};

const colors: Record<string, string> = {
  dev: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
  sandbox: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  prod: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
};

export default function EnvironmentSelector() {
  const [currentEnv, setCurrentEnv] = useState<Environment>(ENVIRONMENTS.PROD);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCurrentEnv(environmentManager.getCurrent());
  }, []);

  const handleSwitch = (envId: string) => {
    if (envId === currentEnv.id) return;
    
    // Safety check for Production
    if (envId === 'prod') {
        const confirm = window.confirm("You are about to switch to the LIVE PRODUCTION environment. All changes will rely on real data. Continue?");
        if (!confirm) return;
    }

    toast.loading(`Switching to ${ENVIRONMENTS[envId.toUpperCase()].name}...`);
    environmentManager.set(envId);
  };

  const Icon = icons[currentEnv.id] || ServerStackIcon;

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${colors[currentEnv.id]}`}
      >
        <Icon className="w-4 h-4" />
        <span>{currentEnv.name}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Select Environment
              </h3>
            </div>
            <div className="p-1">
              {Object.values(ENVIRONMENTS).map((env) => {
                const EnvIcon = icons[env.id] || ServerStackIcon;
                const isActive = env.id === currentEnv.id;
                
                return (
                  <button
                    key={env.id}
                    onClick={() => handleSwitch(env.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${isActive ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                        <EnvIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="font-medium">{env.name}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{env.url}</div>
                    </div>
                    {isActive && <CheckCircleIcon className="w-5 h-5 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
