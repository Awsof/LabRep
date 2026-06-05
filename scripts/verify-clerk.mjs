import { createClerkClient } from '@clerk/backend';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

try {
  const users = await clerk.users.getUserList({ limit: 1 });
  console.log('Clerk OK — usuários no app:', users.totalCount);
  console.log('Publishable Key configurada:', process.env.CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...');
} catch (err) {
  console.error('ERRO Clerk:', err.message);
  process.exit(1);
}
