type ConfigWithInvoice = {
  [key: string]: any;
  costCenter?: {
    [key: string]: any;
    invoice?: {
      [key: string]: any;
    };
  };
};

export function normalizeFeishuAppConfig<T extends ConfigWithInvoice>(config: T): T {
  const invoice = config.costCenter?.invoice;
  if (!invoice || invoice.feishuApp != null || invoice.feishApp == null) return config;

  return {
    ...config,
    costCenter: {
      ...config.costCenter,
      invoice: {
        ...invoice,
        feishuApp: invoice.feishApp
      }
    }
  } as T;
}
