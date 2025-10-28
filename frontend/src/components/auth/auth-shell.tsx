import Image from "next/image";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    // Full-bleed wrapper: take the whole viewport width & height
    <div className="min-h-dvh w-screen overflow-hidden grid min-[1024px]:grid-cols-[30%_70%]">
      {/* Left: form pane (smaller width) */}
      <div className="min-w-0 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xs">{children}</div>
      </div>

      {/* Right: image pane (larger width), fill entire column */}
      <aside className="relative hidden min-[1024px]:block w-full h-full min-h-dvh min-w-0">
        <Image
          src="https://res.cloudinary.com/dtuqbqgz7/image/upload/v1755193802/96a924af-0fcd-4414-a378-55416e7fb2a6_owhasx.jpg?v=2"
          alt="Auth illustration"
          fill
          sizes="(min-width: 1024px) 70vw, 0px"
          className="object-cover"
          priority
        />
        {/* optional contrast overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#0f1216]/55 to-transparent" />
      </aside>
    </div>
  );
}
