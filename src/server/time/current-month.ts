import "server-only";

import { cache } from "react";

import { getMonthKeyInTimeZone } from "@/lib/transactions";

export const getCurrentMonthKey = cache(() =>
  getMonthKeyInTimeZone(new Date()),
);
