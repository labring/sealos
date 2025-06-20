"use client";
import { Badge, Box, Flex, IconButton, Text } from "@chakra-ui/react";
import Image from "next/image";

import { useTranslationClientSide } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n/i18nContext";
import { McpDetail } from "@/types/mcp";
import { getMcpIcon } from "@/ui/icons/mcp-icons";

export interface McpDetailHeaderProps {
  mcpDetail: McpDetail;
}

export default function McpDetailHeader({ mcpDetail }: McpDetailHeaderProps) {
  const { lng } = useI18n();
  const { t } = useTranslationClientSide(lng, "common");

  const mcpName = lng === "zh" ? mcpDetail.name_cn || mcpDetail.name : mcpDetail.name;
  const mcpDescription =
    lng === "zh" ? mcpDetail.description_cn || mcpDetail.description : mcpDetail.description;

  const iconSrc = getMcpIcon(mcpDetail.id);

  return (
    <Flex direction="column" gap="16px">
      {/* Main Info */}
      <Flex alignItems="center" gap="16px">
        <Box
          w="60px"
          h="60px"
          borderRadius="12px"
          overflow="hidden"
          bg="grayModern.50"
          p="12px"
          justifyContent="center"
          alignItems="center"
        >
          <Image src={iconSrc} alt={mcpName} width={36} height={36} />
        </Box>
        <Flex direction="column" gap="8px" flex="1">
          <Flex alignItems="center" gap="12px">
            <Text color="grayModern.900" fontSize="20px" fontWeight={500} lineHeight="32px">
              {mcpName}
            </Text>
            {mcpDetail.hosted ? (
              <Badge
                display="inline-flex"
                padding="4px 12px"
                alignItems="center"
                borderRadius="16px"
                bg="green.50"
                color="green.600"
                fontSize="14px"
                fontWeight={500}
              >
                {t("mcpHub.hosted")}
              </Badge>
            ) : (
              <Badge
                display="inline-flex"
                padding="4px 12px"
                alignItems="center"
                borderRadius="16px"
                bg="grayModern.50"
                color="grayModern.500"
                fontSize="14px"
                fontWeight={500}
              >
                {t("mcpHub.local")}
              </Badge>
            )}
            {mcpDetail.github_url && (
              <IconButton
                aria-label="GitHub"
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C17.137 18.195 20 14.441 20 10.017 20 4.484 15.522 0 10 0z"
                      fill="currentColor"
                    />
                  </svg>
                }
                size="sm"
                variant="ghost"
                color="grayModern.600"
                _hover={{ color: "grayModern.900" }}
                onClick={() => window.open(mcpDetail.github_url, "_blank")}
              />
            )}
          </Flex>
          <Text color="grayModern.600" fontSize="14px" fontWeight={400} lineHeight="24px">
            {mcpDescription}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
}
