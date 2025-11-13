import React, { useRef, useState } from "react";
import { notify } from "@/lib/notification";

interface FileUploadProps {
  accept?: string;
  onUpload: (file: File) => Promise<void>;
  label?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ accept, onUpload, label = "Upload File" }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      await onUpload(file);
      notify("File uploaded successfully.");
    } catch (err: any) {
      notify(err?.message || "File upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={loading}
      />
      <button
        className="btn"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Uploading..." : label}
      </button>
    </div>
  );
};

export default FileUpload;