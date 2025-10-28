import React from "react";
import Link from "next/link";

const Sidebar: React.FC = () => (
  <aside className="w-64 h-full border-r p-4 bg-gray-50">
    <nav>
      <ul className="space-y-2">
        <li><Link href="/" className="sidebar-link">Dashboard</Link></li>
        <li><Link href="/groups" className="sidebar-link">Groups</Link></li>
        <li><Link href="/expenses" className="sidebar-link">Expenses</Link></li>
        <li><Link href="/profile" className="sidebar-link">Profile</Link></li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;