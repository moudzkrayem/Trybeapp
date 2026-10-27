'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface CachedImageProps extends ImageProps {
  fallback?: string;
}

export const CachedImage = React.memo(function CachedImage({ src, alt, className, fallback, ...props }: CachedImageProps) {
  const [error, setError] = useState(false);

  const initialSrc = typeof src === 'string' ? src : '';
  const finalSrc = error && fallback ? fallback : initialSrc;

  if (!finalSrc) return null;

  return (
    <Image 
      src={finalSrc} 
      alt={alt} 
      className={cn(className)}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
      {...props} 
    />
  );
});
