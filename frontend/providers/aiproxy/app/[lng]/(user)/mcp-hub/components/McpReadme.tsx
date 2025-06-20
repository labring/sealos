"use client";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Box, Text } from "@chakra-ui/react";
import remarkGfm from "remark-gfm";

import { useI18n } from "@/providers/i18n/i18nContext";
import { McpDetail } from "@/types/mcp";

export interface McpReadmeProps {
  mcpDetail: McpDetail;
}

export default function McpReadme({ mcpDetail }: McpReadmeProps) {
  const { lng } = useI18n();

  const readmeContent = lng === "zh" ? mcpDetail.readme_cn || mcpDetail.readme : mcpDetail.readme;

  return (
    <Box h="full" overflow="hidden" w="100%" maxW="100%" position="relative">
      <Box
        h="full"
        overflow="auto"
        bg="white"
        borderRadius="8px"
        border="1px solid"
        borderColor="grayModern.150"
        p="24px"
        w="100%"
        maxW="100%"
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        sx={{
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "grayModern.100",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "grayModern.300",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "grayModern.400",
          },
          // 基础样式控制
          "& *": {
            boxSizing: "border-box",
          },
          // 代码块包装器滚动条样式
          "& .code-block-wrapper": {
            "&::-webkit-scrollbar": {
              width: "6px",
              height: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "rgba(0, 0, 0, 0.05)",
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "3px",
              "&:hover": {
                background: "rgba(0, 0, 0, 0.3)",
              },
            },
            "&::-webkit-scrollbar-corner": {
              background: "rgba(0, 0, 0, 0.05)",
            },
          },
          // Markdown 样式
          "& .markdown-content": {
            width: "100%",
            fontSize: "14px",
            lineHeight: 1.7,
            color: "grayModern.700",

            // 标题样式
            "& h1, & h2, & h3, & h4, & h5, & h6": {
              fontWeight: 600,
              lineHeight: 1.3,
              marginTop: "2em",
              marginBottom: "0.8em",
              color: "grayModern.900",
              "&:first-of-type": {
                marginTop: "0",
              },
            },
            "& h1": {
              fontSize: "24px",
              borderBottom: "2px solid",
              borderColor: "grayModern.150",
              paddingBottom: "8px",
              marginBottom: "16px",
            },
            "& h2": {
              fontSize: "20px",
              borderBottom: "1px solid",
              borderColor: "grayModern.100",
              paddingBottom: "6px",
              marginBottom: "12px",
            },
            "& h3": { fontSize: "18px" },
            "& h4": { fontSize: "16px" },
            "& h5": { fontSize: "14px" },
            "& h6": { fontSize: "13px", color: "grayModern.600" },

            // 段落样式
            "& p": {
              marginTop: "0",
              marginBottom: "16px",
              lineHeight: 1.7,
              wordWrap: "break-word",
              overflowWrap: "break-word",
              "&:last-of-type": {
                marginBottom: "0",
              },
            },

            // 列表样式
            "& ul, & ol": {
              paddingLeft: "20px",
              marginBottom: "16px",
              "& li": {
                marginBottom: "4px",
                lineHeight: 1.6,
              },
              "& ul, & ol": {
                marginTop: "4px",
                marginBottom: "4px",
              },
            },

            // 引用块样式
            "& blockquote": {
              borderLeft: "4px solid",
              borderColor: "brightBlue.300",
              backgroundColor: "brightBlue.25",
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "12px",
              paddingBottom: "12px",
              marginLeft: "0",
              marginRight: "0",
              marginBottom: "16px",
              borderRadius: "0 6px 6px 0",
              color: "grayModern.700",
              "& p": {
                marginBottom: "8px",
                "&:last-of-type": {
                  marginBottom: "0",
                },
              },
            },

            // 内联代码样式
            "& code": {
              backgroundColor: "grayModern.100",
              color: "brightBlue.600",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "13px",
              fontFamily:
                '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontWeight: 500,
              wordWrap: "break-word",
              overflowWrap: "break-word",
              maxWidth: "100%",
            },

            // 代码块容器样式 (现在由 div 包装器控制)
            "& pre": {
              marginBottom: "16px",
            },
            "& pre code": {
              backgroundColor: "transparent",
              color: "inherit",
              padding: "0",
              borderRadius: "0",
              fontSize: "inherit",
              fontWeight: "normal",
            },

            // 表格样式
            "& table": {
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "16px",
              maxWidth: "100%",
              backgroundColor: "white",
              border: "1px solid",
              borderColor: "grayModern.150",
              borderRadius: "8px",
              overflow: "hidden",
            },
            "& th, & td": {
              border: "1px solid",
              borderColor: "grayModern.150",
              padding: "12px 16px",
              textAlign: "left",
              wordWrap: "break-word",
              overflow: "hidden",
              fontSize: "14px",
              lineHeight: 1.5,
            },
            "& th": {
              backgroundColor: "grayModern.50",
              fontWeight: 600,
              color: "grayModern.900",
            },
            "& td": {
              backgroundColor: "white",
            },

            // 链接样式
            "& a": {
              color: "brightBlue.500",
              textDecoration: "none",
              fontWeight: 500,
              "&:hover": {
                color: "brightBlue.600",
                textDecoration: "underline",
              },
            },

            // 图片样式
            "& img": {
              maxWidth: "100%",
              height: "auto",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "grayModern.150",
              marginBottom: "16px",
            },

            // 分割线样式
            "& hr": {
              border: "none",
              borderTop: "1px solid",
              borderColor: "grayModern.200",
              margin: "24px 0",
            },

            // 任务列表样式
            '& input[type="checkbox"]': {
              marginRight: "8px",
            },

            // 删除线样式
            "& del": {
              color: "grayModern.500",
              textDecoration: "line-through",
            },

            // 强调样式
            "& strong": {
              fontWeight: 600,
              color: "grayModern.900",
            },
            "& em": {
              fontStyle: "italic",
              color: "grayModern.600",
            },
          },
        }}
      >
        {readmeContent ? (
          <Box className="markdown-content">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                code(props) {
                  const { children, className, node, inline, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <Box
                      className="code-block-wrapper"
                      w="100%"
                      maxW="100%"
                      overflow="auto"
                      maxH="400px"
                      bg="#fafafa"
                      border="1px solid"
                      borderColor="grayModern.150"
                      borderRadius="8px"
                      mb="16px"
                      display="grid"
                      gridTemplateColumns="minmax(0, 1fr)"
                    >
                      <Box overflow="auto" minW="0">
                        <SyntaxHighlighter
                          {...rest}
                          PreTag="div"
                          language={match[1]}
                          style={oneLight}
                          showLineNumbers={false}
                          wrapLines={false}
                          wrapLongLines={false}
                          customStyle={{
                            margin: 0,
                            padding: "16px 20px",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            fontFamily:
                              '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            backgroundColor: "transparent",
                            borderRadius: "0",
                            whiteSpace: "pre",
                          }}
                          codeTagProps={{
                            style: {
                              fontFamily:
                                '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: "13px",
                            },
                          }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </Box>
                    </Box>
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {readmeContent}
            </Markdown>
          </Box>
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            h="200px"
            textAlign="center"
          >
            <Box
              w="48px"
              h="48px"
              borderRadius="full"
              bg="grayModern.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb="12px"
            >
              <Text fontSize="20px" color="grayModern.400">
                📄
              </Text>
            </Box>
            <Text color="grayModern.500" fontSize="14px" fontWeight={500} mb="4px">
              No documentation available
            </Text>
            <Text color="grayModern.400" fontSize="12px">
              This MCP service doesn&apos;t have documentation yet.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
