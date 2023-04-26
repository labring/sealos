import { Configuration, OpenAIApi } from 'openai';

export const getOpenAIApi = () => {
  if (!process.env.OPENAI_KEY) {
    throw new Error('未配置 openai key');
  }
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY
  });

  return new OpenAIApi(configuration, undefined);
};
