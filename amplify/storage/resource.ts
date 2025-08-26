import { defineStorage } from '@aws-amplify/backend';

// Define storage configuration for student photos
export const storage = defineStorage({
  name: 'studentPhotos',
  access: (allow) => ({
    'student-photos/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete'])
    ]
  })
});
