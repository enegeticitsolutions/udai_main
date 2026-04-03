export default function Sidebar({ active, onChange, onLogout, items = [] }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark brand-mark--image" aria-hidden="true">
          <img src="/images/logo_udai.png" alt="" className="brand-logo" />
        </div>
        <div>
          <strong>UDAI Admin</strong>
          <p>Healthcare operations</p>
        </div>
      </div>

      <nav className="nav">
        {items.map((item) => (
          <button
            key={item}
            className={`nav-item ${active === item ? "is-active" : ""}`}
            onClick={() => onChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      <button className="nav-logout" onClick={onLogout} type="button">
        Logout
      </button>
    </aside>
  );
}
