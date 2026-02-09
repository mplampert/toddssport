/**
 * Renders a product thumbnail with the primary logo overlaid at its placement coordinates.
 * Used in the admin product list to show what the decorated product looks like.
 */

interface LogoOverlay {
  logo_url: string;
  x: number;    // 0-1 fraction
  y: number;    // 0-1 fraction
  scale: number; // 0-1 fraction
}

interface Props {
  imgSrc: string | null;
  logos?: LogoOverlay[];
  size?: number; // px, default 40
  className?: string;
}

export function DecoratedThumbnail({ imgSrc, logos = [], size = 40, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded shrink-0 bg-muted ${className}`}
      style={{ width: size, height: size }}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-contain"
        />
      )}
      {logos.map((logo, i) => {
        // Scale the logo relative to the container — minimum 20% so it's visible
        const logoSize = Math.max(logo.scale * 100, 20);
        return (
          <img
            key={i}
            src={logo.logo_url}
            alt=""
            className="absolute pointer-events-none"
            style={{
              width: `${logoSize}%`,
              height: `${logoSize}%`,
              objectFit: "contain",
              left: `${logo.x * 100}%`,
              top: `${logo.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
}
