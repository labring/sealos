import React from 'react';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';

const IntlProvider = async ({ children }: { children: React.ReactNode }) => {
  const messages = await getMessages();
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
};

export default IntlProvider;
