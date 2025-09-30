"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Study {
  id: string;
  pmid: string;
  title: string;
  drugName: string;
  adverseEvent: string;
  userTag?: string;
  status: string;
  createdAt: string;
}

export default function TriagePage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchStudies();
  }, [currentPage, searchTerm]);

  const fetchStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/studies?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching studies:", error);
    } finally {
      setLoading(false);
    }
  };

  const classifyStudy = async (studyId: string, classification: string) => {
    try {
      setClassifying(studyId);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/studies/${studyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userTag: classification
        }),
      });

      if (response.ok) {
        // Update the study in the local state
        setStudies(prev => prev.map(study => 
          study.id === studyId 
            ? { ...study, userTag: classification }
            : study
        ));
        setSelectedStudy(null);
      } else {
        throw new Error("Failed to classify study");
      }
    } catch (error) {
      console.error("Error classifying study:", error);
      alert("Error classifying study. Please try again.");
    } finally {
      setClassifying(null);
    }
  };

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case "ICSR":
        return "bg-red-100 text-red-800 border-red-200";
      case "AOI":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "No Case":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const filteredStudies = studies.filter(study =>
    study.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.pmid.includes(searchTerm) ||
    study.drugName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Triage</h1>
        <p className="text-gray-600">
          Classify studies as ICSR, AOI, or No Case for further processing
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search studies by title, PMID, or drug name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={fetchStudies}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Studies Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {study.title}
                  </h3>
                  <div className="flex gap-4 text-sm text-gray-600 mb-2">
                    <span><strong>PMID:</strong> {study.pmid}</span>
                    <span><strong>Drug:</strong> {study.drugName}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Adverse Event:</strong> {study.adverseEvent}
                  </p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {study.userTag ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getClassificationColor(study.userTag)}`}>
                      {study.userTag}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      Unclassified
                    </span>
                  )}
                </div>
              </div>

              {/* Classification Actions */}
              {!study.userTag && (
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => classifyStudy(study.id, "ICSR")}
                    disabled={classifying === study.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {classifying === study.id ? "Classifying..." : "ICSR"}
                  </button>
                  <button
                    onClick={() => classifyStudy(study.id, "AOI")}
                    disabled={classifying === study.id}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium"
                  >
                    AOI
                  </button>
                  <button
                    onClick={() => classifyStudy(study.id, "No Case")}
                    disabled={classifying === study.id}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
                  >
                    No Case
                  </button>
                </div>
              )}

              {/* Re-classify option for already classified studies */}
              {study.userTag && (
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-600 mr-2">Re-classify:</span>
                  <button
                    onClick={() => classifyStudy(study.id, "ICSR")}
                    disabled={classifying === study.id}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 text-xs"
                  >
                    ICSR
                  </button>
                  <button
                    onClick={() => classifyStudy(study.id, "AOI")}
                    disabled={classifying === study.id}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 disabled:opacity-50 text-xs"
                  >
                    AOI
                  </button>
                  <button
                    onClick={() => classifyStudy(study.id, "No Case")}
                    disabled={classifying === study.id}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-xs"
                  >
                    No Case
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredStudies.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No studies found. Try adjusting your search criteria.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-8 flex justify-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-gray-600">
          Page {currentPage}
        </span>
        <button
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={filteredStudies.length < 10}
          className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}