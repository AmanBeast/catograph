"use client";

import { useEffect } from "react";
import { useOrganizationList } from "@clerk/nextjs";

export function OrgAutoActivator({ targetOrgId }: { targetOrgId: string }) {
  const { setActive, isLoaded } = useOrganizationList();

  useEffect(() => {
    if (isLoaded && setActive && targetOrgId) {
      setActive({ organization: targetOrgId });
    }
  }, [isLoaded, setActive, targetOrgId]);

  return null;
}
