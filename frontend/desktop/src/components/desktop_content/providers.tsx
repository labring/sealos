import { Box } from '@chakra-ui/react';
import { ReactNode, createContext, useCallback, useContext, useRef, useState } from 'react';

interface DesktopContext {
  isOpen: boolean;
  onOpen: (callback?: () => void) => void;
  onClose: (callback?: () => void) => void;
}

export const DesktopContext = createContext<DesktopContext | null>(null);

export const useDesktopContext = () => useContext(DesktopContext);

export default function DesktopProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const callbackRef = useRef(() => {});

  const onOpen = useCallback((callback?: () => void) => {
    setIsOpen(true);
    if (callback) {
      callbackRef.current = callback;
    }
  }, []);

  const onClose = useCallback((callback?: () => void) => {
    setIsOpen(false);
    callbackRef.current();
    if (callback) {
      callback();
    }
  }, []);

  const contextValue = {
    isOpen,
    onOpen,
    onClose
  };

  return (
    <DesktopContext.Provider value={contextValue}>
      {isOpen && (
        <Box
          position={'fixed'}
          inset={0}
          zIndex={'998'}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}
      {children}
    </DesktopContext.Provider>
  );
}
