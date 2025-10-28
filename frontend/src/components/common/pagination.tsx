import React from "react";

interface PaginationProps {
  current: number;
  total: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ current, total, onPageChange }) => {
  if (total <= 1) return null;
  return (
    <div className="flex space-x-2 justify-center py-4">
      {[...Array(total)].map((_, i) => (
        <button
          key={i}
          className={`btn ${current === i + 1 ? "btn-active bg-blue-600 text-white" : ""}`}
          onClick={() => onPageChange(i + 1)}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
};

export default Pagination;