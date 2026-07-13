"use client";

import { useEffect, useState } from "react";

import { env } from "@viraltiktokslideshows/env/web";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

export type PurchaseStatus = "PENDING" | "PAID" | "FAILED" | "CANCELED";

export type PurchaseSummary = {
  id: string;
  idea: string;
  slides: { index: number; text: string }[];
  status: PurchaseStatus;
  createdAt: string;
};

export async function fetchPurchases(): Promise<PurchaseSummary[]> {
  const res = await fetch(`${SERVER_URL}/api/purchases`, { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.purchases) ? data.purchases : [];
}

export async function fetchPurchase(id: string): Promise<PurchaseSummary | null> {
  const res = await fetch(`${SERVER_URL}/api/checkout/status?purchase=${id}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.error) return null;
  return { id, idea: data.idea ?? "", slides: data.slides ?? [], status: data.status, createdAt: "" };
}

// No real plan/subscription backend exists yet — this is a real count (of
// this user's purchase attempts this calendar month) against a cosmetic
// soft cap for display parity with the design. It doesn't gate anything;
// see docs/dashboard-spec.md and the sidebar-improvements note about the
// Pro-plan/credits model needing a real product decision before it's
// actually enforced.
const DISPLAY_CAP = 60;

export function useMonthlyUsage() {
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPurchases()
      .then((purchases) => {
        if (cancelled) return;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const count = purchases.filter((p) => new Date(p.createdAt) >= startOfMonth).length;
        setUsed(count);
      })
      .catch(() => {
        if (!cancelled) setUsed(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { used: used ?? 0, cap: DISPLAY_CAP, isLoading: used === null };
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
