import { ComponentProps } from 'react';

export default function Skeleton({ className, ...props }: ComponentProps<'div'>) {
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`} {...props} />
}
