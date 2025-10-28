import React from "react";
import Link from "next/link";
import { useAuth } from "../hooks/use-auth";

const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow">
      <div className="flex space-x-4">
        <Link href="/" className="nav-link">Home</Link>
        <Link href="/groups" className="nav-link">Groups</Link>
        <Link href="/expenses" className="nav-link">Expenses</Link>
        <Link href="/profile" className="nav-link">Profile</Link>
      </div>
      <div>
        {isAuthenticated ? (
          <button className="btn" onClick={logout}>
            Logout ({user?.name})
          </button>
        ) : (
          <Link href="/login" className="btn">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation;