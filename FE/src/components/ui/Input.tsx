import { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, fullWidth = false, id, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id || generatedId;

        const baseInputStyles = 'block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200';

        const inputClasses = [
            baseInputStyles,
            error ? 'ring-red-300 focus:ring-red-500 text-red-900 placeholder-red-300' : '',
            fullWidth ? 'w-full' : '',
            className,
        ].filter(Boolean).join(' ');

        return (
            <div className={`${fullWidth ? 'w-full' : ''}`}>
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        id={inputId}
                        ref={ref}
                        className={inputClasses}
                        {...props}
                    />
                    {error && (
                        <p className="mt-1 text-sm text-red-600" id={`${inputId}-error`}>
                            {error}
                        </p>
                    )}
                </div>
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
