import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { PmidLink } from "@/components/PmidLink";
import PDFAttachmentUpload from "@/components/PDFAttachmentUpload";
import { CommentThread } from "@/components/CommentThread";
import { generateArticleDisplayId } from "@/utils/articleIdGenerator";

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string[] | string;
  journal: string;
  publicationDate: string;
  abstract: string;
  drugName: string;
  adverseEvent: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  comments?: any[];
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    uploadedByName?: string;
  }>;
  qaApprovalStatus?: "pending" | "approved" | "rejected";
  qaComments?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;

  aiInferenceData?: any;

  doi?: string;
  specialCase?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  patientDetails?: any;
  keyEvents?: string[];
  relevantDates?: any;
  administeredDrugs?: string[];
  attributability?: string;
  drugEffect?: string;
  summary?: string;
  identifiableHumanSubject?: boolean;
  textType?: string;
  authorPerspective?: string;
  confirmedPotentialICSR?: boolean;
  icsrClassification?: string;
  substanceGroup?: string;
  vancouverCitation?: string;
  leadAuthor?: string;
  serious?: boolean;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  aoiClassification?: string;
  justification?: string;
  listedness?: string;
  seriousness?: string;
  clientName?: string;
  sponsor?: string;
  userTag?: "ICSR" | "AOI" | "No Case" | null;
  effectiveClassification?: string;
  requiresManualReview?: boolean;

  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
  fullTextAvailability?: string;
}

interface TriageStudyDetailsProps {
  study: Study;
  onUpdate: (study: Study) => void;
  classifyStudy: (id: string, classification: string, details?: any) => void;
  selectedClassification: string | null;
  setSelectedClassification: (val: string | null) => void;
  justification: string;
  setJustification: (val: string) => void;
  listedness: string;
  setListedness: (val: string) => void;
  seriousness: string;
  setSeriousness: (val: string) => void;
  fullTextAvailability: string;
  setFullTextAvailability: (val: string) => void;
  fullTextSource?: string;
  setFullTextSource: (val: string) => void;
  classifying: string | null;
  getClassificationLabel: (study: Study) => string | null | undefined;
  getClassificationColor: (classification?: string) => string;
  getFinalClassification: (study: Study) => string | null;
  formatDate: (date: string) => string;
  API_BASE: string;
  fetchStudies: () => void;
  canClassify?: boolean;
  ignorePreExistingClassification?: boolean;
}

