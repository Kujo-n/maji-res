import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from './chat-service';
import { db } from '../firebase/client';
import { collection, addDoc, query, orderBy, getDocs, writeBatch, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { THREAD_LIMITS, MESSAGE_LIMITS } from '../constants/limits';

// Mock Firebase functions
vi.mock('../firebase/client', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    addDoc: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    getDocs: vi.fn(),
    serverTimestamp: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(),
    limit: vi.fn()
  };
});

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createThread', () => {
    it('creates a thread successfully when under limit', async () => {
      const mockSnapshotCount = { size: 0, docs: [] };
      (getDocs as any).mockResolvedValue(mockSnapshotCount);
      (addDoc as any).mockResolvedValue({ id: 'new-thread-id' });

      const threadId = await ChatService.createThread('user1', 'user', 'MAGI', 'My Title');

      expect(threadId).toBe('new-thread-id');
      expect(addDoc).toHaveBeenCalled();
      expect(writeBatch).not.toHaveBeenCalled();
    });

    it('deletes oldest thread when user limit is reached before creating new one', async () => {
      const limitMap = THREAD_LIMITS['user'];
      const mockOldDoc = { id: 'old-doc-1', ref: {} };
      const mockDocArray = Array(limitMap).fill(mockOldDoc);
      const mockSnapshotCount = { size: limitMap, docs: mockDocArray };
      
      (getDocs as any)
        .mockResolvedValueOnce(mockSnapshotCount) // Query threads
        .mockResolvedValueOnce({ forEach: vi.fn() }); // Query messages inside thread

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn()
      };
      (writeBatch as any).mockReturnValue(mockBatch);
      (addDoc as any).mockResolvedValue({ id: 'new-thread-id' });

      const threadId = await ChatService.createThread('user1', 'user', 'MAGI', 'My Title');

      expect(threadId).toBe('new-thread-id');
      expect(writeBatch).toHaveBeenCalled();
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('addMessage', () => {
    it('throws error when message limit is reached for user message', async () => {
      const limitMax = MESSAGE_LIMITS['user'];
      const mockSnapshotCount = { size: limitMax, docs: [] };
      (getDocs as any).mockResolvedValue(mockSnapshotCount);

      await expect(
        ChatService.addMessage('user1', 'user', 'thread1', { role: 'user', content: 'test', id: '1', createdAt: new Date() })
      ).rejects.toThrow('MESSAGE_LIMIT_REACHED');
      
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('adds message successfully when under limit', async () => {
      const mockSnapshotCount = { size: 0, docs: [] };
      (getDocs as any).mockResolvedValue(mockSnapshotCount);

      await ChatService.addMessage('user1', 'user', 'thread1', { role: 'user', content: 'test', id: '1', createdAt: new Date() });
      
      expect(addDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('deleteThread', () => {
    it('deletes a thread and its messages via batch', async () => {
      const mockMessageDocs = [
        { id: 'msg1', ref: { path: 'msg1-ref' } },
        { id: 'msg2', ref: { path: 'msg2-ref' } }
      ];
      (getDocs as any).mockResolvedValue({
        forEach: (cb: any) => mockMessageDocs.forEach(cb)
      });

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn()
      };
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockReturnValue({ path: 'thread-ref' });

      await ChatService.deleteThread('user1', 'thread1');

      // The thread doc + 2 messages = 3 deletes
      expect(mockBatch.delete).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
