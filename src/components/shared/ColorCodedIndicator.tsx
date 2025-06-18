interface ColorCodedIndicatorProps {
  colorCode?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ColorCodedIndicator({ colorCode = '#CCCCCC', size = 'md', className }: ColorCodedIndicatorProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`rounded-full shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: colorCode }}
      title={`Color code: ${colorCode}`}
    />
  );
}
