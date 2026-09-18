import admin from "firebase-admin";

// Initializes the Firebase Admin SDK once per process.
// Supports either:
//  - FIREBASE_SERVICE_ACCOUNT (the full service-account JSON as a single-line env var), or
//  - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (split fields)
function buildCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    return admin.credential.cert(serviceAccount);
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env files can't hold real newlines, so private keys are stored with
      // literal "\n" sequences that need to be converted back.
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  throw new Error(
    "Firebase admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT or " +
      "FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in your .env",
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: buildCredential(),
  });
}

export default admin;
