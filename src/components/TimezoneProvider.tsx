"use client";

import { createContext, useContext } from "react";

const TimezoneContext = createContext<string>("Asia/Muscat");

export function TimezoneProvider({
  children,
  initialTimezone = "Asia/Muscat",
}: {
  children: React.ReactNode;
  initialTimezone?: string;
}) {
  return (
    <TimezoneContext.Provider value={initialTimezone}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
