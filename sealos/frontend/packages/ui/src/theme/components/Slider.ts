import { sliderAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const SliderHelper = createMultiStyleConfigHelpers(sliderAnatomy.keys);

export const Slider = SliderHelper.defineMultiStyleConfig({
  baseStyle: {
    thumb: {
      _focusVisible: {
        boxShadow: '',
        bg: 'grayModern.900'
      }
    }
  }
});