export default function TriageStudyDetails({
  study,
  onUpdate,
  classifyStudy,
  selectedClassification,
  setSelectedClassification,
  justification,
  setJustification,
  listedness,
  setListedness,
  seriousness,
  setSeriousness,
  fullTextAvailability,
  setFullTextAvailability,
  fullTextSource,
  setFullTextSource,
  classifying,
  getClassificationLabel,
  getClassificationColor,
  getFinalClassification,
  formatDate,
  API_BASE,
  fetchStudies,
  canClassify = true,
  ignorePreExistingClassification = false,
}: TriageStudyDetailsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* QC Rejection Notice */}
      {study.qaApprovalStatus === "rejected" && study.qaComments && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-orange-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                Classification Rejected by QC
              </h3>
              <div className="mt-2 text-sm text-orange-700">
                <p className="font-semibold">Reason:</p>
                <p className="mt-1">{study.qaComments}</p>
              </div>
              <p className="mt-3 text-xs text-orange-600">
                Please review and re-classify this article based on the QC
                feedback.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Notice */}
      {study.revokedBy && study.revocationReason && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Article Revoked
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="font-semibold">Reason:</p>
                <p className="mt-1">{study.revocationReason}</p>
              </div>
              {study.revokedAt && (
                <p className="mt-2 text-xs text-red-600">
                  Revoked on: {formatDate(study.revokedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-gray-900 mb-3">
          Literature Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-bold text-gray-700">Article ID:</span>
            <p className="mt-1 text-gray-900 font-mono">
              {generateArticleDisplayId(study)}
            </p>
          </div>
          <div>
            <span className="font-bold text-gray-700">PMID:</span>
            <p className="mt-1">
              <PmidLink pmid={study.pmid} showIcon={true} />
            </p>
          </div>
          <div>
            <span className="font-bold text-gray-700">INN & Brand Name:</span>
            <p className="mt-1 text-gray-900">{study.drugName}</p>
          </div>
          <div>
            <span className="font-bold text-gray-700">Authors:</span>
            <p className="mt-1 text-gray-900">
              {Array.isArray(study.authors)
                ? study.authors.join(", ")
                : typeof study.authors === "string"
                  ? study.authors
                  : "N/A"}
            </p>
          </div>
          <div>
            <span className="font-bold text-gray-700">Journal Name:</span>
            <p className="mt-1 text-gray-900">{study.journal || "N/A"}</p>
          </div>
          <div>
            <span className="font-bold text-gray-700">Publication Date:</span>
            <p className="mt-1 text-gray-900">
              {study.publicationDate || "N/A"}
            </p>
          </div>

          <div>
            <span className="font-bold text-gray-700">Created On:</span>
            <p className="mt-1 text-gray-900">{formatDate(study.createdAt)}</p>
          </div>
        </div>
        <div>
          <span className="font-bold text-gray-700">Title:</span>
          <p className="mt-1 text-gray-900 leading-relaxed">{study.title}</p>
        </div>
        {study.vancouverCitation && (
          <div>
            <span className="font-bold text-gray-700">
              Literature Citation:
            </span>
            <p className="mt-1 text-gray-900 text-sm italic">
              {study.vancouverCitation}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Abstract Display - REMOVED per user request */}

      {/* AI Final Classification - After Abstract */}
      {getFinalClassification(study) && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">
                AI Classification Result
              </p>
              <p className="text-2xl font-bold text-indigo-900">
                {getFinalClassification(study)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Study Metadata */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          Literature Article Overview
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {study.doi && (
            <div>
              <span className="font-bold text-gray-700">DOI:</span>
              <p className="mt-1 text-gray-900 break-all">
                <a
                  href={
                    study.doi.startsWith("http")
                      ? study.doi
                      : `https://doi.org/${study.doi}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {study.doi}
                </a>
              </p>
            </div>
          )}
          {study.leadAuthor && (
            <div>
              <span className="font-bold text-gray-700">Lead Author:</span>
              <p className="mt-1 text-gray-900">{study.leadAuthor}</p>
            </div>
          )}
          {study.countryOfFirstAuthor && (
            <div>
              <span className="font-bold text-gray-700">
                Country of first Author:
              </span>
              <p className="mt-1 text-gray-900">{study.countryOfFirstAuthor}</p>
            </div>
          )}
          {study.countryOfOccurrence && (
            <div>
              <span className="font-bold text-gray-700">
                Country of Occurrence:
              </span>
              <p className="mt-1 text-gray-900">{study.countryOfOccurrence}</p>
            </div>
          )}
          {study.substanceGroup && (
            <div>
              <span className="font-bold text-gray-700">INN:</span>
              <p className="mt-1 text-gray-900">{study.substanceGroup}</p>
            </div>
          )}
          {study.authorPerspective && (
            <div>
              <span className="font-bold text-gray-700">
                Author Perspective:
              </span>
              <p className="mt-1 text-gray-900">{study.authorPerspective}</p>
            </div>
          )}
          {study.sponsor && (
            <div>
              <span className="font-bold text-gray-700">Client Name:</span>
              <p className="mt-1 text-gray-900">{study.sponsor}</p>
            </div>
          )}
          {study.testSubject && (
            <div>
              <span className="font-bold text-gray-700">
                Subject/Participant/Patient:
              </span>
              <p className="mt-1 text-gray-900">{study.testSubject}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis & Clinical Data */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <div className="font-bold flex justify-center items-center">
            <p>AI Literature Analysis</p>
          </div>
        </h4>
        <div className="space-y-4">
          {/* Grid Layout for Analysis Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-bold text-gray-700">
                AI Identified Adverse Event(s):
              </span>
              <p className="mt-1 text-gray-900">{study.adverseEvent}</p>
            </div>
            {(study.special_case || study.specialCase) && (
              <div>
                <span className="font-bold text-gray-700">
                  AI Identified Special Situation(s):
                </span>
                <p className="mt-1 text-gray-900">
                  {study.special_case || study.specialCase}
                </p>
              </div>
            )}

            {(study.Text_type || study.textType) && (
              <div>
                <span className="font-bold text-gray-700">Article Type:</span>
                <p className="mt-1 text-gray-900">
                  {study.Text_type || study.textType}
                </p>
              </div>
            )}
            {study.approvedIndication && (
              <div>
                <span className="font-bold text-gray-700">
                  AI Assessment of Indication:
                </span>
                <p className="mt-1 text-gray-900">{study.approvedIndication}</p>
              </div>
            )}
          </div>

          {/* Text-based Fields */}
          {study.attributability && (
            <div>
              <span className="font-bold text-gray-700">
                AI Assessment of Attributability:
              </span>
              <p className="mt-1 text-gray-900 text-sm">
                {study.attributability}
              </p>
            </div>
          )}
          {study.drugEffect && (
            <div>
              <span className="font-bold text-gray-700">
                AI Identified Drug Effect{" "}
              </span>{" "}
              <span>(Beneficial/Adverse) :</span>
              <p className="mt-1 text-gray-900 text-sm">{study.drugEffect}</p>
            </div>
          )}
          {study.justification && (
            <div>
              <span className="font-bold text-gray-700">
                AI Opinion on Literature:
              </span>
              <p className="mt-1 text-gray-900 text-sm">
                {study.justification}
              </p>
            </div>
          )}

          {/* Clinical Data */}
          {study.administeredDrugs && study.administeredDrugs.length > 0 && (
            <div>
              <span className="font-bold text-gray-700">
                Administered Drugs:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {study.administeredDrugs.map((drug, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {drug}
                  </span>
                ))}
              </div>
            </div>
          )}
          {study.patientDetails && (
            <div>
              <span className="font-bold text-gray-700">Patient Details:</span>
              <div className="mt-1 bg-white rounded p-3 border">
                {typeof study.patientDetails === "object" ? (
                  <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(study.patientDetails, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-900 text-sm">
                    {study.patientDetails}
                  </p>
                )}
              </div>
            </div>
          )}
          {study.relevantDates && (
            <div>
              <span className="font-bold text-gray-700">Relevant Dates:</span>
              <div className="mt-1 bg-white rounded p-3 border">
                {typeof study.relevantDates === "object" ? (
                  <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(study.relevantDates, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-900 text-sm">{study.relevantDates}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {study.summary && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-gray-600"
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
            AI Summary
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-900 leading-relaxed">{study.summary}</p>
          </div>
        </div>
      )}

      {/* Classification Actions - Primary Feature for Triage */}
      {canClassify && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Classify Article
          </h4>

          {selectedClassification ? (
            <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium text-gray-900">
                  Classifying as{" "}
                  <span
                    className={`font-bold ${
                      selectedClassification === "ICSR"
                        ? "text-red-600"
                        : selectedClassification === "AOI"
                          ? "text-yellow-600"
                          : "text-gray-600"
                    }`}
                  >
                    {selectedClassification}
                  </span>
                </h5>
                <button
                  onClick={() => setSelectedClassification(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Justification
                  </label>
                  <select
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                  >
                    <option value="">Select justification...</option>
                    {selectedClassification === "ICSR" && (
                      <>
                        <option value="Valid Case">Valid Case</option>
                        <option value="Potential Valid case">
                          Potential Valid case
                        </option>
                      </>
                    )}
                    {selectedClassification === "AOI" && (
                      <>
                        <option value="Adverse Event">Adverse Event</option>
                        <option value="Special Situations">
                          Special Situations
                        </option>
                        <option value="Adverse Event & Special Situations">
                          Adverse Event & Special Situations
                        </option>
                        <option value="Others">Others</option>
                      </>
                    )}
                    {selectedClassification === "No Case" && (
                      <>
                        <option value="In Vitro Study">In Vitro Study</option>
                        <option value="Pre-Clinical study">
                          Pre-Clinical study
                        </option>
                        <option value="Treatment Medication">
                          Treatment Medication
                        </option>
                        <option value="Secondary analysis">
                          Secondary analysis
                        </option>
                        <option value="Others">Others</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Text Availability
                  </label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="fullTextAvailability"
                        value="Yes"
                        checked={fullTextAvailability === "Yes"}
                        onChange={(e) =>
                          setFullTextAvailability(e.target.value)
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="fullTextAvailability"
                        value="No"
                        checked={fullTextAvailability === "No"}
                        onChange={(e) =>
                          setFullTextAvailability(e.target.value)
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">No</span>
                    </label>
                  </div>
                  {fullTextAvailability === "Yes" && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Full Text Source/Comments
                      </label>
                      <textarea
                        value={fullTextSource || ""}
                        onChange={(e) => setFullTextSource(e.target.value)}
                        placeholder="Enter source or comments..."
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                {(selectedClassification === "ICSR" ||
                  selectedClassification === "AOI") && (
                  <div
                    className={`${
                      selectedClassification === "ICSR"
                        ? "bg-red-50 border-red-100"
                        : "bg-yellow-50 border-yellow-100"
                    } p-3 rounded-md border`}
                  >
                    {/* <p className="text-sm font-medium text-red-800 mb-2">Additional ICSR Options</p> */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Listedness
                        </label>
                        <div className="flex gap-2">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              className={`form-radio ${
                                selectedClassification === "ICSR"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                              name="listedness"
                              value="Listed"
                              checked={listedness === "Listed"}
                              onChange={(e) => setListedness(e.target.value)}
                            />
                            <span className="ml-2 text-xs text-gray-700">
                              Listed
                            </span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              className={`form-radio ${
                                selectedClassification === "ICSR"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                              name="listedness"
                              value="Unlisted"
                              checked={listedness === "Unlisted"}
                              onChange={(e) => setListedness(e.target.value)}
                            />
                            <span className="ml-2 text-xs text-gray-700">
                              Unlisted
                            </span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Seriousness
                        </label>
                        <div className="flex gap-2">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              className={`form-radio ${
                                selectedClassification === "ICSR"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                              name="seriousness"
                              value="Serious"
                              checked={seriousness === "Serious"}
                              onChange={(e) => setSeriousness(e.target.value)}
                            />
                            <span className="ml-2 text-xs text-gray-700">
                              Serious
                            </span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              className={`form-radio ${
                                selectedClassification === "ICSR"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                              name="seriousness"
                              value="Non-Serious"
                              checked={seriousness === "Non-Serious"}
                              onChange={(e) => setSeriousness(e.target.value)}
                            />
                            <span className="ml-2 text-xs text-gray-700">
                              Non-Serious
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedClassification(null)}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      classifyStudy(study.id, selectedClassification, {
                        justification: justification,
                        listedness:
                          selectedClassification === "ICSR" ||
                          selectedClassification === "AOI"
                            ? listedness
                            : undefined,
                        seriousness:
                          selectedClassification === "ICSR" ||
                          selectedClassification === "AOI"
                            ? seriousness
                            : undefined,
                        fullTextAvailability: fullTextAvailability,
                        fullTextSource:
                          fullTextAvailability === "Yes"
                            ? fullTextSource || ""
                            : null,
                      })
                    }
                    disabled={!justification || classifying === study.id}
                    className={`px-4 py-2 text-white rounded-md text-sm font-medium flex items-center ${
                      !justification
                        ? "bg-gray-400 cursor-not-allowed"
                        : selectedClassification === "ICSR"
                          ? "bg-red-600 hover:bg-red-700"
                          : selectedClassification === "AOI"
                            ? "bg-yellow-600 hover:bg-yellow-700"
                            : "bg-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    {classifying === study.id ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      "Confirm Classification"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : !study.userTag || ignorePreExistingClassification ? (
            <>
              <p className="text-sm text-gray-700 mb-4">
                Review the literature details above and classify this article:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setSelectedClassification("ICSR");
                    setJustification("");
                    setListedness("");
                    setSeriousness("");
                    setFullTextAvailability("");
                  }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  ICSR (Individual Case Safety Report)
                </button>
                <button
                  onClick={() => {
                    setSelectedClassification("AOI");
                    setJustification("");
                    setListedness("");
                    setSeriousness("");
                    setFullTextAvailability("");
                  }}
                  className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Article of Interest
                </button>
                <button
                  onClick={() => {
                    setSelectedClassification("No Case");
                    setJustification("");
                    setListedness("");
                    setSeriousness("");
                    setFullTextAvailability("");
                  }}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  No Case
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center mb-4 flex-wrap gap-2">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-green-700 font-medium mr-2">
                    Article classified as: {getClassificationLabel(study)}
                  </span>
                </div>
                {study.justification && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    {study.justification}
                  </span>
                )}
                {study.listedness && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    {study.listedness}
                  </span>
                )}
                {study.seriousness && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                    {study.seriousness}
                  </span>
                )}
                {study.fullTextAvailability && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    Full Text: {study.fullTextAvailability}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                This article has been classified. You can reclassify it if
                needed:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <span className="text-sm text-gray-600 mr-2 flex items-center">
                  Re-classify:
                </span>
                <button
                  onClick={() => {
                    setSelectedClassification("ICSR");
                    setJustification(study.justification || "");
                    setListedness(study.listedness || "");
                    setSeriousness(study.seriousness || "");
                    setFullTextAvailability(study.fullTextAvailability || "");
                    setFullTextSource(study.fullTextSource || "");
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm transition-colors"
                >
                  ICSR
                </button>
                <button
                  onClick={() => {
                    setSelectedClassification("AOI");
                    setJustification(study.justification || "");
                    setListedness("");
                    setSeriousness("");
                    setFullTextAvailability(study.fullTextAvailability || "");
                    setFullTextSource(study.fullTextSource || "");
                  }}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 text-sm transition-colors"
                >
                  Article of Interest
                </button>
                <button
                  onClick={() => {
                    setSelectedClassification("No Case");
                    setJustification(study.justification || "");
                    setListedness("");
                    setSeriousness("");
                    setFullTextAvailability(study.fullTextAvailability || "");
                    setFullTextSource(study.fullTextSource || "");
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm transition-colors"
                >
                  No Case
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Attachments */}
      {canClassify && (
        <PDFAttachmentUpload
          studyId={study.id}
          attachments={study.attachments || []}
          onUploadComplete={async () => {
            // Fetch the updated study with new attachments
            try {
              const token = localStorage.getItem("auth_token");
              const response = await fetch(`${API_BASE}/studies/${study.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const updatedStudy = await response.json();
                // Update the selected study to show new attachments immediately
                onUpdate(updatedStudy);
                // Also refresh the full studies list
                fetchStudies();
              }
            } catch (error) {
              console.error("Failed to refresh study:", error);
              // Fallback: just refresh the full list
              fetchStudies();
            }
          }}
        />
      )}

      {/* Comment Thread */}
      {canClassify && <CommentThread study={study} />}
    </div>
  );
}
