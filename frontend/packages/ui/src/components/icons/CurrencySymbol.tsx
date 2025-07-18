import { Icon, IconProps, Text, TextProps } from '@chakra-ui/react';

export default function CurrencySymbol({
  type = 'shellCoin',
  shellCoin,
  ...props
}: {
  shellCoin?: IconProps;
  type?: 'shellCoin' | 'cny' | 'usd';
} & TextProps) {
  return type === 'shellCoin' ? (
    <Icon
      width="16px"
      height="16px"
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...shellCoin}
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="9.74"
        fill="url(#paint0_linear_6527_5029)"
        stroke="url(#paint1_linear_6527_5029)"
        strokeWidth="0.52"
      />
      <circle cx="10.4999" cy="10.5" r="8.7366" fill="url(#paint2_linear_6527_5029)" />
      <path
        d="M10.5001 19.2366C15.3251 19.2366 19.2367 15.3251 19.2367 10.5C19.2367 8.51948 18.5776 6.69285 17.4669 5.22748C16.9078 5.1486 16.3365 5.1078 15.7557 5.1078C9.48437 5.1078 4.32379 9.86329 3.68327 15.9649C5.28447 17.9597 7.74313 19.2366 10.5001 19.2366Z"
        fill="url(#paint3_linear_6527_5029)"
      />
      <circle cx="10.5001" cy="10.5" r="6.77549" fill="url(#paint4_linear_6527_5029)" />
      <path
        d="M7.70814 10.1938C8.27021 11.0156 9.43312 10.9426 9.43312 10.9426C9.14239 10.6606 8.95342 10.4029 8.93404 9.66862C8.91465 8.93435 8.49795 8.73984 8.49795 8.73984C9.24414 8.26815 8.97764 7.75757 8.95342 7.18863C8.93888 6.83365 9.14724 6.57106 9.31198 6.42032C8.36376 6.56286 7.50696 7.0672 6.92019 7.82819C6.33342 8.58918 6.06197 9.54808 6.16244 10.505C6.23028 10.3154 7.18968 9.43521 7.70814 10.1938Z"
        fill="url(#paint5_linear_6527_5029)"
      />
      <path
        d="M14.5936 8.73015C14.5685 8.65023 14.5377 8.57222 14.5015 8.49674V8.49187C14.3324 8.1466 14.052 7.86879 13.7059 7.70351C13.3597 7.53822 12.968 7.49516 12.5944 7.58129C12.2208 7.66743 11.8871 7.87772 11.6475 8.17806C11.4079 8.47839 11.2764 8.85115 11.2744 9.23587C11.2745 9.35686 11.2875 9.4775 11.3132 9.59571C11.3133 9.59733 11.3133 9.59895 11.3132 9.60057C11.3229 9.6492 11.3374 9.69783 11.352 9.74645C11.4385 10.089 11.4553 10.4455 11.4015 10.7948C11.3476 11.144 11.2242 11.4787 11.0387 11.7791C10.8531 12.0794 10.6091 12.3391 10.3213 12.5427C10.0335 12.7463 9.70782 12.8897 9.36362 12.9642C9.01941 13.0387 8.66378 13.0428 8.31794 12.9764C7.9721 12.9099 7.64315 12.7742 7.35071 12.5774C7.05828 12.3806 6.80835 12.1266 6.61586 11.8307C6.42337 11.5348 6.29225 11.203 6.23034 10.8552C6.31789 11.4582 6.53066 12.036 6.85485 12.5512C7.17904 13.0665 7.60745 13.5077 8.11232 13.8462C8.61719 14.1848 9.18728 14.4132 9.78568 14.5166C10.3841 14.62 10.9975 14.5962 11.5861 14.4466C12.1747 14.2971 12.7255 14.0251 13.2028 13.6484C13.68 13.2716 14.0731 12.7985 14.3567 12.2596C14.6402 11.7208 14.8077 11.1281 14.8486 10.5201C14.8894 9.91214 14.8025 9.30231 14.5936 8.73015Z"
        fill="url(#paint6_linear_6527_5029)"
      />
      <path
        d="M13.8715 9.902C13.8715 12.0209 12.1599 13.7387 10.0485 13.7387C8.92781 13.7387 7.91978 13.2548 7.22052 12.4839C7.26287 12.5163 7.30635 12.5475 7.35071 12.5774C7.64315 12.7742 7.9721 12.9099 8.31794 12.9764C8.66378 13.0428 9.01941 13.0387 9.36362 12.9642C9.70782 12.8897 10.0335 12.7463 10.3213 12.5427C10.6091 12.3391 10.8531 12.0794 11.0387 11.7791C11.2242 11.4787 11.3476 11.144 11.4015 10.7948C11.4553 10.4455 11.4385 10.089 11.352 9.74645C11.3374 9.69783 11.3229 9.6492 11.3132 9.60057C11.3133 9.59895 11.3133 9.59733 11.3132 9.59571C11.2875 9.4775 11.2745 9.35686 11.2744 9.23587C11.2764 8.85115 11.4079 8.47839 11.6475 8.17806C11.8871 7.87772 12.2208 7.66743 12.5944 7.58129C12.7485 7.54576 12.9056 7.53216 13.0614 7.54011C13.569 8.19128 13.8715 9.01119 13.8715 9.902Z"
        fill="url(#paint7_linear_6527_5029)"
      />
      <g filter="url(#filter0_d_6527_5029)">
        <path
          d="M14.0419 3.99261L14.4409 4.70878L15.1571 5.10778L14.4409 5.50678L14.0419 6.22294L13.6429 5.50678L12.9268 5.10778L13.6429 4.70878L14.0419 3.99261Z"
          fill="#F7F7F7"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_6527_5029"
          x="8.92676"
          y="3.99261"
          width="10.2303"
          height="10.2303"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_6527_5029" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_6527_5029"
            result="shape"
          />
        </filter>
        <linearGradient
          id="paint0_linear_6527_5029"
          x1="6"
          y1="1.5"
          x2="15.5"
          y2="19.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F0F0F0" />
          <stop offset="1" stopColor="#EBEBED" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_6527_5029"
          x1="16.5"
          y1="18.5"
          x2="3.5"
          y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2B3750" />
          <stop offset="1" stopColor="#9AA4B9" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_6527_5029"
          x1="4.50004"
          y1="4.00002"
          x2="15.5"
          y2="18"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D6D8DF" />
          <stop offset="1" stopColor="#DADCE3" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_6527_5029"
          x1="16.5"
          y1="16.5"
          x2="6.50004"
          y2="8.50002"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ABAFBF" />
          <stop offset="1" stopColor="#B7BACC" />
        </linearGradient>
        <linearGradient
          id="paint4_linear_6527_5029"
          x1="7.5"
          y1="4.50002"
          x2="14.5"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9DA1B3" />
          <stop offset="1" stopColor="#535A73" />
        </linearGradient>
        <linearGradient
          id="paint5_linear_6527_5029"
          x1="7.49998"
          y1="6.50003"
          x2="13.5"
          y2="14.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FCFCFC" />
          <stop offset="1" stopColor="#DDDFE6" />
        </linearGradient>
        <linearGradient
          id="paint6_linear_6527_5029"
          x1="7.49998"
          y1="6.50003"
          x2="13.5"
          y2="14.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FCFCFC" />
          <stop offset="1" stopColor="#DDDFE6" />
        </linearGradient>
        <linearGradient
          id="paint7_linear_6527_5029"
          x1="7.49998"
          y1="6.50003"
          x2="13.5"
          y2="14.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FCFCFC" />
          <stop offset="1" stopColor="#DDDFE6" />
        </linearGradient>
      </defs>
    </Icon>
  ) : type === 'cny' ? (
    <Text {...props}>￥</Text>
  ) : (
    <Text {...props}>$</Text>
  );
}
