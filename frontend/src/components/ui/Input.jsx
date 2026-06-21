import React from 'react';

const Input = React.forwardRef(
  ({ label, error, icon: Icon, className = '', containerClass = '', ...props }, ref) => {
    return (
      <div className={`w-full ${containerClass}`}>
        {label && <label className="input-label">{label}</label>}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          <input
            ref={ref}
            className={`input-field ${Icon ? 'pl-10' : ''} ${
              error ? 'border-red-400 focus:ring-red-400' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
