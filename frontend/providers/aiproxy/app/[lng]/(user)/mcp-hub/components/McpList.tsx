"use client";
import { Box, Center, Grid, Skeleton, SkeletonText, Text } from "@chakra-ui/react";

import { useTranslationClientSide } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n/i18nContext";
import { Mcp } from "@/types/mcp";

import McpCard from "./McpCard";

export interface McpListProps {
  mcps: Mcp[];
  isLoading: boolean;
}

// Skeleton Card Component
function McpCardSkeleton() {
  return (
    <Box bg="white" borderRadius="12px" border="1px solid" borderColor="grayModern.150" p="20px">
      <Box>
        {/* Header skeleton */}
        <Box mb="16px">
          <Box display="flex" alignItems="center" gap="12px" mb="8px">
            <Skeleton w="40px" h="40px" borderRadius="8px" />
            <Box flex="1">
              <Skeleton h="22px" w="120px" mb="4px" />
              <Skeleton h="18px" w="60px" />
            </Box>
          </Box>
        </Box>

        {/* Description skeleton */}
        <Box mb="16px">
          <SkeletonText noOfLines={3} spacing="2" skeletonHeight="4" />
        </Box>

        {/* Footer skeleton */}
        <Box display="flex" justifyContent="flex-end">
          <Skeleton h="16px" w="40px" />
        </Box>
      </Box>
    </Box>
  );
}

export default function McpList({ mcps, isLoading }: McpListProps) {
  const { lng } = useI18n();
  const { t } = useTranslationClientSide(lng, "common");

  if (isLoading) {
    return (
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap="20px"
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <McpCardSkeleton key={index} />
        ))}
      </Grid>
    );
  }

  if (mcps.length === 0) {
    return (
      <Center h="400px">
        <Box textAlign="center">
          <Text color="grayModern.500" fontSize="16px" fontWeight={500} lineHeight="22px">
            {t("mcpHub.noResults")}
          </Text>
        </Box>
      </Center>
    );
  }

  return (
    <Grid
      templateColumns={{
        base: "1fr",
        md: "repeat(2, 1fr)",
        lg: "repeat(3, 1fr)",
        xl: "repeat(4, 1fr)",
      }}
      gap="20px"
    >
      {mcps.map((mcp) => (
        <McpCard key={mcp.id} mcp={mcp} />
      ))}
    </Grid>
  );
}
