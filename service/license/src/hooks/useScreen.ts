import { useMediaQuery } from '@chakra-ui/react';

export function useScreen() {
  // ssr-friendly media query with fallback
  const [isPC] = useMediaQuery('(min-width: 650px)', {
    ssr: true,
    fallback: false // return false on the server, and re-evaluate on the client side
  });
  return {
    isPC
  };
}
