import { RegionDB } from '@/types/region';
import { connectToDatabase } from './mongodb';

async function connectUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<RegionDB>('region');
  return collection;
}

export async function getRegionById(sealosRegionUid: string) {
  const collection = await connectUserCollection();
  const region = await collection.findOne({ sealosRegionUid });
  return region;
}
