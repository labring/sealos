"use client";
import { Button, Flex, Text } from "@chakra-ui/react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslationClientSide } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n/i18nContext";
import { useBackendStore } from "@/store/backend";
import homeIcon from "@/ui/svg/icons/sidebar/home.svg";
import homeIcon_a from "@/ui/svg/icons/sidebar/home_a.svg";
import keysIcon from "@/ui/svg/icons/sidebar/key.svg";
import keysIcon_a from "@/ui/svg/icons/sidebar/key_a.svg";
import logsIcon from "@/ui/svg/icons/sidebar/logs.svg";
import logsIcon_a from "@/ui/svg/icons/sidebar/logs_a.svg";
import mcpIcon from "@/ui/svg/icons/sidebar/mcp.svg";
import mcpIcon_a from "@/ui/svg/icons/sidebar/mcp_a.svg";
import priceIcon from "@/ui/svg/icons/sidebar/price.svg";
import priceIcon_a from "@/ui/svg/icons/sidebar/price_a.svg";

type Menu = {
  id: string;
  url: string;
  value: string;
  icon: StaticImageData;
  activeIcon: StaticImageData;
  display: boolean;
};

const SideBar = (): JSX.Element => {
  const pathname = usePathname();
  const { lng } = useI18n();
  const { t } = useTranslationClientSide(lng, "common");

  const { invitationUrl, docUrl } = useBackendStore();

  const menus: Menu[] = [
    {
      id: "keys",
      url: "/key",
      value: t("Sidebar.Keys"),
      icon: keysIcon,
      activeIcon: keysIcon_a,
      display: true,
    },
    {
      id: "home",
      url: "/home",
      value: t("Sidebar.Home"),
      icon: homeIcon,
      activeIcon: homeIcon_a,
      display: true,
    },
    {
      id: "logs",
      url: "/log",
      value: t("Sidebar.Logs"),
      icon: logsIcon,
      activeIcon: logsIcon_a,
      display: true,
    },
    {
      id: "price",
      url: "/price",
      value: t("Sidebar.Price"),
      icon: priceIcon,
      activeIcon: priceIcon_a,
      display: true,
    },
    {
      id: "mcp-hub",
      url: "/mcp-hub",
      value: t("Sidebar.McpHub"),
      icon: mcpIcon,
      activeIcon: mcpIcon_a,
      display: true,
    },
  ];

  return (
    <Flex
      flexDirection="column"
      flex="1"
      py="16px"
      px="8px"
      justifyContent="space-between"
      height="100%"
      overflowY="auto"
      overflowX="hidden"
    >
      <Flex flexDirection="column" gap="var(--md, 8px)" alignContent="center">
        {menus
          .filter((menu) => menu.display)
          .map((menu) => {
            const fullUrl = `/${lng}${menu.url}`;
            const isActive = pathname === fullUrl || pathname.startsWith(fullUrl + "/");

            return (
              <Link href={fullUrl} key={menu.id} style={{ textDecoration: "none" }}>
                <Flex
                  display="flex"
                  w="64px"
                  px="var(--md, 8px)"
                  py="12px"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  gap="var(--xs, 4px)"
                  borderRadius="8px"
                  cursor="pointer"
                  role="group"
                  backgroundColor={isActive ? "#9699B426" : "transparent"}
                  _hover={{ backgroundColor: "#9699B426" }}
                >
                  <Image
                    src={isActive ? menu.activeIcon : menu.icon}
                    alt={menu.value}
                    width={24}
                    height={24}
                  />
                  <Text
                    color={isActive ? "grayModern.900" : "grayModern.500"}
                    fontFamily="PingFang SC"
                    fontSize="11px"
                    fontWeight={500}
                    lineHeight="16px"
                    letterSpacing="0.5px"
                    textAlign="center"
                    whiteSpace="nowrap"
                  >
                    {menu.value}
                  </Text>
                </Flex>
              </Link>
            );
          })}
      </Flex>
      {/* doc */}
      <Flex
        flexDirection="column"
        gap="var(--md, 8px)"
        alignContent="center"
        alignItems="flex-start"
        marginTop="auto"
      >
        <Button
          display="flex"
          padding="8px"
          justifyContent="center"
          alignItems="center"
          width="64px"
          gap="4px"
          borderRadius="6px"
          bg="rgba(150, 153, 180, 0.10)"
          _hover={{ bg: "rgba(150, 153, 180, 0.15)" }}
          onClick={() => {
            window.open(docUrl, "_blank");
          }}
        >
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontStyle="normal"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px"
          >
            {t("dashboard.doc")}
          </Text>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="14"
            viewBox="0 0 15 14"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.7566 2.15568C10.1795 2.15568 9.71161 2.62352 9.71161 3.20062C9.71161 3.38151 9.75758 3.55167 9.83846 3.70005C9.84404 3.70857 9.84944 3.71728 9.85463 3.72617C9.85979 3.73501 9.86468 3.74393 9.86933 3.75292C10.0539 4.04873 10.3822 4.24557 10.7566 4.24557C11.3337 4.24557 11.8015 3.77773 11.8015 3.20062C11.8015 2.62352 11.3337 2.15568 10.7566 2.15568ZM9.20757 4.77918C9.60656 5.17075 10.1534 5.41223 10.7566 5.41223C11.978 5.41223 12.9682 4.42206 12.9682 3.20062C12.9682 1.97919 11.978 0.989014 10.7566 0.989014C9.53512 0.989014 8.54495 1.97919 8.54495 3.20062C8.54495 3.39808 8.57082 3.58949 8.61937 3.77165L5.79244 5.42138C5.39345 5.02981 4.84665 4.78833 4.24345 4.78833C3.02201 4.78833 2.03184 5.7785 2.03184 6.99994C2.03184 8.22138 3.02201 9.21155 4.24345 9.21155C4.84677 9.21155 5.39366 8.96997 5.79268 8.57826L8.62001 10.2258C8.57105 10.4087 8.54495 10.6009 8.54495 10.7992C8.54495 12.0207 9.53512 13.0109 10.7566 13.0109C11.978 13.0109 12.9682 12.0207 12.9682 10.7992C12.9682 9.57781 11.978 8.58764 10.7566 8.58764C10.1543 8.58764 9.60819 8.8284 9.20935 9.21894L6.38072 7.57063C6.42921 7.38857 6.45506 7.19727 6.45506 6.99994C6.45506 6.80248 6.42918 6.61108 6.38064 6.42892L9.20757 4.77918ZM5.13069 6.44766C5.13533 6.45664 5.14022 6.46555 5.14538 6.47439C5.15057 6.48328 5.15596 6.49199 5.16154 6.50051C5.24243 6.64889 5.28839 6.81905 5.28839 6.99994C5.28839 7.18083 5.24243 7.35098 5.16154 7.49936C5.15589 7.50798 5.15044 7.5168 5.14519 7.52581C5.1401 7.53454 5.13527 7.54335 5.13068 7.55222C4.94615 7.84804 4.61779 8.04488 4.24345 8.04488C3.66634 8.04488 3.1985 7.57704 3.1985 6.99994C3.1985 6.42283 3.66634 5.95499 4.24345 5.95499C4.61779 5.95499 4.94616 6.15184 5.13069 6.44766ZM9.82247 10.3304C9.83599 10.3123 9.84862 10.2933 9.86024 10.2734C9.87137 10.2543 9.88128 10.2348 9.89002 10.2151C10.0778 9.93709 10.3958 9.75431 10.7566 9.75431C11.3337 9.75431 11.8015 10.2221 11.8015 10.7992C11.8015 11.3764 11.3337 11.8442 10.7566 11.8442C10.1795 11.8442 9.71161 11.3764 9.71161 10.7992C9.71161 10.6306 9.75154 10.4714 9.82247 10.3304Z"
              fill="#485264"
            />
          </svg>
        </Button>
        <Button
          display="flex"
          padding="8px"
          justifyContent="center"
          alignItems="center"
          width="64px"
          gap="4px"
          borderRadius="6px"
          bg="rgba(150, 153, 180, 0.10)"
          _hover={{ bg: "rgba(150, 153, 180, 0.15)" }}
          onClick={() => {
            window.open(invitationUrl, "_blank");
          }}
        >
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontStyle="normal"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px"
          >
            {t("dashboard.invite")}
          </Text>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="14"
            viewBox="0 0 15 14"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.26675 3.70022C5.26675 4.02239 5.52792 4.28356 5.85009 4.28356L9.39154 4.28356L3.78769 9.88741C3.55988 10.1152 3.55988 10.4846 3.78769 10.7124C4.0155 10.9402 4.38484 10.9402 4.61265 10.7124L10.2165 5.10851L10.2165 8.64997C10.2165 8.97214 10.4777 9.2333 10.7998 9.2333C11.122 9.2333 11.3832 8.97214 11.3832 8.64997L11.3832 3.70022C11.3832 3.37806 11.122 3.11689 10.7998 3.11689L5.85009 3.11689C5.52792 3.11689 5.26675 3.37806 5.26675 3.70022Z"
              fill="#485264"
            />
          </svg>
        </Button>
      </Flex>
    </Flex>
  );
};

export default SideBar;
