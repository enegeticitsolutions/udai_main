export default function Button({ children, variant = "primary", type = "button", ...props }) {
  return (
    <button className={`btn btn-${variant}`} type={type} {...props}>
      {children}
    </button>
  );
}
