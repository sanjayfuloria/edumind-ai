// src/services/database.js
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  setDoc, query, where, orderBy, limit, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────
export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

export async function getAllUsers(role = null) {
  let q = collection(db, 'users');
  if (role) q = query(q, where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

// ─────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────
export async function createCourse(data) {
  return await addDoc(collection(db, 'courses'), {
    ...data,
    enrolledCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getCourse(id) {
  const snap = await getDoc(doc(db, 'courses', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllCourses() {
  const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateCourse(id, data) {
  await updateDoc(doc(db, 'courses', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCourse(id) {
  await deleteDoc(doc(db, 'courses', id));
}

// ─────────────────────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────────────────────
export async function enrollStudent(userId, courseId) {
  const enrollId = `${userId}_${courseId}`;
  await setDoc(doc(db, 'enrollments', enrollId), {
    userId,
    courseId,
    progress: 0,
    enrolledAt: serverTimestamp(),
    lastActivity: serverTimestamp(),
  });
  await updateDoc(doc(db, 'courses', courseId), { enrolledCount: (await getCourse(courseId)).enrolledCount + 1 });
}

export async function getStudentEnrollments(userId) {
  const q = query(collection(db, 'enrollments'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateProgress(userId, courseId, progress) {
  const enrollId = `${userId}_${courseId}`;
  await updateDoc(doc(db, 'enrollments', enrollId), {
    progress,
    lastActivity: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// QUIZ RESULTS
// ─────────────────────────────────────────────────────────
export async function saveQuizResult(userId, courseId, quizData) {
  return await addDoc(collection(db, 'quizResults'), {
    userId,
    courseId,
    ...quizData,
    completedAt: serverTimestamp(),
  });
}

export async function getStudentQuizResults(userId) {
  const q = query(collection(db, 'quizResults'), where('userId', '==', userId), orderBy('completedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCourseQuizResults(courseId) {
  const q = query(collection(db, 'quizResults'), where('courseId', '==', courseId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────
// AI CHAT HISTORY
// ─────────────────────────────────────────────────────────
export async function saveChatMessage(userId, courseId, role, content) {
  return await addDoc(collection(db, 'chatHistory'), {
    userId,
    courseId,
    role,
    content,
    timestamp: serverTimestamp(),
  });
}

export async function getChatHistory(userId, courseId, msgLimit = 20) {
  const q = query(
    collection(db, 'chatHistory'),
    where('userId', '==', userId),
    where('courseId', '==', courseId),
    orderBy('timestamp', 'desc'),
    limit(msgLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
}

export function subscribeToChatHistory(userId, courseId, callback) {
  const q = query(
    collection(db, 'chatHistory'),
    where('userId', '==', userId),
    where('courseId', '==', courseId),
    orderBy('timestamp', 'asc'),
    limit(50)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ─────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────
export async function createAnnouncement(data) {
  return await addDoc(collection(db, 'announcements'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getAnnouncements(courseId = null) {
  let q;
  if (courseId) {
    q = query(collection(db, 'announcements'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────
export async function getAnalyticsSummary() {
  const [users, courses, enrollments, quizzes] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'courses')),
    getDocs(collection(db, 'enrollments')),
    getDocs(collection(db, 'quizResults')),
  ]);

  const studentCount = users.docs.filter(d => d.data().role === 'student').length;
  const avgQuizScore = quizzes.docs.length
    ? quizzes.docs.reduce((sum, d) => sum + (d.data().score || 0), 0) / quizzes.docs.length
    : 0;

  return {
    totalStudents: studentCount,
    totalCourses: courses.size,
    totalEnrollments: enrollments.size,
    totalQuizAttempts: quizzes.size,
    avgQuizScore: Math.round(avgQuizScore),
  };
}
