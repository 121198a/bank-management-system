import React from 'react';

const Select = React.forwardRef(
  ({ label, error, options = [], className = '', containerClass = '', ...props }, ref) => {
    return (
      <div className={`w-full ${containerClass}`}>
        {label && <label className="input-label">{label}</label>}
        <select
          ref={ref}
          className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
