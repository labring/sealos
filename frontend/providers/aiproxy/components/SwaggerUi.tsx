"use client";

import { memo } from "react";
import SwaggerUI from "swagger-ui-react";

import "swagger-ui-react/swagger-ui.css";

interface ReactSwaggerProps {
  spec: object | string;
}

const ReactSwagger = memo(({ spec }: ReactSwaggerProps) => {
  return (
    <div className="swagger-container">
      <SwaggerUI
        spec={spec}
        // UI 显示配置
        docExpansion="list"
        defaultModelsExpandDepth={2}
        defaultModelExpandDepth={2}
        defaultModelRendering="example"
        displayOperationId={true}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        // 交互功能
        tryItOutEnabled={true}
        deepLinking={true}
        // 认证持久化
        persistAuthorization={true}
        withCredentials={false}
        // 支持的请求方法
        supportedSubmitMethods={["get", "post", "put", "delete", "patch"]}
        // 代码片段配置
        requestSnippetsEnabled={true}
        requestSnippets={{
          generators: {
            curl_bash: {
              title: "cURL (bash)",
              syntax: "bash",
            },
            curl_powershell: {
              title: "cURL (PowerShell)",
              syntax: "powershell",
            },
          },
          defaultExpanded: true,
          languages: null,
        }}
      />
    </div>
  );
});

ReactSwagger.displayName = "ReactSwagger";

export default ReactSwagger;
