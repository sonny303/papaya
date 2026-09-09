import { PapayaMark } from "./PapayaMark";

type PapayaLogoProps = {
  alt?: string;
  animated?: boolean;
  className?: string;
};

export function PapayaLogo({
  alt = "Papaya Health",
  animated = false,
  className = "",
}: PapayaLogoProps) {
  return (
    <span
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
      className={`papaya-logo ${className}`}
      role={alt ? "img" : undefined}
    >
      <PapayaMark animated={animated} className="papaya-logo__mark" />
      <span aria-hidden="true" className="papaya-logo__wordmark">
        <span className="papaya-logo__name">papaya</span>
        <span className="papaya-logo__health">HEALTH</span>
      </span>
    </span>
  );
}
