import { NativeSelect, NumberInput } from "@mantine/core";
import { DND_DICE } from "./dice.utils";
import type { DiceExpression } from "../workspace.types";

interface DiceInputProps {
  value: DiceExpression;
  onChange: (value: DiceExpression) => void;
}

function DiceInput({ value, onChange }: DiceInputProps) {
  return (
    <div className="dice-input">
      <NumberInput
        className="form-field"
        label="Number of dice"
        min={1}
        step={1}
        value={value.count}
        onChange={(count) => onChange({
            ...value,
            count: Math.max(1, Number(count) || 1),
          })}
        required
      />
      <NativeSelect
        className="form-field"
        label="Die"
        value={value.die}
        onChange={(event) => {
            const die = DND_DICE.find((candidate) => candidate === event.currentTarget.value);
            if (die) onChange({ ...value, die });
          }}
      >
        {DND_DICE.map((die) => <option key={die} value={die}>{die}</option>)}
      </NativeSelect>
      <NumberInput
        className="form-field"
        label="Modifier"
        step={1}
        value={value.modifier}
        onChange={(modifier) => onChange({
            ...value,
            modifier: Number(modifier) || 0,
          })}
      />
    </div>
  );
}

export default DiceInput;
