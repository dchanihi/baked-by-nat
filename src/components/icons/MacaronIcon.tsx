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
    {/* Top shell outer edge */}
    <ellipse cx="12" cy="7" rx="9" ry="4" />
    {/* Top shell inner rim */}
    <ellipse cx="12" cy="8.5" rx="8" ry="3" />
    
    {/* Wavy filling */}
    <path d="M4.5 12c1.2 0.8 2.5 0 3.7 0.8s2.5 0 3.8 0.8 2.5 0 3.7-0.8c1.2-0.8 2.5 0 3.8-0.8" />
    
    {/* Bottom shell inner rim */}
    <ellipse cx="12" cy="15.5" rx="8" ry="3" />
    {/* Bottom shell outer edge */}
    <ellipse cx="12" cy="17" rx="9" ry="4" />
  </svg>
);

export default MacaronIcon;
