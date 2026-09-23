import Image from "next/image";

export function EfMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/ef.png"
      alt="Entrepreneur First"
      width={size}
      height={size}
      className="rounded-md"
      priority
    />
  );
}
