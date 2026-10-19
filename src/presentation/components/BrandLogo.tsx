import logo from "../../assets/haypdf.svg";

export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      className="brand-logo"
      src={logo}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
