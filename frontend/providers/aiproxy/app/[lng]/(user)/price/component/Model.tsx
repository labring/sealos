'use client';
import { Badge, Flex, Text } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { Code } from 'lucide-react';
import Image, { StaticImageData } from 'next/image';

import { useTranslationClientSide } from '@/app/i18n/client';
import { MyTooltip } from '@/components/common/MyTooltip';
import { useI18n } from '@/providers/i18n/i18nContext';
import { ModelConfig } from '@/types/models/model';
import { modelIcons } from '@/ui/icons/mode-icons';
import { getTranslationWithFallback } from '@/utils/common';

export const getModelIcon = (modelOwner: string): StaticImageData => {
  const icon = modelIcons[modelOwner as keyof typeof modelIcons] || modelIcons['default'];
  return icon;
};

// 在组件外部定义样式配置
const MODEL_TYPE_STYLES = {
  1: {
    background: '#F0FBFF',
    color: '#0884DD',
  },
  2: {
    background: '#F4F4F7',
    color: '#383F50',
  },
  3: {
    background: '#EBFAF8',
    color: '#007E7C',
  },
  4: {
    background: '#FEF3F2',
    color: '#F04438',
  },
  5: {
    background: '#F0EEFF',
    color: '#6F5DD7',
  },
  6: {
    background: '#FFFAEB',
    color: '#DC6803',
  },
  7: {
    background: '#FAF1FF',
    color: '#9E53C1',
  },
  8: {
    background: '#FFF1F6',
    color: '#E82F72',
  },
  9: {
    background: '#F0F4FF',
    color: '#3370FF',
  },
  10: {
    background: '#EDFAFF',
    color: '#0077A9',
  },
  default: {
    background: '#F4F4F7',
    color: '#383F50',
  },
} as const;

// 在组件中使用
export const getTypeStyle = (type: number) => {
  return MODEL_TYPE_STYLES[type as keyof typeof MODEL_TYPE_STYLES] || MODEL_TYPE_STYLES.default;
};

