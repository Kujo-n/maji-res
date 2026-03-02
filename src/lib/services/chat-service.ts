import { db } from "@/lib/firebase/client";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  serverTimestamp, 
  doc, 
  getDoc,
  Timestamp,
  updateDoc,
  FieldValue,
  writeBatch,
  limit
} from "firebase/firestore";
import { Message, ContradictionInfo } from "@/lib/types";
import { AgentResponse } from "@/lib/agents/types";
import { UserRole } from "@/lib/firebase/users";
import { THREAD_LIMITS, MESSAGE_LIMITS } from "@/lib/constants/limits";


// Define Firestore data shapes
export interface ThreadData {
  id?: string;
  userId: string;
  title: string;
  presetId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MessageData {
    id?: string;
    role: "user" | "assistant";
    content: string;
    verdict?: "APPROVE" | "DENY" | "CONDITIONAL";
    agentResponses?: AgentResponse[];
    syncRate?: number;
    contradiction?: ContradictionInfo;
    createdAt: Timestamp;
}

// Firestore write payload (uses FieldValue for serverTimestamp)
interface MessagePayload {
    role: "user" | "assistant";
    content: string;
    verdict?: "APPROVE" | "DENY" | "CONDITIONAL";
    agentResponses?: AgentResponse[];
    syncRate?: number;
    contradiction?: ContradictionInfo;
    createdAt: FieldValue;
}

export const ChatService = {
  /**
   * Create a new chat thread for a user
   */
  async createThread(userId: string, role: UserRole, presetId: string, title: string = "New Conversation") {
    const limitMax = THREAD_LIMITS[role] || THREAD_LIMITS.user;
    const threadsRef = collection(db, "users", userId, "threads");

    // Check current thread count
    const qCount = query(threadsRef, orderBy("updatedAt", "asc"));
    const snapshotCount = await getDocs(qCount);
    
    if (snapshotCount.size >= limitMax) {
      // Need to delete the oldest threads until we are under the limit
      const excessCount = snapshotCount.size - limitMax + 1; // +1 to make room for the new one
      const oldestDocs = snapshotCount.docs.slice(0, excessCount);
      
      const batch = writeBatch(db);
      for (const oldDoc of oldestDocs) {
        // Delete messages subcollection
        const msgsRef = collection(db, "users", userId, "threads", oldDoc.id, "messages");
        const msgsSnapshot = await getDocs(msgsRef);
        msgsSnapshot.forEach(msgDoc => {
          batch.delete(msgDoc.ref);
        });
        // Delete thread document
        batch.delete(oldDoc.ref);
      }
      await batch.commit();
    }

    const docRef = await addDoc(threadsRef, {
      userId,
      title,
      presetId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Save a message to a thread
   */
  async addMessage(userId: string, role: UserRole, threadId: string, message: Message) {
    const messagesRef = collection(db, "users", userId, "threads", threadId, "messages");
    
    // Check current message count
    const limitMax = MESSAGE_LIMITS[role] || MESSAGE_LIMITS.user;
    if (message.role === "user") { // Only count user initiating the message check, or just check overall
      const qCount = query(messagesRef);
      const snapshotCount = await getDocs(qCount);
      // Assistant response pairs with User response, so 1 user msg + 1 assistant msg = 2 messages.
      // But typically we enforce limit on the user action. We check if total messages >= limitMax.
      // E.g limit 50 means 50 messages total in thread (25 turns).
      if (snapshotCount.size >= limitMax) {
        throw new Error("MESSAGE_LIMIT_REACHED");
      }
    }

    // Convert undefined to null for Firestore or omit keys?
    // Firestore ignores undefined, but best to be explicit if needed.
    const payload: MessagePayload = {
      role: message.role as "user" | "assistant",
      content: message.content,
      createdAt: serverTimestamp(),
    };

    if (message.verdict) payload.verdict = message.verdict;
    if (message.agentResponses) payload.agentResponses = message.agentResponses;
    if (message.syncRate != null) payload.syncRate = message.syncRate;
    if (message.contradiction) payload.contradiction = message.contradiction;

    await addDoc(messagesRef, payload);

    // Update thread's updatedAt
    const threadRef = doc(db, "users", userId, "threads", threadId);
    await updateDoc(threadRef, {
        updatedAt: serverTimestamp(),
        // Simple title update logic: use first user message as title if "New Conversation"
        // (This can be refined later)
    });
  },

  /**
   * Get messages for a thread
   */
  async getThreadMessages(userId: string, threadId: string): Promise<Message[]> {
    const messagesRef = collection(db, "users", userId, "threads", threadId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data() as MessageData;
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        verdict: data.verdict as any,
        agentResponses: data.agentResponses,
        syncRate: data.syncRate,
        contradiction: data.contradiction as any,
        createdAt: data.createdAt?.toDate(),
      };
    });
  },

  /**
   * Get all threads for a user
   */
  async getUserThreads(userId: string): Promise<ThreadData[]> {
    const threadsRef = collection(db, "users", userId, "threads");
    const q = query(threadsRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ThreadData));
  }
};
