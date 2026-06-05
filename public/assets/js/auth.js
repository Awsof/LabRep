/* LabRep Auth — @clerk/clerk-js (Vanilla JS, sem Next.js) */

const PUBLISHABLE_KEY = 'pk_test_c2FjcmVkLXdoaXBwZXQtMjEuY2xlcmsuYWNjb3VudHMuZGV2JA';

let _clerk = null;

export async function initClerk() {
  if (_clerk) return _clerk;

  const { Clerk } = await import('https://esm.sh/@clerk/clerk-js@5');
  _clerk = new Clerk(PUBLISHABLE_KEY);
  await _clerk.load();
  return _clerk;
}

export async function getAuthToken() {
  const clerk = await initClerk();
  return clerk.session?.getToken() ?? null;
}

export async function getUser() {
  const clerk = await initClerk();
  return clerk.user ?? null;
}

export async function requireLogin() {
  const clerk = await initClerk();
  if (!clerk.user) {
    clerk.openSignIn({ redirectUrl: window.location.href });
    return false;
  }
  return true;
}

export async function signOut() {
  const clerk = await initClerk();
  await clerk.signOut();
  window.location.hash = '#/';
}
