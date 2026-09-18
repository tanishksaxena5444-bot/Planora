export default function GeminiIcon({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="gemini-gradient"
          x1="4"
          y1="20"
          x2="20"
          y2="4"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4285F4" />
          <stop offset="0.5" stopColor="#A855F7" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      <path
        d="M12 2C12.8 7.3 16.7 11.2 22 12C16.7 12.8 12.8 16.7 12 22C11.2 16.7 7.3 12.8 2 12C7.3 11.2 11.2 7.3 12 2Z"
        fill="url(#gemini-gradient)"
      />
    </svg>
  );
}