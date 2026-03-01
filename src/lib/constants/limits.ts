export const THREAD_LIMITS = {
  admin: Number(process.env.NEXT_PUBLIC_ADMIN_THREAD_LIMIT || 50),
  user: Number(process.env.NEXT_PUBLIC_USER_THREAD_LIMIT || 20),
};

export const MESSAGE_LIMITS = {
  admin: Number(process.env.NEXT_PUBLIC_ADMIN_MESSAGE_LIMIT || 100),
  user: Number(process.env.NEXT_PUBLIC_USER_MESSAGE_LIMIT || 50),
};
