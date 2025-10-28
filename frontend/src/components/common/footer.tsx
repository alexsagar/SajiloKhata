import React from "react";

const Footer: React.FC = () => (
  <footer className="w-full text-center py-4 border-t bg-gray-50">
    <span>© {new Date().getFullYear()} Splitwise Clone. All rights reserved.</span>
  </footer>
);

export default Footer;