export const ModelComponent = ({
  modelConfig,
  displayType = false,
}: {
  modelConfig: ModelConfig;
  displayType?: boolean;
}) => {
  const { lng } = useI18n();
  const { t } = useTranslationClientSide(lng, 'common');
  const { message } = useMessage({
    warningBoxBg: '#FFFAEB',
    warningIconBg: '#F79009',
    warningIconFill: 'white',
    successBoxBg: '#EDFBF3',
    successIconBg: '#039855',
    successIconFill: 'white',
  });

  const iconSrc = getModelIcon(modelConfig.owner);

  return (
    <Flex alignItems="center" justifyContent="flex-start" gap="8px" h="42px">
      <MyTooltip
        label={getTranslationWithFallback(
          `modeOwner.${String(modelConfig.owner)}`,
          'modeOwner.unknown',
          t as any
        )}
        width="auto"
        height="auto"
      >
        <Image src={iconSrc} alt={modelConfig.model} width={32} height={32} />
      </MyTooltip>
      <Flex gap="4px" alignItems="flex-start" direction="column">
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px"
          whiteSpace="nowrap"
          onClick={() =>
            navigator.clipboard.writeText(modelConfig.model).then(
              () => {
                message({
                  status: 'success',
                  title: t('copySuccess'),
                  isClosable: true,
                  duration: 2000,
                  position: 'top',
                });
              },
              (err) => {
                message({
                  status: 'warning',
                  title: t('copyFailed'),
                  description: err?.message || t('copyFailed'),
                  isClosable: true,
                  position: 'top',
                });
              }
            )
          }
          cursor="pointer"
        >
          {modelConfig.model}
        </Text>
        <Flex gap="4px" alignItems="center" justifyContent="flex-start">
          {displayType && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background={getTypeStyle(modelConfig.type).background}
            >
              <Text
                color={getTypeStyle(modelConfig.type).color}
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
              >
                {getTranslationWithFallback(
                  `modeType.${String(modelConfig.type)}`,
                  'modeType.0',
                  t as any
                )}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.vision && (
            <MyTooltip
              label={
                <Text
                  color="grayModern.900"
                  fontFamily="Inter"
                  fontSize="12px"
                  fontWeight={400}
                  lineHeight="150%"
                >
                  {t('price.modelVisionLabel')}
                </Text>
              }
              width="auto"
              height="auto"
            >
              <Badge
                display="flex"
                padding="1px 4px"
                justifyContent="center"
                alignItems="center"
                gap="2px"
                borderRadius="4px"
                background="var(--Teal-50, #EBFAF8)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M6.9999 5.35705C7.43565 5.35705 7.85355 5.53015 8.16167 5.83827C8.46979 6.14639 8.64289 6.56429 8.64289 7.00004C8.64289 7.43578 8.46979 7.85368 8.16167 8.1618C7.85355 8.46992 7.43565 8.64302 6.9999 8.64302C6.56416 8.64302 6.14626 8.46992 5.83814 8.1618C5.53002 7.85368 5.35692 7.43578 5.35692 7.00004C5.35692 6.56429 5.53002 6.14639 5.83814 5.83827C6.14626 5.53015 6.56416 5.35705 6.9999 5.35705ZM6.9999 2.89258C9.44394 2.89258 11.5695 4.2494 12.6718 6.25045C12.7785 6.44422 12.8319 6.5411 12.8719 6.73711C12.8982 6.86627 12.8982 7.13381 12.8719 7.26297C12.8319 7.45898 12.7785 7.55586 12.6718 7.74962C11.5695 9.75068 9.44394 11.1075 6.9999 11.1075C4.55587 11.1075 2.43032 9.75068 1.32805 7.74962C1.22132 7.55586 1.16795 7.45898 1.12793 7.26297C1.10156 7.13381 1.10156 6.86627 1.12793 6.73711C1.16795 6.5411 1.22132 6.44422 1.32805 6.25045C2.43032 4.2494 4.55587 2.89258 6.9999 2.89258ZM2.70809 6.12392C2.56204 6.31728 2.48901 6.41395 2.4229 6.6637C2.38194 6.81844 2.38194 7.18164 2.4229 7.33638C2.48901 7.58612 2.56204 7.6828 2.70809 7.87616C3.10318 8.3992 3.59235 8.84798 4.15342 9.19794C5.00732 9.73055 5.99352 10.0129 6.9999 10.0129C8.00629 10.0129 8.99249 9.73055 9.84639 9.19794C10.4075 8.84798 10.8966 8.3992 11.2917 7.87616C11.4378 7.6828 11.5108 7.58612 11.5769 7.33638C11.6179 7.18164 11.6179 6.81844 11.5769 6.6637C11.5108 6.41395 11.4378 6.31728 11.2917 6.12392C10.8966 5.60087 10.4075 5.15209 9.84639 4.80213C8.99249 4.26953 8.00629 3.98718 6.9999 3.98718C5.99352 3.98718 5.00732 4.26953 4.15342 4.80213C3.59235 5.15209 3.10318 5.60088 2.70809 6.12392Z"
                    fill="#00A9A6"
                  />
                </svg>
                <Text
                  color="#007E7C" // Changed from "#EBFAF8" to "teal.700" for better readability
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="11px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                >
                  {t('price.modelVision')}
                </Text>
              </Badge>
            </MyTooltip>
          )}
          {modelConfig.config?.tool_choice && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              gap="2px"
              borderRadius="4px"
              background="#F0EEFF"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2.38275 8.52685C1.2703 7.4144 0.919623 5.8231 1.32317 4.38399C1.43455 3.98679 1.60339 3.60118 1.82953 3.24043L3.94506 5.35597L5.19686 5.19681L5.35601 3.94501L3.2406 1.8296C3.60141 1.60351 3.98708 1.43474 4.38434 1.32342C5.82323 0.920248 7.41413 1.27101 8.52636 2.38324C9.65082 3.5077 9.99697 5.1214 9.57262 6.57264L12.1265 8.95704C13.0537 9.82265 13.0787 11.2844 12.1818 12.1813C11.2845 13.0786 9.82197 13.053 8.95657 12.1249L6.57622 9.57192C5.12392 9.99811 3.50826 9.65236 2.38275 8.52685ZM5.39327 2.33236L6.58552 3.52461L6.24026 6.24021L3.52465 6.58547L2.33192 5.39274C2.2883 6.23601 2.5846 7.07879 3.20771 7.70189C4.01259 8.50677 5.1785 8.76623 6.2477 8.45246L6.93854 8.24972L9.80987 11.3293C10.225 11.7745 10.9265 11.7867 11.3569 11.3563C11.7871 10.9261 11.7751 10.225 11.3303 9.80981L8.25115 6.93498L8.45284 6.24521C8.76525 5.1768 8.50554 4.01234 7.70141 3.2082C7.07855 2.58534 6.23621 2.28903 5.39327 2.33236Z"
                  fill="#6F5DD7"
                />
                <path
                  d="M10.9396 10.1019C11.1708 10.3332 11.1708 10.7081 10.9396 10.9394C10.7083 11.1707 10.3333 11.1707 10.102 10.9394C9.87072 10.7081 9.87072 10.3332 10.102 10.1019C10.3333 9.8706 10.7083 9.8706 10.9396 10.1019Z"
                  fill="#6F5DD7"
                />
              </svg>
              <Text
                color="#6F5DD7"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
              >
                {t('price.modelToolChoice')}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.coder && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              gap="2px"
              borderRadius="4px"
              background="#EDFBF3"
            >
              <Code size={14} color="#039855" strokeWidth={2.5} />
              <Text
                color="#039855"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
              >
                {t('price.modelCoder')}
              </Text>
            </Badge>
          )}
          {/* TODO: temp hide thinking mode */}
          {/* {modelConfig.config?.tool_choice && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              gap="2px"
              borderRadius="4px"
              background="#F0F4FF">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="15"
                viewBox="0 0 14 15"
                fill="none">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M11.4403 5.35716C11.8518 4.08043 11.6294 3.40342 11.3649 3.13895C11.1005 2.87448 10.4235 2.65211 9.14672 3.06357C8.81359 3.17093 8.46299 3.31577 8.10206 3.49705C8.63165 3.88921 9.15585 4.33972 9.66 4.84387C10.1642 5.34802 10.6147 5.87223 11.0068 6.40183C11.1881 6.04089 11.3329 5.69029 11.4403 5.35716ZM1.81003 2.31399C2.84196 1.28206 4.88313 1.53384 6.99996 2.76847C9.11678 1.53384 11.158 1.28206 12.1899 2.31399C13.2218 3.34593 12.97 5.3871 11.7354 7.50393C12.97 9.62075 13.2218 11.6619 12.1899 12.6938C11.1579 13.7258 9.11678 13.474 6.99996 12.2394C4.88314 13.474 2.84198 13.7258 1.81004 12.6938C0.778108 11.6619 1.02989 9.62075 2.26451 7.50393C1.02987 5.3871 0.778087 3.34593 1.81003 2.31399ZM4.85319 3.06357C5.18633 3.17093 5.53692 3.31578 5.89786 3.49705C5.36826 3.88921 4.84406 4.33972 4.33992 4.84387C3.83576 5.34802 3.38525 5.87222 2.99309 6.40183C2.81181 6.04089 2.66697 5.69029 2.55961 5.35716C2.14814 4.08043 2.37051 3.40342 2.63498 3.13895C2.89945 2.87448 3.57646 2.65211 4.85319 3.06357ZM2.55962 9.65067C2.66698 9.31755 2.81182 8.96696 2.99309 8.60603C3.38524 9.13562 3.83576 9.65982 4.3399 10.164C4.84405 10.6681 5.36825 11.1186 5.89785 11.5108C5.53693 11.6921 5.18634 11.8369 4.85321 11.9443C3.57648 12.3557 2.89947 12.1334 2.635 11.8689C2.37053 11.6044 2.14816 10.9274 2.55962 9.65067ZM5.16486 9.33901C5.76439 9.93854 6.38653 10.4477 6.99996 10.8618C7.61339 10.4477 8.23553 9.93853 8.83506 9.33901C9.43458 8.73948 9.94371 8.11735 10.3578 7.50393C9.9437 6.8905 9.43457 6.26835 8.83504 5.66883C8.23552 5.0693 7.61338 4.56018 6.99996 4.14603C6.38653 4.56018 5.7644 5.0693 5.16487 5.66882C4.56535 6.26835 4.05621 6.89049 3.64207 7.50393C4.05621 8.11735 4.56534 8.73949 5.16486 9.33901ZM9.14671 11.9443C8.81358 11.8369 8.46299 11.6921 8.10206 11.5108C8.63166 11.1186 9.15587 10.6681 9.66002 10.164C10.1642 9.65982 10.6147 9.13562 11.0068 8.60603C11.1881 8.96696 11.3329 9.31755 11.4403 9.65067C11.8518 10.9274 11.6294 11.6044 11.3649 11.8689C11.1004 12.1334 10.4234 12.3557 9.14671 11.9443ZM7 8.66673C7.64579 8.66673 8.1693 8.14439 8.1693 7.50006C8.1693 6.85573 7.64579 6.33339 7 6.33339C6.35421 6.33339 5.8307 6.85573 5.8307 7.50006C5.8307 8.14439 6.35421 8.66673 7 8.66673Z"
                  fill="#2B5FD9"
                />
              </svg>
              <Text
                color="#2B5FD9"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('price.thinkingMode')}
              </Text>
            </Badge>
          )} */}
          {modelConfig.config?.max_context_tokens && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background="#F7F8FA"
            >
              <Text
                color="#667085"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
              >
                {`${
                  modelConfig.config.max_context_tokens % 1024 === 0
                    ? Math.ceil(modelConfig.config.max_context_tokens / 1024)
                    : Math.ceil(modelConfig.config.max_context_tokens / 1000)
                }K`}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.max_output_tokens && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background="#EDFAFF"
            >
              <Text
                color="#0077A9"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
              >
                {`${Math.ceil(modelConfig.config.max_output_tokens / 1024)}K ${t(
                  'price.response'
                )}`}
              </Text>
            </Badge>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};
