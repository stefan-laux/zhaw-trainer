import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from "firebase/storage";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseConfigured) {
  try {
    app = initializeApp(cfg as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (e) {
    console.error("Firebase init failed", e);
  }
}

export { auth, db, storage };

export function isAdmin(user: User | null): boolean {
  if (!user || !user.email) return false;
  if (ADMIN_EMAILS.length === 0) return false; // no allowlist configured -> nobody is admin (safe default)
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export function watchAuth(cb: (user: User | null) => void) {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function loginGoogle() {
  if (!auth) throw new Error("Firebase nicht konfiguriert");
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function loginMicrosoft() {
  if (!auth) throw new Error("Firebase nicht konfiguriert");
  const provider = new OAuthProvider("microsoft.com");
  provider.setCustomParameters({ prompt: "select_account", domain_hint: "zhaw.ch" });
  await signInWithPopup(auth, provider);
}

export async function loginEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase nicht konfiguriert");
  await signInWithEmailAndPassword(auth, email, password);
}

export async function registerEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase nicht konfiguriert");
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  if (auth) await signOut(auth);
}

export async function loadProgress(uid: string): Promise<Record<string, unknown> | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function saveProgress(uid: string, data: Record<string, unknown>) {
  if (!db) return;
  await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export interface SlideMeta {
  id: string;
  subjectId: string;
  week: string;
  title: string;
  url: string;
  storagePath?: string;
  uploadedBy?: string;
  createdAt?: string;
}

export async function uploadSlide(subjectId: string, week: string, title: string, file: File, uid: string): Promise<SlideMeta> {
  if (!storage || !db) throw new Error("Firebase nicht konfiguriert");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `slides/${subjectId}/${week}/${Date.now()}_${safe}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  const id = `${subjectId}-${week}-${Date.now()}`;
  const meta: SlideMeta = { id, subjectId, week, title, url, storagePath: path, uploadedBy: uid, createdAt: new Date().toISOString() };
  await setDoc(doc(db, "slides", id), meta);
  return meta;
}

export async function listSlides(subjectId: string): Promise<SlideMeta[]> {
  if (!db) return [];
  const q = query(collection(db, "slides"), where("subjectId", "==", subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SlideMeta);
}

export async function deleteSlide(meta: SlideMeta) {
  if (!db || !storage) return;
  if (meta.storagePath) {
    try {
      await deleteObject(storageRef(storage, meta.storagePath));
    } catch {
      /* ignore */
    }
  }
  await deleteDoc(doc(db, "slides", meta.id));
}

export async function saveCustomQuestions(subjectId: string, examId: string, questions: unknown[]) {
  if (!db) throw new Error("Firebase nicht konfiguriert");
  await setDoc(doc(db, "customQuestions", `${subjectId}_${examId}`), {
    subjectId,
    examId,
    questions,
    updatedAt: serverTimestamp(),
  });
}

export async function listCustomQuestions(subjectId: string): Promise<Record<string, unknown>[]> {
  if (!db) return [];
  const q = query(collection(db, "customQuestions"), where("subjectId", "==", subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Record<string, unknown>);
}
