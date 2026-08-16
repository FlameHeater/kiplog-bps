import { db } from '@/db/database';
import type { UserProfile } from '@/types';

export const userProfileRepository = {
  async get(): Promise<UserProfile | undefined> {
    return db.userProfile.get('me');
  },
  async save(profile: UserProfile): Promise<void> {
    await db.userProfile.put(profile);
  },
  async clear(): Promise<void> {
    await db.userProfile.clear();
  },
};
