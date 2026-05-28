import { eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { users } from '@/src/db/schema';
import { validateImageUpload } from '@/src/profile/image-validation';
import {
  deleteProfileImage,
  uploadProfileImage,
} from '@/src/profile/object-storage';

type TestProfileImageSeed = {
  email: string;
  imageUrl: string;
};

const TEST_PROFILE_IMAGES: readonly TestProfileImageSeed[] = [
  {
    email: 'superadmin@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    email: 'admin@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    email: 'manager@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
  },
  {
    email: 'user@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
  },
  {
    email: 'alice@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
  },
  {
    email: 'bob@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/men/12.jpg',
  },
  {
    email: 'casey@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    email: 'dana@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
  },
  {
    email: 'private@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/men/85.jpg',
  },
  {
    email: 'delete-account@example.com',
    imageUrl: 'https://randomuser.me/api/portraits/women/17.jpg',
  },
] as const;

function getSupportedMimeType(response: Response) {
  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();

  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    return mimeType;
  }

  throw new Error(`Unsupported profile image content type: ${mimeType}`);
}

async function downloadProfileImage(seed: TestProfileImageSeed) {
  const response = await fetch(seed.imageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download ${seed.imageUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const mimeType = getSupportedMimeType(response);
  const bytes = await response.arrayBuffer();
  const file = new File([bytes], `${seed.email}.jpg`, { type: mimeType });

  return validateImageUpload(file);
}

export async function seedTestProfileImages() {
  const db = getDb();

  for (const seed of TEST_PROFILE_IMAGES) {
    const user = await db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.email, seed.email),
    });

    if (!user) {
      throw new Error(`Missing seeded test user for ${seed.email}`);
    }

    const image = await downloadProfileImage(seed);
    const uploaded = await uploadProfileImage(user.id, image);

    await db
      .update(users)
      .set({
        image: uploaded.key,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    if (user.image && user.image !== uploaded.key) {
      await deleteProfileImage(user.image);
    }

    console.log(`${seed.email} -> ${uploaded.url}`);
  }
}

seedTestProfileImages().catch((error) => {
  console.error('Failed to seed test profile images', error);
  process.exit(1);
});
