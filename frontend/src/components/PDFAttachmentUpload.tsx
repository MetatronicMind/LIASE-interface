"use client";
import { useState } from "react";
import { getApiBaseUrl } from "@/config/api";

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedByName?: string;
}

interface PDFAttachmentUploadProps {
  studyId: string;
  attachments: Attachment[];
  onUploadComplete: () => void;
  maxFiles?: number;
}

export default function PDFAttachmentUpload({
  studyId,
  attachments,
  onUploadComplete,
  maxFiles = 5
}: PDFAttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types
    const invalidFiles = Array.from(files).filter(
      file => file.type !== "application/pdf"
    );
    if (invalidFiles.length > 0) {
      setUploadError("Only PDF files are allowed");
      return;
    }

    // Validate file count
    if (files.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed per upload`);
      return;
    }

    // Validate file sizes (10MB per file)
    const oversizedFiles = Array.from(files).filter(
      file => file.size > 10 * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      setUploadError("Each file must be less than 10MB");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append("files", file);
      });

      const token = localStorage.getItem("auth_token");
      
      console.log(`Uploading ${files.length} file(s) to study ${studyId}`);
      
      const response = await fetch(
        `${getApiBaseUrl()}/studies/${studyId}/attachments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to upload files";
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
          console.error('Upload error response:', error);
        } catch (e) {
          console.error('Failed to parse error response');
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      onUploadComplete();
      
      // Reset file input
      event.target.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId: string, fileName: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${getApiBaseUrl()}/studies/${studyId}/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    setDeleting(attachmentId);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${getApiBaseUrl()}/studies/${studyId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete file");
      }

      onUploadComplete();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(error.message || "Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
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
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          PDF Attachments
          {attachments && attachments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {attachments.length}
            </span>
          )}
        </h4>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? (
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Upload PDF
              </>
            )}
          </span>
        </label>
      </div>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{uploadError}</p>
        </div>
      )}

      {attachments && attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <div className="flex items-center flex-1 min-w-0">
                <svg
                  className="w-8 h-8 text-red-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                    {attachment.uploadedByName && ` • ${attachment.uploadedByName}`}
                    {" • "}
                    {new Date(attachment.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-3">
                <button
                  onClick={() => handleDownload(attachment.id, attachment.fileName)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition"
                  title="Download"
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deleting === attachment.id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === attachment.id ? (
                    <svg
                      className="animate-spin h-5 w-5"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <svg
            className="w-12 h-12 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No PDF attachments yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload supporting documents (Max {maxFiles} files, 10MB each)
          </p>
        </div>
      )}
    </div>
  );
}
