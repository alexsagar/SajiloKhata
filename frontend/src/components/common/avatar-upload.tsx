import React, { useRef, useState } from "react";
import ImagePreview from "./image-preview";
import { notify } from "@/lib/notification";

interface AvatarUploadProps {
  initialUrl?: string;
  onUpload: (file: File) => Promise<string>;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ initialUrl, onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(initialUrl);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await onUpload(file);
      setPreview(url);
      notify("Avatar updated successfully.");
    } catch (err: any) {
      notify(err?.message || "Failed to upload avatar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {preview && <ImagePreview src={preview} alt="Avatar" />}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={loading}
      />
      <button
        className="btn mt-2"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Uploading..." : "Change Avatar"}
      </button>
    </div>
  );
};

export default AvatarUpload;