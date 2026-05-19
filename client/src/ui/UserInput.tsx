import type { InputTypes } from "../lib/types"

export const Input = ({
    label,
    name,
    type,
    placeholder,
    value,
    onChange,
    disabled
} : InputTypes ) => { {
    return (
        <div className="text-sm w-full">
            <label
                htmlFor={name}
                className={ `text-black font-semibold text-lg`}
            >
                {label}
            </label>
                <input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    onChange={onChange}
                    value={value}
                    disabled={disabled}
                    className={`w-full text-sm mt-1 p-2 border border-border rounded text-black`}
                />
        </div>
        
    )
} }