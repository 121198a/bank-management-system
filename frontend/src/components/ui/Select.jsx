import React, { useId } from 'react';

const Select = React.forwardRef(
  ({ label, error, options = [], className = '', containerClass = '', id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp || autoId;
    const errorId = `${id}-error`;
    return (
      <div className={`w-full ${containerClass}`}>
        {label && <label htmlFor={id} className="input-label">{label}</label>}
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p id={errorId} className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
