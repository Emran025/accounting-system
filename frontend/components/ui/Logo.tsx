import { ReactNode } from "react";
import Image from "next/image";

interface LogoStyle {
  type: "LogoVertical" | "LogoHorizontal" | "LogoVanilla";
  size: {
    width: number;
    height: number;
  };
}

interface FullLogoProps {
  isWatermark?: boolean;
  type: LogoStyle["type"];
  size: LogoStyle["size"];
  children?: ReactNode;
  opacity?: number;
}

export function FullLogo({
  isWatermark,
  type,
  size,
  children,
  opacity = 0.05
}: FullLogoProps) {
  let logo = "/ACCSYSTEM_LOGO.svg";

  if (type === "LogoVertical") {
    logo = "/ACCSYSTEM_LOGO_3.svg";
  } else if (type === "LogoHorizontal") {
    logo = "/ACCSYSTEM_LOGO_2.svg";
  }

  if (isWatermark && children) {
    return (
      <div className="watermark-wrapper">
        <div
          className="watermark-bg"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: size.width,
            height: size.height,
            backgroundImage: `url(${logo})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: opacity,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <div className="watermark-content">
          {children}
        </div>
      </div>
    );
  }

  return (
    <Image
      src={logo}
      alt="Logo"
      height={size.height}
      width={size.width}
      style={{ opacity: isWatermark ? opacity : 1 }}
      className="full-logo"
      priority
    />
  );
}