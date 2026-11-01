"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/track";
import type { TrackEvent } from "@/lib/events";

/**
 * Link and button that count a funnel event on click, then behave exactly as
 * the plain element would. They exist so server components (the landing and
 * pricing pages) can count clicks without becoming client components.
 */

type TrackProps = { event: TrackEvent; eventProps?: Record<string, string> };

export function TrackedLink({ event, eventProps, onClick, ...rest }: ComponentProps<typeof Link> & TrackProps) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}

export function TrackedButton({ event, eventProps, onClick, ...rest }: ComponentProps<"button"> & TrackProps) {
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
