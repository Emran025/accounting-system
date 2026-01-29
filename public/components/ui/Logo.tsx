import Image from "next/image";
export function FullLogo() {

  return (
      <Image
          src="/ACCSYSTEM_LOGO_2.svg"
          alt="Logo"
          
          className="full-logo"
          priority
      />
  );
}