"use client";

/**
 * Haptic feedback patterns for different interaction types
 * Uses the Vibration API (supported on Android and some other devices)
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10, 50, 10],  // Triple pulse for success
  warning: [50, 100, 50],         // Double pulse for warning
  error: [100, 50, 100],          // Urgent double pulse for error
  selection: 5,                    // Very light tap for selection
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/**
 * Trigger haptic feedback with specified pattern
 */
export function haptic(pattern: HapticPattern = "light"): boolean {
  if (!isHapticSupported()) return false;
  
  try {
    return navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic(): boolean {
  if (!isHapticSupported()) return false;
  return navigator.vibrate(0);
}

/**
 * Haptic feedback for MAGI-specific events
 */
export const magiHaptic = {
  // Light tap when sending message
  sendMessage: () => haptic("medium"),
  
  // Agent appears
  agentAppear: () => haptic("light"),
  
  // Verdict announced
  verdictApprove: () => haptic("success"),
  verdictDeny: () => haptic("error"),
  verdictConditional: () => haptic("warning"),
  
  // Button press
  buttonPress: () => haptic("selection"),
  
  // Reset confirmation
  reset: () => haptic("heavy"),
  
  // Contradiction warning
  contradiction: () => haptic("warning"),
};

export default magiHaptic;
