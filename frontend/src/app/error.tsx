"use client";
import { ErrorState } from "@/components/common/ErrorState";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      message="Er ging iets mis bij het laden van deze pagina. Probeer het opnieuw."
      onRetry={reset}
    />
  );
}
