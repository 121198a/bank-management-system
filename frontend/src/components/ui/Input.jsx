import React, { useId } from 'react';

const Input = React.forwardRef(
  ({ label, error, icon: Icon, className = '', containerClass = '', id: idProp, ...props }, ref) => {
    // The visible <label> is programmatically tied to the control (click-to-focus, screen readers,
    // autofill heuristics); the error text is linked via aria-describedby.
    const autoId = useId();
    const id = idProp || autoId;
    const errorId = `${id}-error`;
    return (
      <div className={`w-full ${containerClass}`}>
        {label && <label htmlFor={id} className="input-label">{label}{props.required && <span className="text-red-600 dark:text-red-400 ml-1" aria-hidden="true">*</span>}</label>}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`input-field ${Icon ? 'pl-10' : ''} ${
              error ? 'border-red-400 focus:ring-red-400' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p id={errorId} className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
