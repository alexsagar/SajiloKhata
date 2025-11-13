import React from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";

const ConnectionMonitor: React.FC = () => {
  const online = useOnlineStatus();

  return (
    <div className={`px-4 py-2 rounded ${online ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {online ? "Online" : "Offline - Changes will sync when reconnected."}
    </div>
  );
};

export default ConnectionMonitor;