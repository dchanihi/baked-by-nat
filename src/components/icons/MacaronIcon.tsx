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
    {/* Top shell - smooth dome */}
    <path d="M4 10c0-2.5 3.5-5 8-5s8 2.5 8 5" />
    <ellipse cx="12" cy="10" rx="8" ry="2" />
    
    {/* Top shell ruffled feet */}
    <path d="M4.5 11.5q1 .5 2 0t2 .5 2 0 2 .5 2 0 2 .5 2 0 1.5-.5" />
    
    {/* Bottom shell ruffled feet */}
    <path d="M4.5 12.5q1 .5 2 0t2 .5 2 0 2 .5 2 0 2 .5 2 0 1.5-.5" />
    
    {/* Bottom shell */}
    <ellipse cx="12" cy="14" rx="8" ry="2" />
    <path d="M4 14c0 2.5 3.5 5 8 5s8-2.5 8-5" />
  </svg>
);

export default MacaronIcon;
