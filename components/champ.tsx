import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  aide?: string;
};

// Champ de formulaire : label toujours visible, grande zone de saisie.
export function Champ({ label, name, aide, ...input }: Props) {
  const idAide = aide ? `${name}-aide` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[15px] font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-describedby={idAide}
        className="h-14 rounded-2xl border border-bord bg-carte px-4 text-base text-encre"
        {...input}
      />
      {aide && (
        <p id={idAide} className="text-sm text-sourdine">
          {aide}
        </p>
      )}
    </div>
  );
}
