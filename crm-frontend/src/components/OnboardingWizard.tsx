"use client";
import { useState } from "react";
import {
    CheckCircleIcon,
    BuildingOfficeIcon,
    ServerStackIcon,
    Cog6ToothIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    PhotoIcon,
} from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";

// Industry options
const INDUSTRIES = [
    "Pharmaceuticals",
    "Biotechnology",
    "Medical Devices",
    "Clinical Research",
    "Healthcare",
    "Life Sciences",
    "Other",
];

// Days of the week
const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

interface OnboardingWizardProps {
    onClose: () => void;
    onSuccess: (data: any) => void;
}

interface FormData {
    // Step 1: Basic Info
    name: string;
    industry: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone: string;
    logo: File | null;
    logoPreview: string;

    // Step 2: Database Config
    databaseId: string;
    adminEmail: string;
    adminPassword: string;

    // Step 3: Permissions/Settings
    workflowSettings: {
        qcDataEntry: boolean;
        medicalReview: boolean;
        icsrBypassQc: boolean;
        noCaseQcAllocation: number;
    };
    triageSettings: {
        batchAllocationSize: number;
        priorityQueue: string[];
    };
    daysAvailable: string[];
}

const initialFormData: FormData = {
    name: "",
    industry: "",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    logo: null,
    logoPreview: "",
    databaseId: "",
    adminEmail: "",
    adminPassword: "",
    workflowSettings: {
        qcDataEntry: true,
        medicalReview: true,
        icsrBypassQc: false,
        noCaseQcAllocation: 20,
    },
    triageSettings: {
        batchAllocationSize: 100,
        priorityQueue: ["Probable ICSR/AOI", "Manual Review", "Probable ICSR"],
    },
    daysAvailable: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
};

