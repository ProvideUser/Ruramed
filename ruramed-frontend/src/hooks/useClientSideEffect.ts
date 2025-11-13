import { useEffect, useState } from 'react';

/**
 * Custom hook to ensure effects only run on client side
 * Prevents SSR/hydration issues with localStorage and browser APIs
 */
export function useClientSideEffect(effect: () => void | (() => void), deps: React.DependencyList = []) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      return effect();
    }
  }, [isMounted, ...deps]);

  return isMounted;
}
