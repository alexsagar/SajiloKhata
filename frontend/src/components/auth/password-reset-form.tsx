import React, { useState } from "react";
import { validateEmail } from "@/lib/validation";
import { notify } from "@/lib/notification";
import { resetPassword } from "@/lib/auth";

const PasswordResetForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
      notify("Password reset instructions sent to your email.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset instructions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
      <label className="block mb-2">
        Email Address
        <input
          type="email"
          className="input w-full mt-1"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={loading || success}
        />
      </label>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      {success ? (
        <p className="text-green-600 mb-2">Check your email for reset instructions.</p>
      ) : (
        <button
          type="submit"
          className="btn w-full"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      )}
    </form>
  );
};

export default PasswordResetForm;