import { useEffect, useState } from "react";
import { NumberInput } from "@mantine/core";

export default function BattleNumberInput({
  value,
  min,
  max,
  label,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function updateDraft(nextValue: string) {
    setDraft(nextValue);
    if (nextValue.trim() === "") return;
    const parsed = Number(nextValue);
    if (Number.isInteger(parsed)) {
      onCommit(Math.max(min, Math.min(max, parsed)));
    }
  }

  function commitDraft() {
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isInteger(parsed)) {
      setDraft(String(value));
      return;
    }
    const normalized = Math.max(min, Math.min(max, parsed));
    setDraft(String(normalized));
    onCommit(normalized);
  }

  return (
    <NumberInput
      min={min}
      max={max}
      step={1}
      value={draft}
      aria-label={label}
      onChange={(value) => updateDraft(String(value))}
      onBlur={commitDraft}
    />
  );
}
