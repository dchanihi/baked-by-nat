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
    <path d="M3 9c0-3 4-5.5 9-5.5s9 2.5 9 5.5" />
    <line x1="3" y1="9" x2="21" y2="9" />
    
    {/* Top shell ruffled feet */}
    <path d="M3.5 10.5c1 0.6 1.5 0 2.5 0.6s1.5 0 2.5 0.6 1.5 0 2.5 0.6 1.5 0 2.5-0.6 1.5 0 2.5-0.6 1.5 0 2.5-0.6" />
    
    {/* Filling layer */}
    <path d="M4 13h16" />
    
    {/* Bottom shell ruffled feet */}
    <path d="M3.5 13.5c1 0.6 1.5 0 2.5 0.6s1.5 0 2.5 0.6 1.5 0 2.5 0.6 1.5 0 2.5-0.6 1.5 0 2.5-0.6 1.5 0 2.5-0.6" />
    
    {/* Bottom shell */}
    <line x1="3" y1="15" x2="21" y2="15" />
    <path d="M3 15c0 3 4 5.5 9 5.5s9-2.5 9-5.5" />
  </svg>
);

export default MacaronIcon;
