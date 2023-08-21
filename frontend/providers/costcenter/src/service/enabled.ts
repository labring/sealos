export const enableRecharge = () => process.env['RECHARGE_ENABLED'] === 'true';
export const enableTransfer = () => process.env['TRANSFER_ENABLED'] === 'true';
export const enableInvoice = () =>
  process.env['INVOICE_ENABLED'] === 'true' &&
  !!process.env['FEISHU_BOT_URL'] &&
  !!process.env['ALI_ACCESS_KEY_ID'] &&
  !!process.env['ALI_ACCESS_KEY_SECRET'] &&
  !!process.env['ALI_SIGN_NAME'] &&
  !!process.env['ALI_TEMPLATE_CODE'] &&
  !!process.env['MONGODB_URI'];
export const enableGpu = () => !!process.env['GPU_ENABLED'];
export const enableWechat = () => process.env['WECHAT_ENABLED'] === 'true';
export const enableStripe = () =>
  process.env['STRIPE_ENABLED'] === 'true' && !!process.env['STRIPE_PUB'];
