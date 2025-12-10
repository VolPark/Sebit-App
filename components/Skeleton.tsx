import { ComponentProps } from 'react';

export default function Skeleton({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} {...props} />
    );
}
