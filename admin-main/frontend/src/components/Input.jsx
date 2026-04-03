export default function Input({ label, className = "", ...props }) {
  return (
    <label className={`field ${className}`}>
      {label && <span>{label}</span>}
      <input {...props} />
    </label>
  );
}
