import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for hardware barcode scanner integration.
 *
 * Hardware barcode scanners emulate keyboard input at extremely high speed.
 * This hook differentiates scanner input from normal keyboard typing by:
 * 1. Tracking the time gap between keystrokes
 * 2. Detecting rapid input (< 50ms between chars) characteristic of scanners
 * 3. Triggering the callback when Enter is pressed after rapid input
 *
 * Key design decisions:
 * - Uses a buffer to accumulate rapid characters
 * - Resets on slow input (> 100ms gap) to handle normal typing
 * - Minimum barcode length of 3 chars to avoid false positives
 * - Ignores events when user is focused on input/textarea elements
 *   (unless allowInInputs is true)
 */
interface UseBarcodeScanner {
  onScan: (barcode: string) => void;
  /** If true, captures scanner input even when an input element is focused */
  allowInInputs?: boolean;
  /** Minimum character length to consider a valid barcode (default: 3) */
  minLength?: number;
  /** Max milliseconds between characters for scanner detection (default: 50) */
  maxInterCharDelay?: number;
  /** If true, the hook is active; set to false to temporarily disable (default: true) */
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  allowInInputs = false,
  minLength = 3,
  maxInterCharDelay = 50,
  enabled = true,
}: UseBarcodeScanner) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = "";
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if user is typing in an input field (unless explicitly allowed)
      if (!allowInInputs) {
        const target = event.target as HTMLElement;
        const tagName = target?.tagName?.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          target?.isContentEditable
        ) {
          return;
        }
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Clear any pending reset timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // If the Enter key is pressed, try to submit the barcode
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();

        const barcode = bufferRef.current.trim();
        if (barcode.length >= minLength) {
          onScan(barcode);
        }
        resetBuffer();
        return;
      }

      // Only accept printable single characters
      if (event.key.length !== 1) {
        return;
      }

      // If too much time has passed since last key, reset the buffer
      // This means the user is typing normally, not using a scanner
      if (timeSinceLastKey > maxInterCharDelay * 2 && bufferRef.current.length > 0) {
        resetBuffer();
      }

      // Append the character to the buffer
      bufferRef.current += event.key;

      // Set a safety timer: if no more keys come within 200ms, reset
      // This prevents the buffer from growing indefinitely from slow typing
      timerRef.current = setTimeout(() => {
        // If we have a valid barcode worth of characters, it's likely a scanner
        // that didn't send Enter. Some scanners are configured without Enter suffix.
        const currentBuffer = bufferRef.current.trim();
        if (currentBuffer.length >= minLength) {
          // Check if all characters came in rapidly (scanner pattern)
          // We can't perfectly verify this retrospectively, so we check buffer length
          // Scanners typically send 8-20+ chars very rapidly
          if (currentBuffer.length >= 8) {
            onScan(currentBuffer);
          }
        }
        resetBuffer();
      }, 200);
    },
    [enabled, allowInInputs, minLength, maxInterCharDelay, onScan, resetBuffer]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, handleKeyDown]);

  return {
    /** Manually reset the scanner buffer */
    resetBuffer,
  };
}
