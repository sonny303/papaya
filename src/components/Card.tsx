import type { HTMLAttributes } from "react";

type CardTone = "surface" | "peach" | "leaf" | "butter";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

const toneClasses: Record<CardTone, string> = {
  surface: "",
  peach: "p-card--peach",
  leaf: "p-card--leaf",
  butter: "p-card--butter",
};

export function Card({
  className = "",
  tone = "surface",
  ...props
}: CardProps) {
  return (
    <div
      className={`p-card ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
