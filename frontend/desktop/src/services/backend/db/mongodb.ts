import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI as string;


export async function connectToDatabase() {

  if (global.mongodb) {
    return global.mongodb;
  }
  global.mongodb = new MongoClient(uri);
  // global.mongodb = 'connecting';
  try {
    global.mongodb.on('error', (err) => {
      global.mongodb = null;
    })
    global.mongodb.on('close', () => {
      global.mongodb = null;
    })
    // global.mongodb.on()
    // mongoose.set('strictQuery', true);
    await global.mongodb.connect();
    return global.mongodb;
    // console.log('mongo connected');
  } catch (error) {
    console.log('error->', 'mongo connect error');
    global.mongodb = null;
    return Promise.reject(error);
  } 
}

