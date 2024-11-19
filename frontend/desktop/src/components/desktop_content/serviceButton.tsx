import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import { Box, Center, Flex, Icon, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

const OnlineServiceButton = () => {
  const { isServiceButtonOpen, setServiceButtonOpen } = useDesktopConfigStore();
  const { t } = useTranslation();
  const { layoutConfig } = useConfigStore();

  return (
    <Box zIndex={9999} position="absolute" right="0px" bottom="80px">
      <Flex
        w={isServiceButtonOpen ? '58px' : '20px'}
        h={isServiceButtonOpen ? '62px' : '44px'}
        position="relative"
        flexDirection={'column'}
        alignItems={'center'}
        justifyContent={'center'}
        borderRadius="8px 0px 0px 8px"
        borderTop="1px solid #69AEFF"
        borderBottom="1px solid #69AEFF"
        borderLeft="1px solid #69AEFF"
        background="linear-gradient(139deg, rgba(255, 255, 255, 0.80) 0%, rgba(255, 255, 255, 0.70) 100%)"
        boxShadow="0px 12px 32px -4px rgba(0, 23, 86, 0.20)"
        backdropFilter="blur(200px)"
        cursor="pointer"
        onClick={(e) => {
          if (!isServiceButtonOpen) {
            setServiceButtonOpen(true);
          } else {
            window.open(layoutConfig?.customerServiceURL ?? '', '_blank');
          }
        }}
      >
        {isServiceButtonOpen ? (
          <Icon
            xmlns="http://www.w3.org/2000/svg"
            width="28px"
            height="28px"
            viewBox="0 0 28 28"
            fill="none"
          >
            <path
              d="M23.7288 10.3246H23.8146C24.4654 10.3246 25.0895 10.5831 25.5496 11.0433C26.0097 11.5034 26.2682 12.1275 26.2682 12.7782V15.2318C26.2682 15.8826 26.0097 16.5066 25.5496 16.9668C25.0895 17.4269 24.4654 17.6854 23.8146 17.6854H23.7288C23.4301 20.0556 22.2773 22.2355 20.4863 23.8165C18.6953 25.3974 16.3892 26.2709 14.0002 26.273C13.6748 26.273 13.3628 26.1438 13.1327 25.9137C12.9027 25.6837 12.7734 25.3716 12.7734 25.0462C12.7734 24.7209 12.9027 24.4088 13.1327 24.1788C13.3628 23.9487 13.6748 23.8194 14.0002 23.8194C14.9668 23.8194 15.924 23.629 16.8171 23.2591C17.7101 22.8892 18.5216 22.347 19.2051 21.6635C19.8886 20.98 20.4308 20.1685 20.8007 19.2755C21.1706 18.3824 21.361 17.4253 21.361 16.4586V11.5514C21.361 9.5992 20.5855 7.72695 19.2051 6.34652C17.8247 4.9661 15.9524 4.19059 14.0002 4.19059C12.048 4.19059 10.1757 4.9661 8.79532 6.34652C7.4149 7.72695 6.63939 9.5992 6.63939 11.5514V16.4586C6.63939 16.784 6.51014 17.096 6.28007 17.3261C6.05 17.5562 5.73796 17.6854 5.41259 17.6854H4.18578C3.53505 17.6854 2.91096 17.4269 2.45082 16.9668C1.99068 16.5066 1.73218 15.8826 1.73218 15.2318V12.7782C1.73218 12.1275 1.99068 11.5034 2.45082 11.0433C2.91096 10.5831 3.53505 10.3246 4.18578 10.3246H4.27166C4.58562 7.96687 5.74513 5.80337 7.53459 4.23641C9.32404 2.66945 11.6217 1.80566 14.0002 1.80566C16.3788 1.80566 18.6764 2.66945 20.4658 4.23641C22.2553 5.80337 23.4148 7.96687 23.7288 10.3246Z"
              fill="url(#paint0_linear_973_6663)"
            />
            <path
              d="M18.9081 14.7049C18.8771 15.0304 18.7179 15.3303 18.4658 15.5386V15.5263C17.2067 16.5589 15.6286 17.1233 14.0002 17.1233C12.3718 17.1233 10.7938 16.5589 9.53466 15.5263C9.28412 15.318 9.12657 15.0188 9.09666 14.6944C9.06676 14.37 9.16694 14.047 9.37517 13.7965C9.58341 13.546 9.88264 13.3884 10.207 13.3585C10.5314 13.3286 10.8544 13.4288 11.105 13.637C11.9315 14.2837 12.9508 14.635 14.0002 14.635C15.0497 14.635 16.0689 14.2837 16.8955 13.637C17.1476 13.4288 17.4722 13.3292 17.7977 13.3603C18.1233 13.3914 18.4232 13.5505 18.6314 13.8026C18.8396 14.0548 18.9392 14.3793 18.9081 14.7049Z"
              fill="url(#paint1_linear_973_6663)"
            />
            <defs>
              <linearGradient
                id="paint0_linear_973_6663"
                x1="14.0002"
                y1="2.60006"
                x2="14.0002"
                y2="25.4787"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#499DFF" />
                <stop offset="0.432292" stopColor="#2770FF" />
                <stop offset="1" stopColor="#6E80FF" />
              </linearGradient>
              <linearGradient
                id="paint1_linear_973_6663"
                x1="14.0002"
                y1="2.60006"
                x2="14.0002"
                y2="25.4787"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#499DFF" />
                <stop offset="0.432292" stopColor="#2770FF" />
                <stop offset="1" stopColor="#6E80FF" />
              </linearGradient>
            </defs>
          </Icon>
        ) : (
          <Icon
            xmlns="http://www.w3.org/2000/svg"
            width="16px"
            height="16px"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.4715 3.52827C10.7318 3.78862 10.7318 4.21073 10.4715 4.47108L6.94289 7.99967L10.4715 11.5283C10.7318 11.7886 10.7318 12.2107 10.4715 12.4711C10.2111 12.7314 9.78903 12.7314 9.52868 12.4711L5.52868 8.47108C5.26833 8.21073 5.26833 7.78862 5.52868 7.52827L9.52868 3.52827C9.78903 3.26792 10.2111 3.26792 10.4715 3.52827Z"
              fill="#071B41"
              fillOpacity="0.5"
            />
          </Icon>
        )}

        {/* close button */}
        {isServiceButtonOpen && (
          <Center
            w={'14px'}
            h={'14px'}
            position="absolute"
            left="-6px"
            top="-6px"
            borderRadius="999px"
            border="1px solid #8BABE7"
            background="linear-gradient(139deg, rgba(255, 255, 255, 0.80) 0%, rgba(255, 255, 255, 0.70) 100%)"
            boxShadow="0px 12px 32px -4px rgba(0, 23, 86, 0.20)"
            backdropFilter="blur(200px)"
            onClick={(e) => {
              e.stopPropagation();
              setServiceButtonOpen(!isServiceButtonOpen);
            }}
          >
            <Icon width="12px" height="12px" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <g style={{ mixBlendMode: 'multiply' }}>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2.84371 2.84469C2.64845 3.03995 2.64845 3.35653 2.84371 3.5518L5.29285 6.00093L2.84384 8.44994C2.64858 8.6452 2.64858 8.96178 2.84384 9.15704C3.0391 9.35231 3.35568 9.35231 3.55095 9.15704L5.99995 6.70804L8.44896 9.15704C8.64422 9.3523 8.9608 9.3523 9.15607 9.15704C9.35133 8.96178 9.35133 8.6452 9.15607 8.44994L6.70706 6.00093L9.15619 3.5518C9.35146 3.35653 9.35146 3.03995 9.15619 2.84469C8.96093 2.64943 8.64435 2.64943 8.44909 2.84469L5.99995 5.29382L3.55082 2.84469C3.35556 2.64943 3.03897 2.64943 2.84371 2.84469Z"
                  fill="#071B41"
                  fillOpacity="0.5"
                />
              </g>
            </Icon>
          </Center>
        )}

        {isServiceButtonOpen && (
          <Text
            color="#000"
            fontSize="11px"
            fontStyle="normal"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px"
            whiteSpace="wrap"
          >
            {t('online_service')}
          </Text>
        )}
      </Flex>
    </Box>
  );
};

export default OnlineServiceButton;
