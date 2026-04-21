"use client";

import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface DocumentsTabProps {
  employee: any;
  formatDate: (dateString: string) => string;
  formatFileSize: (bytes: number) => string;
  getDocumentIcon: (fileName: string) => string;
}

export default function DocumentsTab({
  employee,
  formatDate,
  formatFileSize,
  getDocumentIcon,
}: DocumentsTabProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getDocumentDisplayName = (doc: any) => {
    if (!doc) return "Untitled Document";
    if (typeof doc.documentName === "string" && doc.documentName.trim()) {
      return doc.documentName.trim();
    }
    if (typeof doc.name === "string" && doc.name.trim()) {
      return doc.name.trim();
    }
    if (typeof doc.title === "string" && doc.title.trim()) {
      return doc.title.trim();
    }
    if (typeof doc.fileName === "string" && doc.fileName.trim()) {
      return doc.fileName.trim();
    }
    if (
      typeof doc.originalFileName === "string" &&
      doc.originalFileName.trim()
    ) {
      return doc.originalFileName.trim();
    }
    if (typeof doc.filePath === "string" && doc.filePath.trim()) {
      const segment = doc.filePath.split("/").pop();
      if (segment) {
        return segment.replace(/\.[^/.]+$/, "");
      }
    }
    return "Untitled Document";
  };

  const getDocumentFileName = (doc: any) => {
    if (!doc) return "";
    if (
      typeof doc.originalFileName === "string" &&
      doc.originalFileName.trim()
    ) {
      return doc.originalFileName.trim();
    }
    if (typeof doc.fileName === "string" && doc.fileName.trim()) {
      return doc.fileName.trim();
    }
    if (typeof doc.filePath === "string" && doc.filePath.trim()) {
      const segment = doc.filePath.split("/").pop();
      return segment || "";
    }
    if (typeof doc.name === "string" && doc.name.trim()) {
      return doc.name.trim();
    }
    return "";
  };

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const response = await fetch("/api/documents", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error("Failed to fetch documents:", response.status);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setSelectedFile(file);
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setDocumentName((prev) => prev || nameWithoutExtension);
        return;
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed"
        );
        return;
      }

      setSelectedFile(file);
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setDocumentName((prev) =>
        prev && prev.trim().length > 0 ? prev : nameWithoutExtension
      );
    }
  };

  const handleDocumentUpload = async () => {
    if (!selectedFile || !documentType || !documentName) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setUploadLoading(true);
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", documentType);
      formData.append("name", documentName);
      if (expiryDate) {
        formData.append("expiryDate", expiryDate);
      }

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const response = await fetch("/api/documents", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const data = await response.json();
        setDocuments([data.document, ...documents]);
        toast.success("Document uploaded successfully");

        setTimeout(() => {
          setShowUploadModal(false);
          resetUploadForm();
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to upload document");
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDocumentDelete = (document: any) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== documentToDelete.id));
        toast.success("Document deleted successfully");
        setShowDeleteModal(false);
        setDocumentToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete document");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDocumentDownload = async (document: any) => {
    try {
      toast.success("Downloading document...");
      const response = await fetch(`/api/documents/${document.id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = document.name;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
        toast.success("Document downloaded successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to download document");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setDocumentType("");
    setDocumentName("");
    setExpiryDate("");
    setUploadProgress(0);
    setIsUploading(false);
  };

  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    const displayName = getDocumentDisplayName(doc).toLowerCase();
    const fileName = getDocumentFileName(doc).toLowerCase();
    const docType = doc.type?.toLowerCase() ?? "";
    return (
      displayName.includes(query) ||
      fileName.includes(query) ||
      docType.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
          <h3 className="text-lg font-semibold text-blue-600">
            Employee Uploads
          </h3>
          <span className="text-sm text-gray-500">
            ({documents.length} documents)
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors shadow-sm"
          >
            <CloudArrowUpIcon className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Documents Grid */}
      {documentsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-24 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDocuments.map((document) => {
            const displayName =
              document.documentName && document.documentName.trim().length > 0
                ? document.documentName.trim()
                : getDocumentDisplayName(document);
            const fileName = getDocumentFileName(document);
            const extension =
              (document.filePath || fileName)?.split(".").pop()?.toUpperCase() ??
              "FILE";

            return (
              <div
                key={document.id}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDocumentDownload(document);
                  }
                }}
                className="group relative flex h-48 w-full flex-col items-start justify-between rounded-[22px] border border-slate-200 bg-white px-6 py-5 text-left shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)] outline-none transition-all duration-200 hover:border-blue-500 hover:shadow-[0_10px_24px_-12px_rgba(37,99,235,0.3)] focus:border-blue-500 focus:shadow-[0_10px_24px_-12px_rgba(37,99,235,0.3)]"
                onClick={() => handleDocumentDownload(document)}
              >
                <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDocumentDownload(document);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDocumentDelete(document);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-[18px] bg-slate-100">
                  <div className="text-2xl text-blue-600">
                    {getDocumentIcon(document.filePath || fileName || displayName)}
                  </div>
                  <span className="mt-1 text-[11px] font-medium text-slate-600">
                    {extension}
                  </span>
                </div>

                <div className="mt-4 flex w-full flex-col gap-2">
                  <h4 className="max-w-full truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <CalendarDaysIcon className="h-3.5 w-3.5" />
                    <span>
                      {new Date(
                        document.uploadedAt || document.createdAt
                      ).toLocaleDateString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {document.fileSize && (
                    <p className="text-[11px] text-slate-400">
                      {formatFileSize(document.fileSize)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No documents uploaded yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Start building your document library by uploading your first file.
            Supported formats include PDF, DOC, DOCX, and images.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors shadow-sm"
          >
            <CloudArrowUpIcon className="h-5 w-5" />
            <span>Upload Your First Document</span>
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Document
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="passport">Passport</option>
                    <option value="visa">Visa</option>
                    <option value="license">Driver's License</option>
                    <option value="certificate">Certificate</option>
                    <option value="contract">Contract</option>
                    <option value="resume">Resume</option>
                    <option value="id_proof">ID Proof</option>
                    <option value="address_proof">Address Proof</option>
                    <option value="education_certificate">
                      Education Certificate
                    </option>
                    <option value="experience_certificate">
                      Experience Certificate
                    </option>
                    <option value="offer_letter">Offer Letter</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Enter document name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      id="modal-document-upload"
                    />
                    <label
                      htmlFor="modal-document-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <CloudArrowUpIcon className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Click to select or drag and drop
                      </span>
                      <span className="text-xs text-gray-400">
                        PDF, DOC, DOCX, JPG, JPEG, PNG (max 10MB)
                      </span>
                    </label>
                  </div>
                  {selectedFile && (
                    <div
                      className={`mt-2 p-2 rounded-md ${
                        selectedFile.size > 10 * 1024 * 1024
                          ? "bg-red-50 border border-red-200"
                          : "bg-green-50 border border-green-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm ${
                              selectedFile.size > 10 * 1024 * 1024
                                ? "text-red-800"
                                : "text-green-800"
                            }`}
                          >
                            {selectedFile.name} (
                            {formatFileSize(selectedFile.size)})
                          </span>
                        </div>
                        <button
                          onClick={handleRemoveSelectedFile}
                          className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 transition-colors"
                          title="Remove file"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      {selectedFile.size > 10 * 1024 * 1024 && (
                        <div className="mt-2 flex items-start space-x-2">
                          <svg
                            className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <div className="text-sm text-red-700">
                            <p className="font-medium">
                              File size exceeds limit
                            </p>
                            <p>Please select a file smaller than 10MB.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUploading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="text-blue-600 font-medium">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    {selectedFile && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="text-lg">
                          {getDocumentIcon(selectedFile.name)}
                        </div>
                        <span>{selectedFile.name}</span>
                        <span>({formatFileSize(selectedFile.size)})</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDocumentUpload}
                    disabled={
                      uploadLoading ||
                      isUploading ||
                      !selectedFile ||
                      !documentType ||
                      !documentName ||
                      (selectedFile && selectedFile.size > 10 * 1024 * 1024)
                    }
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
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
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-4 w-4" />
                        <span>Upload Document</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Document
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <svg
                    className="h-6 w-6"
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

              <div className="flex items-center space-x-3 mb-6">
                <div className="flex-shrink-0">
                  <svg
                    className="h-12 w-12 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-1">
                    Delete document?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete "
                    {getDocumentDisplayName(documentToDelete)}"? This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {deleteLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
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
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4" />
                      <span>Delete Document</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
