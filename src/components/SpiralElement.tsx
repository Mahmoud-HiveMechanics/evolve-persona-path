interface SpiralElementProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const SpiralElement = ({ size = 'md', className = '' }: SpiralElementProps) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  return (
    <div 
      className={`spiral-element ${sizeClasses[size]} ${className}`}
      role="img"
      aria-label="EVOLVE Leadership spiral element"
    />
  );
};