import React from "react";

interface SeedControlsProps {
  seed: string;
  onSeedChange: (v: string) => void;
  onComputeGreedy: () => void;
  onComputeHungarian: () => void;
}

export default function SeedControls({
  seed,
  onSeedChange,
  onComputeGreedy,
  onComputeHungarian
}: SeedControlsProps) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "end", marginTop: 8 }}>
      <label style={{ display: "flex", flexDirection: "column" }}>
        Seed
        <input
          value={seed}
          onChange={(e) => onSeedChange(e.target.value)}
          placeholder="optional seed"
        />
      </label>

      <button onClick={onComputeGreedy}>Compute (Greedy)</button>
      <button onClick={onComputeHungarian}>Compute (Hungarian)</button>
    </div>
  );
}
