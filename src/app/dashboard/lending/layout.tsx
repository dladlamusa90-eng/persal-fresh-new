import React from "react";

export default function LendingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full px-4 md:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
