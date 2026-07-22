"use client";

import { browserAuth } from "@/auth/browser";
import { Button } from "@chakra-ui/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SessionControl() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    void browserAuth.isAuthenticated().then(setIsAuthenticated);
    const unsubscribe = browserAuth.onAuthStateChange(setIsAuthenticated);

    return unsubscribe;
  }, []);

  if (!isAuthenticated || pathname === "/login") return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      position="fixed"
      right="4"
      bottom="4"
      zIndex="popover"
      onClick={async () => {
        await browserAuth.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
