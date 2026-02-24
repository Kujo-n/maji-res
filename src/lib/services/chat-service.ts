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
  FieldValue
} from "firebase/firestore";
import { Message } from "@/lib/types";
import { AgentResponse } from "@/lib/agents/types";

// Define Firestore data shapes
export interface ThreadData {
  id?: string;
  userId: string;
  title: string;
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
    contradiction?: object;
    createdAt: Timestamp;
}

// Firestore write payload (uses FieldValue for serverTimestamp)
interface MessagePayload {
    role: "user" | "assistant";
    content: string;
    verdict?: "APPROVE" | "DENY" | "CONDITIONAL";
    agentResponses?: AgentResponse[];
    syncRate?: number;
    contradiction?: object;
    createdAt: FieldValue;
}

export const ChatService = {
  /**
   * Create a new chat thread for a user
   */
  async createThread(userId: string, title: string = "New Conversation") {
    const threadsRef = collection(db, "users", userId, "threads");
    const docRef = await addDoc(threadsRef, {
      userId,
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Save a message to a thread
   */
  async addMessage(userId: string, threadId: string, message: Message) {
    const messagesRef = collection(db, "users", userId, "threads", threadId, "messages");
    
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
