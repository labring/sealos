"use client";

import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const colors = {
  color: {
    ok: "#399c3d",
    warning: "#ff9800",
    error: "#ce3933",
    success: "#206923",
    terminated: "#9dabb5",
    vague: "#ededed",
    info: "#2d81a4",
  },
};

export const theme = extendTheme({ colors });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </CacheProvider>
  );
}
