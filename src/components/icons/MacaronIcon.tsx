import { type LucideProps } from 'lucide-react';

const MacaronIcon = ({ size = 24, strokeWidth = 2, color = 'currentColor', ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Top shell - rounded dome */}
    <path d="M5 10c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    <ellipse cx="12" cy="10" rx="7" ry="2.5" />
    
    {/* Wavy filling in the middle */}
    <path d="M5 12.5c1.5 1 3 0 4.5 1s3 0 4.5 1 3 0 4.5-1" />
    
    {/* Bottom shell - rounded base */}
    <ellipse cx="12" cy="14" rx="7" ry="2.5" />
    <path d="M5 14c0 3.5 3.1 6 7 6s7-2.5 7-6" />
  </svg>
);

export default MacaronIcon;
