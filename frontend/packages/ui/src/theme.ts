import { extendTheme } from '@chakra-ui/react';
import { colors } from './colors';
import { components } from './components';
import { fontSizes } from './fontSizes';
export const theme = extendTheme({
  colors,
  components,
  fontSizes
});