export default function OnboardingWizard({
    onClose,
    onSuccess,
}: OnboardingWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const steps = [
        { id: 1, name: "Basic Info", icon: BuildingOfficeIcon },
        { id: 2, name: "Database Config", icon: ServerStackIcon },
        { id: 3, name: "Permissions", icon: Cog6ToothIcon },
    ];

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            if (!formData.name.trim()) newErrors.name = "Organization name is required";
            if (!formData.industry) newErrors.industry = "Industry is required";
            if (!formData.primaryContactEmail.trim()) {
                newErrors.primaryContactEmail = "Primary contact email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContactEmail)) {
                newErrors.primaryContactEmail = "Invalid email format";
            }
        }

        if (step === 2) {
            if (!formData.databaseId.trim()) {
                newErrors.databaseId = "Database ID is required";
            } else if (!/^[a-zA-Z0-9-]+$/.test(formData.databaseId)) {
                newErrors.databaseId = "Database ID can only contain letters, numbers, and hyphens";
            } else if (formData.databaseId.length < 3) {
                newErrors.databaseId = "Database ID must be at least 3 characters";
            }
            if (!formData.adminEmail.trim()) {
                newErrors.adminEmail = "Admin email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
                newErrors.adminEmail = "Invalid email format";
            }
        }

        if (step === 3) {
            if (formData.daysAvailable.length === 0) {
                newErrors.daysAvailable = "At least one day must be selected";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, 3));
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({
                ...formData,
                logo: file,
                logoPreview: URL.createObjectURL(file),
            });
        }
    };

    const handleDayToggle = (day: string) => {
        setFormData((prev) => ({
            ...prev,
            daysAvailable: prev.daysAvailable.includes(day)
                ? prev.daysAvailable.filter((d) => d !== day)
                : [...prev.daysAvailable, day],
        }));
    };

    const handleSubmit = async () => {
        if (!validateStep(3)) return;

        setIsSubmitting(true);
        setErrors({}); // Clear previous errors

        try {
            const token = localStorage.getItem("auth_token");

            // Backend only accepts: name, databaseId, adminEmail, adminPassword
            const payload = {
                name: formData.name,
                databaseId: formData.databaseId,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword || undefined,
            };

            const response = await fetch(`${getApiBaseUrl()}/organizations`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            // Try to parse response as JSON, handle non-JSON responses
            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                // Non-JSON response (e.g., HTML error page)
                const text = await response.text();
                console.error("Non-JSON response:", text);
                data = { error: `Server error (${response.status})` };
            }

            if (response.ok) {
                // Success - organization created
                onSuccess({
                    ...data,
                    wizardData: {
                        industry: formData.industry,
                        primaryContact: {
                            name: formData.primaryContactName,
                            email: formData.primaryContactEmail,
                            phone: formData.primaryContactPhone,
                        },
                        settings: {
                            workflow: formData.workflowSettings,
                            triage: formData.triageSettings,
                            daysAvailable: formData.daysAvailable,
                        },
                    },
                });
            } else {
                // Error from backend
                const errorMessage = data.error || data.message || `Failed to create organization (${response.status})`;
                setErrors({ submit: errorMessage });
            }
        } catch (error: any) {
            console.error("Organization creation error:", error);
            // Network error or other exception
            setErrors({
                submit: error.message || "Error creating organization. Please check your connection."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header with Progress */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Onboard New Organization
                    </h2>
                    <div className="flex items-center justify-between">
                        {steps.map((step, idx) => (
                            <div key={step.id} className="flex items-center">
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${currentStep > step.id
                                        ? "bg-white border-white text-blue-600"
                                        : currentStep === step.id
                                            ? "bg-white/20 border-white text-white"
                                            : "bg-transparent border-white/40 text-white/60"
                                        }`}
                                >
                                    {currentStep > step.id ? (
                                        <CheckCircleIcon className="w-6 h-6" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span
                                    className={`ml-2 text-sm font-medium ${currentStep >= step.id ? "text-white" : "text-white/60"
                                        }`}
                                >
                                    {step.name}
                                </span>
                                {idx < steps.length - 1 && (
                                    <div
                                        className={`w-12 h-0.5 mx-3 ${currentStep > step.id ? "bg-white" : "bg-white/30"
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {errors.submit && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {errors.submit}
                        </div>
                    )}

                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Organization Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? "border-red-300" : "border-gray-300"
                                        }`}
                                    placeholder="e.g. Pharma Inc."
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Industry *
                                </label>
                                <select
                                    value={formData.industry}
                                    onChange={(e) =>
                                        setFormData({ ...formData, industry: e.target.value })
                                    }
                                    className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.industry ? "border-red-300" : "border-gray-300"
                                        }`}
                                >
                                    <option value="">Select Industry</option>
                                    {INDUSTRIES.map((ind) => (
                                        <option key={ind} value={ind}>
                                            {ind}
                                        </option>
                                    ))}
                                </select>
                                {errors.industry && (
                                    <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Primary Contact Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.primaryContactName}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                primaryContactName: e.target.value,
                                            })
                                        }
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Primary Contact Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.primaryContactEmail}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                primaryContactEmail: e.target.value,
                                            })
                                        }
                                        className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.primaryContactEmail
                                            ? "border-red-300"
                                            : "border-gray-300"
                                            }`}
                                        placeholder="contact@pharma.com"
                                    />
                                    {errors.primaryContactEmail && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {errors.primaryContactEmail}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Primary Contact Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.primaryContactPhone}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            primaryContactPhone: e.target.value,
                                        })
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Logo / Branding
                                </label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                        <PhotoIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-600">
                                            Click to upload logo
                                        </span>
                                    </label>
                                    {formData.logoPreview && (
                                        <img
                                            src={formData.logoPreview}
                                            alt="Logo preview"
                                            className="w-20 h-20 object-contain border border-gray-200 rounded-lg"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Database Config */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    Configure the database settings for this client. The Database
                                    ID will be used as a unique identifier for data isolation.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Database ID / Tenant ID *
                                </label>
                                <input
                                    type="text"
                                    value={formData.databaseId}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            databaseId: e.target.value.replace(/[^a-zA-Z0-9-]/g, ""),
                                        })
                                    }
                                    className={`w-full border rounded-lg px-3 py-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.databaseId ? "border-red-300" : "border-gray-300"
                                        }`}
                                    placeholder="e.g. pharma-inc-prod"
                                />
                                {errors.databaseId ? (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.databaseId}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Only letters, numbers, and hyphens allowed. This cannot be
                                        changed later.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Admin Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.adminEmail}
                                    onChange={(e) =>
                                        setFormData({ ...formData, adminEmail: e.target.value })
                                    }
                                    className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.adminEmail ? "border-red-300" : "border-gray-300"
                                        }`}
                                    placeholder="admin@pharma.com"
                                />
                                {errors.adminEmail && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.adminEmail}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Admin Password (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.adminPassword}
                                    onChange={(e) =>
                                        setFormData({ ...formData, adminPassword: e.target.value })
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Leave blank to auto-generate"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    A secure password will be generated if left blank.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Permissions/Settings */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            {/* Workflow Settings */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Workflow Settings
                                </h3>
                                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">
                                                QC Data Entry
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                Enable QC Data Entry stage in workflow
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.workflowSettings.qcDataEntry}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    workflowSettings: {
                                                        ...formData.workflowSettings,
                                                        qcDataEntry: e.target.checked,
                                                    },
                                                })
                                            }
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">
                                                Medical Review
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                Enable Medical Review stage
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.workflowSettings.medicalReview}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    workflowSettings: {
                                                        ...formData.workflowSettings,
                                                        medicalReview: e.target.checked,
                                                    },
                                                })
                                            }
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">
                                                ICSR Bypass QC Allocation
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                ICSR cases go directly to Data Entry
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.workflowSettings.icsrBypassQc}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    workflowSettings: {
                                                        ...formData.workflowSettings,
                                                        icsrBypassQc: e.target.checked,
                                                    },
                                                })
                                            }
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    </label>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">
                                                No Case QC Allocation %
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                Percentage sent back to Triage
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.workflowSettings.noCaseQcAllocation}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        workflowSettings: {
                                                            ...formData.workflowSettings,
                                                            noCaseQcAllocation: parseInt(e.target.value) || 0,
                                                        },
                                                    })
                                                }
                                                className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <span className="text-gray-500">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Triage Settings */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Triage Settings
                                </h3>
                                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">
                                                Batch Allocation Size
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                Number of cases per batch
                                            </p>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.triageSettings.batchAllocationSize}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    triageSettings: {
                                                        ...formData.triageSettings,
                                                        batchAllocationSize: parseInt(e.target.value) || 1,
                                                    },
                                                })
                                            }
                                            className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Days Available */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Days Available
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleDayToggle(day)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.daysAvailable.includes(day)
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                        >
                                            {day.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                                {errors.daysAvailable && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {errors.daysAvailable}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
                    <button
                        type="button"
                        onClick={currentStep === 1 ? onClose : handleBack}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        {currentStep === 1 ? "Cancel" : "Back"}
                    </button>

                    {currentStep < 3 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Next
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="w-5 h-5" />
                                    Complete Onboarding
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
