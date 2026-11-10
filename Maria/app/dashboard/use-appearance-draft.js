"use client";

import { useState, useTransition } from "react";

function matches(left, right) {
  return Object.keys(left).every((key) => left[key] === right[key]);
}

export function useAppearanceDraft(stored, saveAppearance, subject) {
  const [draft, setDraft] = useState(stored);
  const [adopted, setAdopted] = useState(stored);
  const [note, setNote] = useState(null);
  const [saving, startSaving] = useTransition();

  if (!matches(adopted, stored)) {
    setAdopted(stored);
    setDraft(stored);
  }

  function edit(key) {
    return (value) => {
      setNote(null);
      setDraft((current) => ({ ...current, [key]: value }));
    };
  }

  function undo() {
    setDraft(stored);
    setNote(null);
  }

  function save() {
    setNote(null);
    startSaving(async () => {
      const fallback = `Could not save the ${subject}. Please try again.`;
      try {
        const result = await saveAppearance(draft);
        setNote(
          result?.kind === "success"
            ? `Your ${subject} ${subject === "dice" ? "are" : "is"} saved.`
            : (result?.message ?? fallback),
        );
      } catch {
        setNote(fallback);
      }
    });
  }

  return {
    draft,
    edit,
    undo,
    save,
    saving,
    note,
    changed: !matches(draft, stored),
  };
}
