"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 5000;

export default function LiveStatusRefresh() {
  const router = useRouter();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
      setLastRefreshedAt(new Date());
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <p className="mt-2 text-xs text-gray-500">
      Live status is on. Auto-refreshing every 5 seconds. Last refresh: {lastRefreshedAt.toLocaleTimeString("en-ZA")}.
    </p>
  );
}
