import { useState, useEffect } from 'react';
import { useColorMode, IconButton } from '@chakra-ui/react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppDisplayConfigStore } from '@/stores/appDisplayConfig';

const MotionIconButton = motion(IconButton);

export const ThemeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isRotating, setIsRotating] = useState(false);
  const { updateBackgroundImage } = useAppDisplayConfigStore();

  useEffect(() => {
    if (colorMode === 'light') {
      updateBackgroundImage('/images/bg-light.svg');
    } else {
      updateBackgroundImage('/images/bg-dark.svg');
    }
  }, [colorMode, updateBackgroundImage]);

  const handleToggle = () => {
    setIsRotating(true);
    toggleColorMode();
    setTimeout(() => setIsRotating(false), 700);
  };

  return (
    <MotionIconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      onClick={handleToggle}
      variant="ghost"
      borderRadius="full"
      size="md"
      animate={{
        rotate: isRotating ? [0, 360] : 0,
        scale: isRotating ? [1, 0.8, 1.1, 1] : 1
      }}
      transition={{
        duration: 0.7,
        ease: 'easeInOut'
      }}
      _hover={{
        transform: 'scale(1.05)',
        transition: 'transform 0.2s ease',
        bg: 'muted'
      }}
      _active={{
        transform: 'scale(0.95)',
        bg: 'secondary'
      }}
      color="foreground"
    />
  );
};
