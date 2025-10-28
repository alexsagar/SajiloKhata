import React from "react";

interface SyncStatusProps {
  syncing: boolean;
  lastSync?: Date;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ syncing, lastSync }) => (
  <div className="px-4 py-2 rounded bg-gray-100 text-gray-700">
    {syncing
      ? "Syncing..."
      : lastSync
      ? `Last synced: ${lastSync.toLocaleString()}`
      : "All data synced"}
  </div>
);

export default SyncStatus;