import React, { useState } from "react";
import { validateEmail } from "../lib/validation";
import { notify } from "../lib/notification";

interface GroupInviteProps {
  onInvite: (email: string) => Promise<void>;
}

const GroupInvite: React.FC<GroupInviteProps> = ({ onInvite }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Invalid email address.");
      return;
    }

    setLoading(true);
    try {
      await onInvite(email);
      notify("Invitation sent.");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Failed to send invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Invite by email"
        className="input"
        required
        disabled={loading}
      />
      <button type="submit" className="btn" disabled={loading}>
        {loading ? "Inviting..." : "Invite"}
      </button>
      {error && <span className="text-red-600 ml-2">{error}</span>}
    </form>
  );
};

export default GroupInvite;