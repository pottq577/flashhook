"use client";

import { useEffect } from "react";

export function ClarityScript({ clarityId }: { clarityId: string | undefined }) {
  useEffect(() => {
    const isValid = clarityId && /^[a-zA-Z0-9]+$/.test(clarityId);
    if (!isValid) {
      console.warn(
        "[ClarityScript] NEXT_PUBLIC_CLARITY_PROJECT_ID is missing or invalid. Skipping initialization."
      );
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("[ClarityScript] Clarity initialized", { projectId: clarityId });
    }
  }, [clarityId]);

  return null;
}
