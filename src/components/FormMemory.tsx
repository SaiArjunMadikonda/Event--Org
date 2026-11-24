"use client";

import { useEffect } from "react";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Keeps what someone typed in a long form when the server sends them back with an error.
 *
 * Server actions report errors by redirecting to the page with `?error=...`, which reloads
 * the form empty. This remembers the fields on submit (in this browser tab only) and puts
 * them back when the page comes back with an error. Without an error, the saved copy is
 * cleared so a finished form starts fresh next time.
 */
export function FormMemory({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    const key = `form-memory:${formId}`;
    const fields = () =>
      [...form.elements].filter(
        (el): el is Field =>
          (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) &&
          el.name !== "" &&
          el.type !== "hidden" &&
          el.type !== "password",
      );

    try {
      const saved = sessionStorage.getItem(key);
      if (saved && new URLSearchParams(window.location.search).has("error")) {
        const values = JSON.parse(saved) as Record<string, string>;
        for (const el of fields()) {
          if (el.name in values) el.value = values[el.name];
        }
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable (private mode, blocked): the form still works, just without memory.
    }

    const save = () => {
      try {
        const values: Record<string, string> = {};
        for (const el of fields()) values[el.name] = el.value;
        sessionStorage.setItem(key, JSON.stringify(values));
      } catch {
        // Ignore: see above.
      }
    };
    form.addEventListener("submit", save);
    return () => form.removeEventListener("submit", save);
  }, [formId]);

  return null;
}
