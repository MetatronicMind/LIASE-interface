"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";
import { PmidLink } from "@/components/PmidLink";
import { CommentThread } from "@/components/CommentThread";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

interface Study {
  id: string;
  pmid: string;
  title: string;
  drugName: string;
  adverseEvent: string;
  userTag: string;
  status?: string;
  subStatus?: string;
  workflowStage?: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  organizationId?: string;

  // Publication info
  authors?: string[] | string;
  journal?: string;
  publicationDate?: string;
  abstract?: string;
  createdBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  qaApprovedBy?: string;
  qaApprovalStatus?: string;
  comments?: any[];
  attachments?: any[];

  // AI / Assessment fields
  aiInferenceData?: any;
  doi?: string;
  specialCase?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  patientDetails?: any;
  keyEvents?: string[] | string;
  relevantDates?: any;
  administeredDrugs?: string[] | string;
  attributability?: string;
  drugEffect?: string;
  summary?: string;
  identifiableHumanSubject?: boolean | string;
  textType?: string;
  authorPerspective?: string;
  icsrClassification?: string;
  aoiClassification?: string;
  substanceGroup?: string;
  vancouverCitation?: string;
  leadAuthor?: string;
  serious?: boolean;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  justification?: string;
  clientName?: string;
  sponsor?: string;
  listedness?: string;
  seriousness?: string;
}

