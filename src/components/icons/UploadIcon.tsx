import React from 'react';

// Icon for file uploading
export const UploadIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-.75M15.75 5.25v-1.5a2.25 2.25 0 00-2.25-2.25h-3.75a2.25 2.25 0 00-2.25 2.25v1.5" />
    </svg>
);
