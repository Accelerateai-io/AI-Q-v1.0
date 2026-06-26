/**
 * Controlled file upload with optional validation (type, size).
 * Valid files are passed to onFilesChange; invalid ones are reported via onValidationError.
 * If user selects more than maxFiles in one go, shows a warning toast and adds no files.
 */
import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import "../../styles/file_upload.css";
import { UploadIcon } from "lucide-react";

interface FileUploadProps {
  maxFiles?: number;
  /** e.g. ".pdf,.doc,.docx,.ppt,.pptx" */
  accept?: string;
  /** Max size per file in bytes (e.g. 10 * 1024 * 1024 for 10MB). */
  maxSizeBytes?: number;
  /** Controlled: list of file names to display. */
  value?: string[];
  /** Called with updated list of file names when user adds valid files. Second arg is the newly selected File[] when available (for server upload). */
  onFilesChange?: (fileNames: string[], selectedFiles?: File[]) => void;
  /** Called when validation fails (e.g. file too large or wrong type). */
  onValidationError?: (message: string) => void;
  /** Preview/read-only: show file names and size only; no upload, replace, or delete. */
  readOnly?: boolean;
  /** Optional file sizes in bytes for read-only display (parallel to value). */
  fileSizes?: (number | undefined)[];
  /** When true, upload button is disabled and no new files can be added (existing files can still be removed unless readOnly). */
  disabled?: boolean;
}

const DEFAULT_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileUpload = ({
  maxFiles = 5,
  accept = DEFAULT_ACCEPT,
  maxSizeBytes,
  value = [],
  onFilesChange,
  onValidationError,
  readOnly = false,
  fileSizes = [],
  disabled = false,
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const getExtension = (name: string) => {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i).toLowerCase() : "";
  };

  const allowedExtensions = accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith("."));

  const isValidType = (fileName: string) => {
    if (allowedExtensions.length === 0) return true;
    const ext = getExtension(fileName);
    return allowedExtensions.includes(ext);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    setValidationMessage(null);
    onValidationError?.("");

    if (maxFiles < Infinity && selectedFiles.length > maxFiles) {
      toast.warning(`Maximum ${maxFiles} file${maxFiles === 1 ? "" : "s"} per section. No files were added.`);
      return;
    }

    const validNames: string[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      if (!isValidType(file.name)) {
        errors.push(`${file.name}: invalid type. Accepted: ${accept}`);
        continue;
      }
      if (maxSizeBytes != null && file.size > maxSizeBytes) {
        const mb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
        errors.push(`${file.name}: exceeds ${mb}MB`);
        continue;
      }
      validNames.push(file.name);
    }

    if (errors.length > 0) {
      const msg = errors.join("; ");
      setValidationMessage(msg);
      onValidationError?.(msg);
    }

    const combined = [...value, ...validNames].slice(0, maxFiles);
    const validFiles = selectedFiles.filter((f) => validNames.includes(f.name));
    const numToAdd = Math.max(0, maxFiles - value.length);
    const filesToPass = validFiles.slice(0, numToAdd);
    onFilesChange?.(combined, filesToPass.length > 0 ? filesToPass : undefined);
  };

  const removeFile = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onFilesChange?.(updated);
    setValidationMessage(null);
    onValidationError?.("");
  };

  const uploadDisabled = disabled || (maxFiles < Infinity && value.length >= maxFiles);

  return (
    <div className={`upload-container${readOnly ? " upload-container--readonly" : ""}${uploadDisabled ? " upload-container--disabled" : ""}`}>
      {!readOnly && (
        <>
          <div
            className="custom-file-button"
            onClick={() => !uploadDisabled && fileInputRef.current?.click()}
            role="button"
            aria-disabled={uploadDisabled}
          >
            <UploadIcon size={16} className="upload_icon" /> Upload Files
          </div>
          <input
            type="file"
            multiple
            accept={accept}
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={uploadDisabled}
          />
          {validationMessage && (
            <p className="upload-validation-error" style={{ color: "#b91c1c", fontSize: "0.875rem", marginTop: 4 }}>
              {validationMessage}
            </p>
          )}
        </>
      )}
      <ul className="file-list">
        {value.map((name, index) => (
          <li key={`${name}-${index}`}>
            <span className="file-list-name">{name}</span>
            {readOnly ? (
              fileSizes[index] != null ? (
                <span className="file-list-size">{formatFileSize(fileSizes[index] as number)}</span>
              ) : null
            ) : (
              <span
                className="remove-btn"
                onClick={() => removeFile(index)}
                role="button"
              >
                ×
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileUpload;