export default function AOIReportsPage() {
  const selectedOrganizationId = useSelector(
    (state: RootState) => state.filter.selectedOrganizationId,
  );
  const { user } = useAuth();
  const { formatDateTime } = useDateTime();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Filters
  const [studyIdFilter, setStudyIdFilter] = useState("");
  const [qaFilter, setQaFilter] = useState("all");
  const [seriousFilter, setSeriousFilter] = useState("all");
  const [listednessFilter, setListednessFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchStudies();
  }, [
    currentPage,
    searchTerm,
    selectedOrganizationId,
    studyIdFilter,
    qaFilter,
    seriousFilter,
    listednessFilter,
    dateRange,
  ]);

  const fetchStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(selectedOrganizationId && {
          organizationId: selectedOrganizationId,
        }),
        ...(studyIdFilter && { studyId: studyIdFilter }),
        ...(qaFilter !== "all" && { qaApprovalStatus: qaFilter }),
        ...(seriousFilter !== "all" && {
          serious: seriousFilter === "serious" ? "true" : "false",
        }),
        ...(listednessFilter !== "all" && { listedness: listednessFilter }),
        ...(dateRange.start && { dateFrom: dateRange.start }),
        ...(dateRange.end && { dateTo: dateRange.end }),
      });

      const response = await fetch(
        `${getApiBaseUrl()}/studies/aoi-reports?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error("Error fetching AOI Reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = (study: Study) => {
    setSelectedStudy(study);
    setShowReport(true);
  };

  const closeReport = () => {
    setShowReport(false);
    setSelectedStudy(null);
    setShowExportMenu(false);
  };

  const exportReport = () => {
    if (!selectedStudy) return;
    const blob = new Blob([JSON.stringify(selectedStudy, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AOI_Report_${selectedStudy.pmid}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!selectedStudy) return;
    const csvData: string[][] = [];
    const headers = ["Section", "Field", "Value"];
    csvData.push(headers);

    const add = (section: string, field: string, value: any) => {
      const fmt = (v: any): string => {
        if (!v) return "";
        if (Array.isArray(v)) return v.join("; ");
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      };
      csvData.push([section, field, fmt(value)]);
    };

    add("Study", "Article ID", selectedStudy.id);
    add("Study", "PMID", selectedStudy.pmid);
    add("Study", "Title", selectedStudy.title);
    add("Study", "Drug Name", selectedStudy.drugName);
    add("Study", "Adverse Event", selectedStudy.adverseEvent);
    add("Study", "User Tag", selectedStudy.userTag);
    add("Study", "Status", selectedStudy.status);
    add("Study", "Authors", selectedStudy.authors);
    add("Study", "Journal", selectedStudy.journal);
    add("Study", "Publication Date", selectedStudy.publicationDate);
    add("Study", "Abstract", selectedStudy.abstract);
    add("Study", "Created At", selectedStudy.createdAt);
    add("Study", "Updated At", selectedStudy.updatedAt);
    add("Study", "Created By", selectedStudy.createdBy);
    add("Study", "Approved By", selectedStudy.approvedBy);
    add("Study", "QA Approval Status", selectedStudy.qaApprovalStatus);

    add("AOI", "AOI Classification", selectedStudy.aoiClassification);
    add("AOI", "AOI Drug Effect", selectedStudy.aoiDrugEffect);
    add("AOI", "Justification", selectedStudy.justification);
    add("AOI", "Approved Indication", selectedStudy.approvedIndication);
    add("AOI", "Listedness", selectedStudy.listedness);
    add("AOI", "Seriousness", selectedStudy.seriousness);
    add("AOI", "Serious", selectedStudy.serious ? "Yes" : "No");
    add("AOI", "DOI", selectedStudy.doi);
    add("AOI", "Special Case", selectedStudy.specialCase);
    add("AOI", "Country of First Author", selectedStudy.countryOfFirstAuthor);
    add("AOI", "Country of Occurrence", selectedStudy.countryOfOccurrence);
    add("AOI", "Attributability", selectedStudy.attributability);
    add("AOI", "Drug Effect", selectedStudy.drugEffect);
    add("AOI", "Text Type", selectedStudy.textType);
    add("AOI", "Author Perspective", selectedStudy.authorPerspective);
    add("AOI", "Substance Group", selectedStudy.substanceGroup);
    add("AOI", "Lead Author", selectedStudy.leadAuthor);
    add("AOI", "Test Subject", selectedStudy.testSubject);
    add("AOI", "Sponsor", selectedStudy.sponsor);
    add("AOI", "Client Name", selectedStudy.clientName);
    add("AOI", "Patient Details", selectedStudy.patientDetails);
    add("AOI", "Key Events", selectedStudy.keyEvents);
    add("AOI", "Administered Drugs", selectedStudy.administeredDrugs);
    add("AOI", "Relevant Dates", selectedStudy.relevantDates);
    add("AOI", "Summary", selectedStudy.summary);
    add("AOI", "Vancouver Citation", selectedStudy.vancouverCitation);
    add(
      "AOI",
      "Identifiable Human Subject",
      selectedStudy.identifiableHumanSubject ? "Yes" : "No",
    );

    const escapeCell = (cell: any): string => {
      if (cell === null || cell === undefined) return "";
      const str = typeof cell === "string" ? cell : String(cell);
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = csvData
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AOI_Report_${selectedStudy.pmid}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PermissionGate
      resource="reports"
      action="read"
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Access Denied
            </h2>
            <p className="text-red-600">
              You don&apos;t have permission to view AOI Reports.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">AOI Reports</h1>
          <p className="text-gray-600">
            Review completed Articles of Interest (AOI) that have been approved
            through assessment
          </p>
        </div>

        {!showReport ? (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FunnelIcon className="w-5 h-5 mr-2 text-yellow-600" />
                Filter Reports
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-yellow-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search AOI articles..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-yellow-400 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white transition-colors text-gray-900"
                    />
                  </div>
                </div>

                {/* Article ID */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Article ID
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-yellow-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={studyIdFilter}
                      onChange={(e) => {
                        setStudyIdFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by Article ID"
                      className="w-full pl-10 pr-4 py-3 border border-yellow-400 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white transition-colors text-gray-900"
                    />
                  </div>
                </div>

                {/* QC Status */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    QC Status
                  </label>
                  <select
                    value={qaFilter}
                    onChange={(e) => {
                      setQaFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 border border-yellow-400 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900"
                  >
                    <option value="all">All QC Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Seriousness */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Seriousness
                  </label>
                  <select
                    value={seriousFilter}
                    onChange={(e) => {
                      setSeriousFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 border border-yellow-400 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900"
                  >
                    <option value="all">All</option>
                    <option value="serious">Serious Only</option>
                    <option value="non-serious">Non-Serious Only</option>
                  </select>
                </div>

                {/* Listedness */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Listedness
                  </label>
                  <select
                    value={listednessFilter}
                    onChange={(e) => {
                      setListednessFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 border border-yellow-400 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900"
                  >
                    <option value="all">All</option>
                    <option value="Yes">Listed</option>
                    <option value="No">Unlisted</option>
                  </select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, start: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 border border-yellow-400 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, end: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 border border-yellow-400 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      fetchStudies();
                    }}
                    className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Studies List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              </div>
            ) : (
              <div className="grid gap-6">
                {studies.map((study) => (
                  <div
                    key={study.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-black mb-2">
                          {study.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-2">
                          <span>
                            <strong>Article ID:</strong> {study.id}
                          </span>
                          <span>
                            <strong>PMID:</strong>{" "}
                            <PmidLink
                              pmid={study.pmid}
                              className="text-blue-600 hover:underline"
                            />
                          </span>
                          <span>
                            <strong>Drug:</strong> {study.drugName}
                          </span>
                        </div>
                        {study.updatedAt && (
                          <p className="text-sm text-gray-600">
                            <strong>Last Updated:</strong>{" "}
                            {formatDateTime(study.updatedAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                          AOI
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          Reporting
                        </span>
                        {study.qaApprovalStatus && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              study.qaApprovalStatus === "approved"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : study.qaApprovalStatus === "rejected"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
                            }`}
                          >
                            {study.qaApprovalStatus === "approved"
                              ? study.qaApprovedBy
                                ? "Manual Approved"
                                : "System Approved"
                              : study.qaApprovalStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    {study.aoiClassification && (
                      <p className="text-sm text-gray-700 mb-3">
                        <strong>AOI Classification:</strong>{" "}
                        {study.aoiClassification}
                      </p>
                    )}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => viewReport(study)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
                      >
                        View Full Report
                      </button>
                    </div>
                  </div>
                ))}

                {studies.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="mb-3">
                      <svg
                        className="w-12 h-12 text-gray-300 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    No AOI articles in the reporting stage yet.
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {(currentPage > 1 || hasMore) && (
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasMore}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          /* Full Report Modal */
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-[95vw] max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-black">
                    AOI Full Report — {selectedStudy?.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    PMID:{" "}
                    <PmidLink
                      pmid={selectedStudy?.pmid || ""}
                      showIcon={true}
                      className="text-blue-600 hover:underline"
                    />{" "}
                    | Drug: {selectedStudy?.drugName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium flex items-center gap-2"
                    >
                      Export Report
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showExportMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[180px]">
                        <button
                          onClick={() => {
                            exportReport();
                            setShowExportMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="text-blue-600">📄</span>
                          Export as JSON
                        </button>
                        <button
                          onClick={() => {
                            exportToCSV();
                            setShowExportMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="text-orange-600">📊</span>
                          Export as CSV
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={closeReport}
                    className="text-gray-400 hover:text-gray-600 ml-2 text-xl font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Study Information */}
                <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold text-black mb-3">
                    Study Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-sm font-medium text-black">Title:</p>
                      <p className="text-sm text-black bg-white p-2 rounded border">
                        {selectedStudy?.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        Article ID:
                      </p>
                      <p className="text-sm text-black font-mono">
                        {selectedStudy?.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">PMID:</p>
                      <p className="text-sm text-black">
                        <PmidLink
                          pmid={selectedStudy?.pmid || ""}
                          showIcon={true}
                        />
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        Drug Name:
                      </p>
                      <p className="text-sm text-black">
                        {selectedStudy?.drugName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        Adverse Event:
                      </p>
                      <p className="text-sm text-black">
                        {selectedStudy?.adverseEvent}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        Workflow Stage:
                      </p>
                      <p className="text-sm text-black">
                        {selectedStudy?.workflowStage || selectedStudy?.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        QA Status:
                      </p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedStudy?.qaApprovalStatus === "approved"
                            ? "bg-green-100 text-green-800"
                            : selectedStudy?.qaApprovalStatus === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedStudy?.qaApprovalStatus || "N/A"}
                      </span>
                    </div>
                    {selectedStudy?.journal && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Journal:
                        </p>
                        <p className="text-sm text-black">
                          {selectedStudy.journal}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.publicationDate && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Publication Date:
                        </p>
                        <p className="text-sm text-black">
                          {selectedStudy.publicationDate}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.authors && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <p className="text-sm font-medium text-black">
                          Authors:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {Array.isArray(selectedStudy.authors)
                            ? selectedStudy.authors.join(", ")
                            : selectedStudy.authors}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.abstract && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <p className="text-sm font-medium text-black">
                          Abstract:
                        </p>
                        <p className="text-sm text-black bg-white p-3 rounded border max-h-32 overflow-y-auto">
                          {selectedStudy.abstract}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-black">
                        Created Date:
                      </p>
                      <p className="text-sm text-black">
                        {selectedStudy?.createdAt
                          ? formatDateTime(selectedStudy.createdAt)
                          : "N/A"}
                      </p>
                    </div>
                    {selectedStudy?.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Last Updated:
                        </p>
                        <p className="text-sm text-black">
                          {formatDateTime(selectedStudy.updatedAt)}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.createdBy && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Created By:
                        </p>
                        <p className="text-sm text-black">
                          {selectedStudy.createdBy}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.approvedBy && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Approved By:
                        </p>
                        <p className="text-sm text-black">
                          {selectedStudy.approvedBy}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AOI-Specific Assessment Data */}
                <div className="mb-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h3 className="text-lg font-semibold text-black mb-3">
                    AOI Assessment Data
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedStudy?.aoiClassification && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          AOI Classification:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.aoiClassification}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.aoiDrugEffect && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          AOI Drug Effect:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.aoiDrugEffect}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.approvedIndication && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Approved Indication:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.approvedIndication}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.listedness && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Listedness:
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            selectedStudy.listedness === "Yes"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {selectedStudy.listedness}
                        </span>
                      </div>
                    )}
                    {selectedStudy?.seriousness && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Seriousness:
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            selectedStudy.seriousness === "Serious"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {selectedStudy.seriousness}
                        </span>
                      </div>
                    )}
                    {selectedStudy?.serious !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Serious:
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            selectedStudy.serious
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {selectedStudy.serious ? "Yes" : "No"}
                        </span>
                      </div>
                    )}
                    {selectedStudy?.attributability && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Attributability:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.attributability}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.drugEffect && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Drug Effect:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.drugEffect}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.textType && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Text Type:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.textType}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.authorPerspective && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Author Perspective:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.authorPerspective}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.substanceGroup && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Substance Group:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.substanceGroup}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.leadAuthor && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Lead Author:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.leadAuthor}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.countryOfFirstAuthor && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Country of First Author:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.countryOfFirstAuthor}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.countryOfOccurrence && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Country of Occurrence:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.countryOfOccurrence}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.testSubject && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Test Subject:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.testSubject}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.sponsor && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Sponsor:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.sponsor}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.clientName && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Client Name:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.clientName}
                        </p>
                      </div>
                    )}
                    {selectedStudy?.doi && (
                      <div>
                        <p className="text-sm font-medium text-black">DOI:</p>
                        <a
                          href={
                            selectedStudy.doi.startsWith("http")
                              ? selectedStudy.doi
                              : `https://doi.org/${selectedStudy.doi}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {selectedStudy.doi}
                        </a>
                      </div>
                    )}
                    {selectedStudy?.specialCase && (
                      <div>
                        <p className="text-sm font-medium text-black">
                          Special Case:
                        </p>
                        <p className="text-sm text-black bg-white p-2 rounded border">
                          {selectedStudy.specialCase}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Long-form fields */}
                  {selectedStudy?.justification && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-black mb-1">
                        Justification:
                      </p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {selectedStudy.justification}
                      </div>
                    </div>
                  )}
                  {selectedStudy?.summary && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-black mb-1">
                        AI Summary:
                      </p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {selectedStudy.summary}
                      </div>
                    </div>
                  )}
                  {selectedStudy?.keyEvents && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-black mb-1">
                        Key Events:
                      </p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {Array.isArray(selectedStudy.keyEvents)
                          ? selectedStudy.keyEvents.join(", ")
                          : selectedStudy.keyEvents}
                      </div>
                    </div>
                  )}
                  {selectedStudy?.administeredDrugs && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-black mb-1">
                        Administered Drugs:
                      </p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {Array.isArray(selectedStudy.administeredDrugs)
                          ? selectedStudy.administeredDrugs.join(", ")
                          : selectedStudy.administeredDrugs}
                      </div>
                    </div>
                  )}
                  {selectedStudy?.relevantDates && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-black mb-1">
                        Relevant Dates:
                      </p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {typeof selectedStudy.relevantDates === "object"
                          ? JSON.stringify(selectedStudy.relevantDates, null, 2)
                          : selectedStudy.relevantDates}
                      </div>
                    </div>
                  )}
                  {selectedStudy?.patientDetails && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-black mb-1">
                        Patient Details:
                      </p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {typeof selectedStudy.patientDetails === "object"
                          ? JSON.stringify(
                              selectedStudy.patientDetails,
                              null,
                              2,
                            )
                          : selectedStudy.patientDetails}
                      </div>
                    </div>
                  )}
                  {selectedStudy?.vancouverCitation && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-black mb-1">
                        Vancouver Citation:
                      </p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {selectedStudy.vancouverCitation}
                      </div>
                    </div>
                  )}
                </div>

                {/* Comment Thread */}
                <div className="mb-6">
                  {selectedStudy && <CommentThread study={selectedStudy} />}
                </div>
              </div>

              <div className="flex justify-end items-center p-6 border-t border-gray-200">
                <button
                  onClick={closeReport}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
