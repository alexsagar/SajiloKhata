import React from "react";

interface ImagePreviewProps {
  src: string;
  alt?: string;
  className?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt = "Preview", className }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} className={`max-w-full h-auto rounded ${className || ""}`} />
);

export default ImagePreview;