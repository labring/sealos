import { Global } from '@emotion/react'

const Fonts = () => (
  <Global
    styles={`
      /* latin */
      @font-face {
        font-family: 'PingFang SC';
        font-style: normal;
        src: url('/fonts/PingFang-SC-Regular.ttf');
      }`}
  />
)

export default Fonts