import { describe, it, expect, vi, beforeEach } from "vitest";
import { isHapticSupported, haptic, stopHaptic, magiHaptic } from "./haptics";

describe("haptics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("isHapticSupported", () => {
    it("returns false when navigator is undefined", () => {
      const origNavigator = globalThis.navigator;
      // @ts-expect-error - testing undefined navigator
      delete globalThis.navigator;
      expect(isHapticSupported()).toBe(false);
      globalThis.navigator = origNavigator;
    });

    it("returns true when vibrate is available", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { vibrate: vi.fn() },
        writable: true,
        configurable: true,
      });
      expect(isHapticSupported()).toBe(true);
    });
  });

  describe("haptic", () => {
    it("returns false when not supported", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(haptic("light")).toBe(false);
    });

    it("calls navigator.vibrate with correct pattern", () => {
      const vibrateMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
        configurable: true,
      });
      expect(haptic("medium")).toBe(true);
      expect(vibrateMock).toHaveBeenCalledWith(25);
    });

    it("calls with success pattern", () => {
      const vibrateMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
        configurable: true,
      });
      haptic("success");
      expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10, 50, 10]);
    });

    it("returns false on vibrate error", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          vibrate: () => {
            throw new Error("fail");
          },
        },
        writable: true,
        configurable: true,
      });
      expect(haptic("light")).toBe(false);
    });
  });

  describe("stopHaptic", () => {
    it("calls vibrate(0)", () => {
      const vibrateMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, "navigator", {
        value: { vibrate: vibrateMock },
        writable: true,
        configurable: true,
      });
      stopHaptic();
      expect(vibrateMock).toHaveBeenCalledWith(0);
    });
  });

  describe("magiHaptic", () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, "navigator", {
        value: { vibrate: vi.fn().mockReturnValue(true) },
        writable: true,
        configurable: true,
      });
    });

    it("sendMessage calls medium haptic", () => {
      const result = magiHaptic.sendMessage();
      expect(result).toBe(true);
    });

    it("agentAppear calls light haptic", () => {
      expect(magiHaptic.agentAppear()).toBe(true);
    });

    it("verdictApprove calls success haptic", () => {
      expect(magiHaptic.verdictApprove()).toBe(true);
    });

    it("verdictDeny calls error haptic", () => {
      expect(magiHaptic.verdictDeny()).toBe(true);
    });

    it("verdictConditional calls warning haptic", () => {
      expect(magiHaptic.verdictConditional()).toBe(true);
    });

    it("buttonPress calls selection haptic", () => {
      expect(magiHaptic.buttonPress()).toBe(true);
    });

    it("reset calls heavy haptic", () => {
      expect(magiHaptic.reset()).toBe(true);
    });

    it("contradiction calls warning haptic", () => {
      expect(magiHaptic.contradiction()).toBe(true);
    });
  });
});
