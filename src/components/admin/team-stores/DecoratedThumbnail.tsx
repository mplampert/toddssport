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
  size?: number; // px, default 32
  className?: string;
}

export function DecoratedThumbnail({ imgSrc, logos = [], size = 32, className = "" }: Props) {
  if (!imgSrc && logos.length === 0) return null;

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
        const logoSize = Math.max(logo.scale * 100, 15); // percentage of container
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
