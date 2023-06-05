import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI as string;

const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');
  } catch (error) {
    console.error(error);
  }
}
connectToDatabase();
export default client;
