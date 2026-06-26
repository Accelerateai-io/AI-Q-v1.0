
type InputProps = {
  labelName: string | React.ReactNode;
  id: string;
  icon?: React.ReactNode;
  type?: "text" | "email" | "password" | "number" | "textarea" | "file";
  name: string;
  value: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  rows?: number;
  cols?: number;
  required ?: boolean;
};

const Input = ({
  labelName,
  id,
  icon,
  type = "text",
  name,
  value,
  onChange,
  rows = 4,
  cols,
  required,
  ...props
}: InputProps) => {
  return (
    <div className="input_wrapper">
      <label htmlFor={id}>
        {icon && <span>{icon}</span>}
        {labelName}
      </label>

      {type === "textarea" ? (
        <textarea
          id={id}
          name={name}
          value={value}
          rows={rows}
          cols={cols}
          required={required}
          onChange={onChange}
          className="textarea_field"
          {...props}
        />
      ) : (
        <input
          id={id}
          type={type}
          name={name}
          value={value}
          required = {required}
          onChange={onChange}
          className="input_field"
          {...props}
          
        />
      )}
    </div>
  );
};

export default Input;
