import React from "react";
import { OfflineManager } from "../lib/offline-manager";

interface OfflineQueueProps {
  manager: OfflineManager;
}

const OfflineQueue: React.FC<OfflineQueueProps> = ({ manager }) => (
  <div className="p-4 bg-white rounded shadow">
    <h4 className="font-semibold mb-2">Offline Queue</h4>
    {manager.queue.length === 0 ? (
      <p className="text-gray-500">No pending actions.</p>
    ) : (
      <ul className="list-disc ml-4">
        {manager.queue.map((action, idx) => (
          <li key={idx}>{action.type || "Pending action"}</li>
        ))}
      </ul>
    )}
  </div>
);

export default OfflineQueue;