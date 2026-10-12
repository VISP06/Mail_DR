import React from 'react';

interface OrganicBlobProps {
  variant: 'read-first' | 'empty-state' | 'sign-in';
  className?: string;
}

export const OrganicBlob: React.FC<OrganicBlobProps> = ({ variant, className = '' }) => {
  if (variant === 'read-first') {
    // Subtle wavy organic badge backdrop for "What should I read first?"
    return (
      <svg
        viewBox="0 0 200 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`pointer-events-none select-none ${className}`}
        aria-hidden="true"
      >
        <path
          d="M 28,42 C 18,72 45,102 88,108 C 132,114 175,92 184,60 C 193,28 155,10 112,12 C 68,14 38,12 28,42 Z"
          fill="var(--accent-chartreuse)"
          fillOpacity="0.14"
          stroke="var(--accent-chartreuse)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <path
          d="M 40,30 C 55,15 130,12 160,35 C 190,58 170,95 135,105 C 100,115 45,95 32,70 C 19,45 25,45 40,30 Z"
          fill="var(--accent-lavender)"
          fillOpacity="0.12"
          stroke="var(--accent-lavender)"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (variant === 'empty-state') {
    // Gentle serene organic garden/pond blob with pastel wavy outline for "You're all caught up"
    return (
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`pointer-events-none select-none ${className}`}
        aria-hidden="true"
      >
        <path
          d="M 45,95 C 32,142 85,185 135,182 C 185,179 215,138 205,88 C 195,38 145,22 100,28 C 55,34 58,48 45,95 Z"
          fill="var(--accent-sage)"
          fillOpacity="0.12"
          stroke="var(--accent-sage)"
          strokeWidth="1.5"
        />
        <path
          d="M 68,78 C 58,118 92,156 138,152 C 184,148 192,108 178,70 C 164,32 120,38 90,48 C 60,58 78,38 68,78 Z"
          fill="var(--accent-chartreuse)"
          fillOpacity="0.15"
          stroke="var(--accent-chartreuse)"
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />
        <path
          d="M 85,85 C 95,65 140,65 150,88 C 160,111 135,135 110,132 C 85,129 75,105 85,85 Z"
          fill="var(--accent-peach)"
          fillOpacity="0.2"
          stroke="var(--accent-peach)"
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  // sign-in screen
  return (
    <svg
      viewBox="0 0 320 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <path
        d="M 65,110 C 35,185 115,245 190,235 C 265,225 295,155 270,90 C 245,25 175,18 115,35 C 55,52 95,35 65,110 Z"
        fill="var(--accent-chartreuse)"
        fillOpacity="0.12"
        stroke="var(--accent-chartreuse)"
        strokeWidth="1.8"
      />
      <path
        d="M 90,95 C 60,155 130,210 195,195 C 260,180 270,125 240,75 C 210,25 150,35 115,55 C 80,75 120,35 90,95 Z"
        fill="var(--accent-lavender)"
        fillOpacity="0.14"
        stroke="var(--accent-lavender)"
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
      <path
        d="M 115,115 C 95,160 150,185 185,175 C 220,165 235,120 205,95 C 175,70 135,70 115,115 Z"
        fill="var(--accent-pink)"
        fillOpacity="0.16"
        stroke="var(--accent-pink)"
        strokeWidth="1.2"
      />
    </svg>
  );
};
