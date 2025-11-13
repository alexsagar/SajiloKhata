import React, { useEffect, useState } from "react";
import { offlineManager as defaultManager } from "@/lib/offline-manager";

interface OfflineQueueProps {
  manager?: typeof defaultManager;
}

const OfflineQueue: React.FC<OfflineQueueProps> = ({ manager = defaultManager }) => {
  const [actions, setActions] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    manager.getPendingActions().then(list => {
      if (mounted) setActions(list)
    })
    const id = setInterval(() => {
      manager.getPendingActions().then(list => {
        if (mounted) setActions(list)
      })
    }, 3000)
    return () => { mounted = false; clearInterval(id) }
  }, [manager])

  return (
    <div className="p-4 bg-white rounded shadow">
      <h4 className="font-semibold mb-2">Offline Queue</h4>
      {actions.length === 0 ? (
        <p className="text-gray-500">No pending actions.</p>
      ) : (
        <ul className="list-disc ml-4">
          {actions.map((action: any, idx: number) => (
            <li key={idx}>{action.type || "Pending action"}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OfflineQueue;