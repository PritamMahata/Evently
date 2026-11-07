import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md font-bold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <path
          d="M5 6h22a2 2 0 0 1 2 2v4.2a3.8 3.8 0 0 0 0 7.6V24a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.2a3.8 3.8 0 0 0 0-7.6V8a2 2 0 0 1 2-2Z"
          className="fill-primary"
        />
        <path
          d="M11 16.5l3.2 3.2L21.5 12"
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary-foreground"
        />
      </svg>
      <span className="text-xl">Evently</span>
    </Link>
  );
}
