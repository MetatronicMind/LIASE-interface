"use client";
import { useState } from "react";
import {
  DocumentTextIcon,
  BeakerIcon,
  CpuChipIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function ClientServicesPage() {
  const [services, setServices] = useState([
    {
      id: 1,
      name: "Full Report Generation",
      description: "Automated generation of detailed reports.",
      enabled: true,
      icon: DocumentTextIcon,
    },
    {
      id: 2,
      name: "Medical Examiner",
      description: "AI-assisted medical examination tools.",
      enabled: true,
      icon: BeakerIcon,
    },
    {
      id: 3,
      name: "Data Entry Module",
      description: "Streamlined data entry interface with validation.",
      enabled: true,
      icon: CpuChipIcon,
    },
    {
      id: 4,
      name: "Analytics Dashboard",
      description: "Advanced visualization and insights.",
      enabled: false,
      icon: ChartBarIcon,
    },
  ]);

  const toggleService = (id: number) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Enabled Services
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <div
            key={service.id}
            className={`p-6 rounded-xl border-2 transition-all ${service.enabled ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white"}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`p-3 rounded-lg ${service.enabled ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}
              >
                <service.icon className="h-6 w-6" />
              </div>
              <button
                onClick={() => toggleService(service.id)}
                className={`text-sm font-medium px-3 py-1 rounded-full border ${
                  service.enabled
                    ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {service.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <h3
              className={`text-lg font-bold mb-2 ${service.enabled ? "text-indigo-900" : "text-gray-900"}`}
            >
              {service.name}
            </h3>
            <p
              className={`text-sm ${service.enabled ? "text-indigo-700" : "text-gray-500"}`}
            >
              {service.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
