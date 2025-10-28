import React from "react";

interface GroupCardProps {
  name: string;
  members: number;
  onClick: () => void;
  description?: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ name, members, onClick, description }) => (
  <div
    className="card bg-white rounded shadow p-4 cursor-pointer hover:bg-blue-50"
    onClick={onClick}
    tabIndex={0}
    role="button"
    aria-label={`Open group ${name}`}
  >
    <h4 className="text-lg font-bold">{name}</h4>
    <p className="text-gray-600">{members} members</p>
    {description && <p className="text-gray-500 mt-2">{description}</p>}
  </div>
);

export default GroupCard;