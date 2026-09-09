type PapayaLogoProps = {
  alt?: string;
  className?: string;
  compact?: boolean;
  eager?: boolean;
};

export function PapayaLogo({
  alt = "Papaya Health",
  className = "",
  compact = false,
  eager = false,
}: PapayaLogoProps) {
  const source = compact
    ? "/assets/papaya-health-logo.png"
    : "/assets/papaya-health-header.png";
  const dimensions = compact
    ? { width: 366, height: 168 }
    : { width: 522, height: 258 };

  return (
    <img
      src={source}
      alt={alt}
      className={className}
      width={dimensions.width}
      height={dimensions.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
    />
  );
}
