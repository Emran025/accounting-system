import Image from "next/image";
export function FullLogo({ isCollapsed }: { isCollapsed: boolean }) {

  return (
    <Image
      src={isCollapsed ? "/ACCSYSTEM_LOGO.svg" : "/ACCSYSTEM_LOGO_2.svg"}
      alt="Logo"
      height={isCollapsed ? 60 : 70}
      width={isCollapsed ? 60 : 270}
      className="full-logo"
      priority
    />
  );
}