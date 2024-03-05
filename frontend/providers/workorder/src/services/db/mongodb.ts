import { MongoClient } from 'mongodb';

export async function connectToDatabase() {
  if (global.mongodb) {
    return global.mongodb;
  }
  const uri = process.env.MONGODB_URI || '';
  global.mongodb = new MongoClient(uri);
  // global.mongodb = 'connecting';
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
