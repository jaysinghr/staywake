import React, { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";

import { useAlarm } from "@/src/store/AlarmContext";

// Centralized navigation driven by the wake-session state machine.
// Any phase change routes the user to the correct interrupt screen.
export default function SessionNavigator() {
  const { session } = useAlarm();
  const router = useRouter();
  const pathname = usePathname();
  const prevKey = useRef<string>("");

  useEffect(() => {
    if (!session) return;
    const key = `${session.phase}-${session.cycle}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    switch (session.phase) {
      case "ringing":
        router.replace("/ring");
        break;
      case "dismiss-mission":
        router.replace("/mission");
        break;
      case "checkin-ringing":
        router.replace("/checkin");
        break;
      case "checkin-mission":
        router.replace("/mission");
        break;
      case "success":
        router.replace("/success");
        break;
      case "awake":
        if (pathname !== "/") router.replace("/");
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase, session?.cycle]);

  return null;
}
