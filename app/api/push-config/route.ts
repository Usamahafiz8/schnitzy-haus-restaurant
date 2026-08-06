import { handler, ok } from "@/lib/api";

/**
 * The service worker can't read NEXT_PUBLIC_* env vars at runtime, so it fetches
 * the Firebase web config here. These values are public by design — they
 * identify the project, they don't authorise anything.
 */
export const GET = handler(async () => {
  return ok({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });
});
