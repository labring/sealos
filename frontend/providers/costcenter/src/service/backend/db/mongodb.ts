import { MongoClient } from 'mongodb';
export async function connectToDatabase() {
  const uri = global.AppConfig.costCenter.invoice.mongo.uri;
  if (global.mongodb) {
    return global.mongodb;
  }
  global.mongodb = new MongoClient(uri);
  try {
    global.mongodb.on('error', (err) => {
      global.mongodb = null;
    });
    global.mongodb.on('close', () => {
      global.mongodb = null;
    });
    await global.mongodb.connect();
    return global.mongodb;
  } catch (error) {
    console.log('error->', 'mongo connect error');
    global.mongodb = null;
    return Promise.reject(error);
  }
}
