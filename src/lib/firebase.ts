import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
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

if (firebaseConfigured) {
  try {
    app = initializeApp(cfg as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase init failed", e);
  }
}

export { auth, db };

export function isAdmin(user: User | null): boolean {
  if (!user || !user.email) return false;
  if (ADMIN_EMAILS.length === 0) return false;
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

/* ---------------- progress ---------------- */

export async function loadProgress(uid: string): Promise<Record<string, unknown> | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function saveProgress(uid: string, data: Record<string, unknown>) {
  if (!db) return;
  await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/* ---------------- file uploads (Firestore, chunked base64) ---------------- */

const FILE_CHUNK = 700 * 1024; // raw bytes per chunk (< 1 MiB Firestore doc limit)

export interface SlideMeta {
  id: string;
  subjectId: string;
  week: string;
  title: string;
  fileName: string;
  type: string;
  size: number;
  chunks: number;
  uploadedBy?: string;
  createdAt?: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + step)) as number[]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function uploadSlide(subjectId: string, week: string, title: string, file: File, uid: string): Promise<SlideMeta> {
  if (!db) throw new Error("Firebase nicht konfiguriert");
  const buf = new Uint8Array(await file.arrayBuffer());
  const total = Math.max(1, Math.ceil(buf.length / FILE_CHUNK));
  const id = `${subjectId}-${week.replace(/\s+/g, "")}-${Date.now()}`;
  for (let i = 0; i < total; i++) {
    const slice = buf.subarray(i * FILE_CHUNK, Math.min((i + 1) * FILE_CHUNK, buf.length));
    await setDoc(doc(db, "slides", `${id}__c${i}`), { i, data: bytesToBase64(slice) });
  }
  const meta: SlideMeta = {
    id,
    subjectId,
    week,
    title,
    fileName: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    chunks: total,
    uploadedBy: uid,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "slides", id), meta as unknown as Record<string, unknown>);
  return meta;
}

export async function listSlides(subjectId: string): Promise<SlideMeta[]> {
  if (!db) return [];
  const q = query(collection(db, "slides"), where("subjectId", "==", subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SlideMeta);
}

export async function deleteSlide(meta: SlideMeta) {
  if (!db) return;
  for (let i = 0; i < meta.chunks; i++) {
    try {
      await deleteDoc(doc(db, "slides", `${meta.id}__c${i}`));
    } catch {
      /* ignore */
    }
  }
  await deleteDoc(doc(db, "slides", meta.id));
}

export async function loadFileUrl(meta: SlideMeta): Promise<string> {
  if (!db) throw new Error("Firebase nicht konfiguriert");
  const parts: string[] = [];
  for (let i = 0; i < meta.chunks; i++) {
    const snap = await getDoc(doc(db, "slides", `${meta.id}__c${i}`));
    parts.push((snap.data()?.data as string) ?? "");
  }
  const bytes = base64ToBytes(parts.join(""));
  const blob = new Blob([bytes as unknown as BlobPart], { type: meta.type || "application/pdf" });
  return URL.createObjectURL(blob);
}

/* ---------------- content overrides (optional, admin-published) ---------------- */

export async function publishCollection(subjectId: string, kind: string, items: { id: string }[]) {
  if (!db) throw new Error("Firebase nicht konfiguriert");
  for (const item of items) {
    await setDoc(doc(db, "content", subjectId, kind, item.id), item as unknown as Record<string, unknown>);
  }
}

export async function loadCollection<T>(subjectId: string, kind: string): Promise<T[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "content", subjectId, kind));
    return snap.docs.map((d) => d.data() as T);
  } catch {
    return [];
  }
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
