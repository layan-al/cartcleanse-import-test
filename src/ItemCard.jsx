export default function ItemCard({ item, selected, onToggle }) {
  return (
    <button
      className={`item-card ${selected ? "selected" : ""}`}
      onClick={onToggle}
      type="button"
    >
      <div className="item-image-wrap">
        <img src={item.image} alt={item.title} className="item-image" />
      </div>

      <div className="item-info">
        <p className="item-brand">{item.brand}</p>
        <p className="item-title">{item.title}</p>
        <p className="item-price">{item.price || "Price unavailable"}</p>
      </div>
    </button>
  );
}