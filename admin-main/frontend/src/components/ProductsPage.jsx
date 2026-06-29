import { useState, useRef } from "react";
import Badge from "./Badge";
import Button from "./Button";
import Input from "./Input";
import StatCard from "./StatCard";
import { PUBLIC_UPLOAD_BASE, uploadImageFile } from "../services/adminApi";

export default function ProductsPage({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [isUploading, setIsUploading] = useState(false);
  const [currentTab, setCurrentTab] = useState("product"); // "product" or "gift"
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    short_description: "",
    category: "New Arrival",
    price: "",
    originalPrice: "",
    discount: "",
    image: "",
    inStock: true,
    sku: "",
    stock_quantity: 0,
    low_stock_threshold: 5,
    product_type: "simple",
    gallery: "", // comma separated URLs
    attributes: "", // e.g. color: red, blue; size: M, L
    has_variants: false,
    weight: "",
    length: "",
    width: "",
    height: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    status: "active",
    is_featured: false,
    is_trending: false,
    tags: "", // comma separated list
  });

  const filteredProducts = products.filter((product) => {
    if (currentTab === "gift") {
      return product.isCorporateGift === true;
    } else {
      return product.isCorporateGift !== true;
    }
  });

  const totalProducts = filteredProducts.length;
  const inStockProducts = filteredProducts.filter((p) => p.inStock).length;
  const outOfStockProducts = totalProducts - inStockProducts;

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setActiveTab("basic");
    setFormData({
      title: "",
      slug: "",
      description: "",
      short_description: "",
      category: "New Arrival",
      price: "",
      originalPrice: "",
      discount: "",
      image: "",
      inStock: true,
      sku: "",
      stock_quantity: 0,
      low_stock_threshold: 5,
      product_type: "simple",
      gallery: "",
      attributes: "",
      has_variants: false,
      weight: "",
      length: "",
      width: "",
      height: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      status: "active",
      is_featured: false,
      is_trending: false,
      tags: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setActiveTab("basic");

    // Format attributes for editing back
    let attributesStr = "";
    if (product.attributes) {
      attributesStr = Object.entries(product.attributes)
        .map(([k, v]) => `${k}: ${v.join(", ")}`)
        .join("; ");
    }

    setFormData({
      title: product.title || "",
      slug: product.slug || "",
      description: product.description || "",
      short_description: product.short_description || "",
      category: product.category || "New Arrival",
      price: product.price || "",
      originalPrice: product.originalPrice || "",
      discount: product.discount || "",
      image: product.image || "",
      inStock: product.inStock !== false,
      sku: product.sku || "",
      stock_quantity: product.stock_quantity ?? 0,
      low_stock_threshold: product.low_stock_threshold ?? 5,
      product_type: product.product_type || "simple",
      gallery: product.gallery ? product.gallery.join(", ") : "",
      attributes: attributesStr,
      has_variants: product.has_variants || false,
      weight: product.weight || "",
      length: product.length || "",
      width: product.width || "",
      height: product.height || "",
      meta_title: product.meta_title || "",
      meta_description: product.meta_description || "",
      meta_keywords: product.meta_keywords || "",
      status: product.status || "active",
      is_featured: product.is_featured || false,
      is_trending: product.is_trending || false,
      tags: product.tags ? product.tags.join(", ") : "",
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadImageFile(file);
      // Supabase returns a full HTTPS URL — use it directly
      const imageUrl = res.url || "";
      setFormData((prev) => ({
        ...prev,
        image: imageUrl,
      }));
      alert("Image uploaded successfully!");
    } catch (err) {
      alert("Failed to upload image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const parseAttributes = (str) => {
    if (!str.trim()) return undefined;
    const result = {};
    const pairs = str.split(";");
    for (const pair of pairs) {
      const parts = pair.split(":");
      if (parts.length === 2) {
        const key = parts[0].trim();
        const vals = parts[1].split(",").map((v) => v.trim()).filter(Boolean);
        if (key && vals.length > 0) {
          result[key] = vals;
        }
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.image) {
      alert("Title, Price, and Image URL are required.");
      return;
    }

    const payload = {
      title: formData.title,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      short_description: formData.short_description || undefined,
      category: formData.category,
      price: parseFloat(formData.price),
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
      discount: formData.discount || undefined,
      image: formData.image,
      inStock: formData.inStock,
      sku: formData.sku || undefined,
      stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
      low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 5,
      product_type: formData.product_type,
      gallery: formData.gallery ? formData.gallery.split(",").map((url) => url.trim()).filter(Boolean) : [],
      attributes: parseAttributes(formData.attributes),
      has_variants: formData.has_variants,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      length: formData.length ? parseFloat(formData.length) : undefined,
      width: formData.width ? parseFloat(formData.width) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      meta_title: formData.meta_title || undefined,
      meta_description: formData.meta_description || undefined,
      meta_keywords: formData.meta_keywords || undefined,
      status: formData.status,
      is_featured: formData.is_featured,
      is_trending: formData.is_trending,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      isCorporateGift: editingProduct ? editingProduct.isCorporateGift : (currentTab === "gift"),
    };

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload);
      } else {
        await onAddProduct(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert("Error saving product: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await onDeleteProduct(id);
      } catch (err) {
        alert("Error deleting product: " + err.message);
      }
    }
  };

  return (
    <section className="content-card">
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #edf2f7", paddingBottom: "12px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setCurrentTab("product")}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: currentTab === "product" ? "none" : "1px solid #cbd5e0",
            backgroundColor: currentTab === "product" ? "#2f5597" : "white",
            color: currentTab === "product" ? "white" : "#4a5568",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Product
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab("gift")}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: currentTab === "gift" ? "none" : "1px solid #cbd5e0",
            backgroundColor: currentTab === "gift" ? "#2f5597" : "white",
            color: currentTab === "gift" ? "white" : "#4a5568",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Gift
        </button>
      </div>

      <div className="section-head">
        <div>
          <h2>{currentTab === "gift" ? "Corporate Gift Inventory" : "Product Inventory"}</h2>
          <p style={{ margin: 0, color: "#718096", fontSize: "14px" }}>
            {currentTab === "gift"
              ? "Production-ready corporate gifting catalog management with custom specs"
              : "Production-ready catalog management with variants, SEO, and filters"}
          </p>
        </div>
        <Button onClick={handleOpenAddModal}>
          {currentTab === "gift" ? "Add Corporate Gift" : "Add Product"}
        </Button>
      </div>

      <div className="panel-grid">
        <StatCard
          label={currentTab === "gift" ? "Total Gifts" : "Total Products"}
          value={totalProducts}
          hint={currentTab === "gift" ? "All corporate gifts" : "All items in store"}
        />
        <StatCard
          label="In Stock"
          value={inStockProducts}
          hint={currentTab === "gift" ? "Available gifts" : "Available for purchase"}
        />
        <StatCard
          label="Out of Stock"
          value={outOfStockProducts}
          hint="Need restocking"
        />
      </div>

      <div className="table-wrap" style={{ marginTop: "24px" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "80px" }}>Image</th>
              <th>Product Name</th>
              <th>SKU / Type</th>
              <th>Category</th>
              <th>Price Detail</th>
              <th>Stock Status</th>
              <th>SEO Status</th>
              <th style={{ textAlign: "right", width: "160px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "24px", color: "#666" }}>
                  {currentTab === "gift"
                    ? "No corporate gifts found. Add a gift to get started!"
                    : "No products found. Add a product to get started!"}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <img
                      src={product.image}
                      alt={product.title}
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=100&q=80";
                      }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#1a202c" }}>{product.title}</div>
                    {product.slug && (
                      <div style={{ fontSize: "11px", color: "#a0aec0" }}>/{product.slug}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#4a5568" }}>
                      {product.sku || "NO SKU"}
                    </div>
                    <Badge tone="gray">{product.product_type || "simple"}</Badge>
                  </td>
                  <td>
                    <Badge tone="blue">{product.category}</Badge>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#2d3748" }}>₹{product.price}</div>
                    {product.originalPrice && (
                      <div style={{ fontSize: "12px" }}>
                        <span style={{ textDecoration: "line-through", color: "#a0aec0", marginRight: "4px" }}>
                          ₹{product.originalPrice}
                        </span>
                        {product.discount && <Badge tone="green">{product.discount}</Badge>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <Badge tone={product.inStock ? "green" : "red"}>
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </Badge>
                      <span style={{ fontSize: "11px", color: "#718096" }}>
                        Qty: {product.stock_quantity ?? 0}
                      </span>
                    </div>
                  </td>
                  <td>
                    {product.meta_title || product.meta_description ? (
                      <Badge tone="green">Configured</Badge>
                    ) : (
                      <Badge tone="yellow">Missing</Badge>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEditModal(product)}>
                        Edit
                      </Button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        style={{
                          background: "#fff5f5",
                          color: "#e53e3e",
                          border: "1px solid #fed7d7",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 600,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#fed7d7";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#fff5f5";
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "700px",
              height: "90vh",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #edf2f7",
                display: "flex",
                justifyContent: "between",
                alignItems: "center",
                background: "linear-gradient(135deg, #1e3a6e 0%, #2f5597 100%)",
                color: "white",
                flexShrink: 0,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                {editingProduct ? "Edit Product Details" : "Add Scalable Product"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "white",
                  fontSize: "20px",
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body with Tab Navigation */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Vertical tabs sidebar */}
              <div
                style={{
                  width: "180px",
                  borderRight: "1px solid #edf2f7",
                  backgroundColor: "#f7fafc",
                  padding: "16px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {[
                  { id: "basic", label: "Basic Info" },
                  { id: "inventory", label: "Inventory & Type" },
                  { id: "shipping", label: "Shipping Specs" },
                  { id: "seo", label: "SEO & Tags" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: "12px 20px",
                      border: 0,
                      textAlign: "left",
                      backgroundColor: activeTab === tab.id ? "#edf2f7" : "transparent",
                      color: activeTab === tab.id ? "#2f5597" : "#4a5568",
                      fontWeight: activeTab === tab.id ? 700 : 500,
                      cursor: "pointer",
                      fontSize: "14px",
                      borderLeft: activeTab === tab.id ? "4px solid #2f5597" : "4px solid transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Form Content Area */}
              <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                  
                  {/* BASIC INFO TAB */}
                  {activeTab === "basic" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Product Name *
                        </label>
                        <Input
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="e.g. Traditional Hand-Painted Diya Set"
                          required
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Category
                          </label>
                          <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e0",
                              fontSize: "14px",
                              outline: "none",
                              backgroundColor: "white",
                            }}
                          >
                            <option value="New Arrival">New Arrival</option>
                            <option value="Crafts">Crafts</option>
                            <option value="Home Decor">Home Decor</option>
                            <option value="Apparel">Apparel</option>
                            <option value="Special Needs Tools">Special Needs Tools</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Selling Price (₹) *
                          </label>
                          <Input
                            name="price"
                            type="number"
                            value={formData.price}
                            onChange={handleInputChange}
                            placeholder="e.g. 299"
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            MRP / Original Price (₹)
                          </label>
                          <Input
                            name="originalPrice"
                            type="number"
                            value={formData.originalPrice}
                            onChange={handleInputChange}
                            placeholder="e.g. 499"
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Discount Text (e.g. 40% OFF)
                          </label>
                          <Input
                            name="discount"
                            value={formData.discount}
                            onChange={handleInputChange}
                            placeholder="e.g. 40% OFF"
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Short Description
                        </label>
                        <Input
                          name="short_description"
                          value={formData.short_description}
                          onChange={handleInputChange}
                          placeholder="Brief 1-2 sentence description of the item"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Full Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Detailed product highlights, specifications, and back-story..."
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e0",
                            fontSize: "14px",
                            minHeight: "100px",
                            outline: "none",
                            resize: "vertical",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Product Thumbnail Image URL *
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <Input
                              name="image"
                              value={formData.image}
                              onChange={handleInputChange}
                              placeholder="Image URL or upload from local laptop"
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={triggerFileUpload}
                            disabled={isUploading}
                            style={{
                              padding: "10px 16px",
                              backgroundColor: "#2f5597",
                              color: "white",
                              border: 0,
                              borderRadius: "8px",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "120px",
                            }}
                          >
                            {isUploading ? "Uploading..." : "Upload Image"}
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: "none" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INVENTORY & TYPE TAB */}
                  {activeTab === "inventory" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            SKU (Stock Keeping Unit)
                          </label>
                          <Input
                            name="sku"
                            value={formData.sku}
                            onChange={handleInputChange}
                            placeholder="e.g. UDAI-DIY-001"
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Product Type
                          </label>
                          <select
                            name="product_type"
                            value={formData.product_type}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e0",
                              fontSize: "14px",
                              outline: "none",
                              backgroundColor: "white",
                            }}
                          >
                            <option value="simple">Simple Product</option>
                            <option value="variable">Variable Product (Colors/Sizes)</option>
                            <option value="digital">Digital Product</option>
                            <option value="service">Service</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Initial Stock Quantity
                          </label>
                          <Input
                            name="stock_quantity"
                            type="number"
                            value={formData.stock_quantity}
                            onChange={handleInputChange}
                            placeholder="e.g. 50"
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Low Stock Alert Threshold
                          </label>
                          <Input
                            name="low_stock_threshold"
                            type="number"
                            value={formData.low_stock_threshold}
                            onChange={handleInputChange}
                            placeholder="e.g. 5"
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Catalog Status
                          </label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e0",
                              fontSize: "14px",
                              outline: "none",
                              backgroundColor: "white",
                            }}
                          >
                            <option value="active">Active (Visible)</option>
                            <option value="draft">Draft</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Custom URL Slug (leave empty to auto-generate)
                          </label>
                          <Input
                            name="slug"
                            value={formData.slug}
                            onChange={handleInputChange}
                            placeholder="e.g. handpainted-diya-set"
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="checkbox"
                            id="inStock"
                            name="inStock"
                            checked={formData.inStock}
                            onChange={handleInputChange}
                            style={{ width: "16px", height: "16px" }}
                          />
                          <label htmlFor="inStock" style={{ fontSize: "14px", fontWeight: 600, color: "#4a5568", cursor: "pointer" }}>
                            Product is available in inventory (In Stock)
                          </label>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="checkbox"
                            id="is_featured"
                            name="is_featured"
                            checked={formData.is_featured}
                            onChange={handleInputChange}
                            style={{ width: "16px", height: "16px" }}
                          />
                          <label htmlFor="is_featured" style={{ fontSize: "14px", fontWeight: 600, color: "#4a5568", cursor: "pointer" }}>
                            Feature this product on homepage / arrivals list
                          </label>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="checkbox"
                            id="is_trending"
                            name="is_trending"
                            checked={formData.is_trending}
                            onChange={handleInputChange}
                            style={{ width: "16px", height: "16px" }}
                          />
                          <label htmlFor="is_trending" style={{ fontSize: "14px", fontWeight: 600, color: "#4a5568", cursor: "pointer" }}>
                            Mark as trending / popular product
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SHIPPING TAB */}
                  {activeTab === "shipping" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <p style={{ margin: "0 0 8px 0", color: "#718096", fontSize: "14px" }}>
                        Specify the physical dimensions for automated shipping calculation.
                      </p>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Weight (kg)
                          </label>
                          <Input
                            name="weight"
                            type="number"
                            step="0.01"
                            value={formData.weight}
                            onChange={handleInputChange}
                            placeholder="e.g. 0.45"
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Length (cm)
                          </label>
                          <Input
                            name="length"
                            type="number"
                            value={formData.length}
                            onChange={handleInputChange}
                            placeholder="e.g. 15"
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Width (cm)
                          </label>
                          <Input
                            name="width"
                            type="number"
                            value={formData.width}
                            onChange={handleInputChange}
                            placeholder="e.g. 10"
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                            Height (cm)
                          </label>
                          <Input
                            name="height"
                            type="number"
                            value={formData.height}
                            onChange={handleInputChange}
                            placeholder="e.g. 8"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEO & TAGS TAB */}
                  {activeTab === "seo" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Search Engine optimization (SEO) Meta Title
                        </label>
                        <Input
                          name="meta_title"
                          value={formData.meta_title}
                          onChange={handleInputChange}
                          placeholder="e.g. Buy Hand-Painted Clay Diyas Online - UDAI NGO Store"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          SEO Meta Description
                        </label>
                        <textarea
                          name="meta_description"
                          value={formData.meta_description}
                          onChange={handleInputChange}
                          placeholder="A summary to showcase on Google Search Results pages..."
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e0",
                            fontSize: "14px",
                            minHeight: "80px",
                            outline: "none",
                            resize: "vertical",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          SEO Keywords (Comma-separated)
                        </label>
                        <Input
                          name="meta_keywords"
                          value={formData.meta_keywords}
                          onChange={handleInputChange}
                          placeholder="diya, clay, organic decor, diwali crafts, udai"
                        />
                      </div>

                      <div style={{ borderTop: "1px solid #edf2f7", paddingTop: "16px" }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Product Tags (Comma-separated)
                        </label>
                        <Input
                          name="tags"
                          value={formData.tags}
                          onChange={handleInputChange}
                          placeholder="handmade, diwali, eco-friendly, clay-art"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Product Attributes / Details (Format: key: val1, val2; key2: val3)
                        </label>
                        <Input
                          name="attributes"
                          value={formData.attributes}
                          onChange={handleInputChange}
                          placeholder="e.g. Material: Clay, Terracotta; Color: Red, Blue, Yellow"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
                          Product Gallery Images (Comma-separated URLs)
                        </label>
                        <Input
                          name="gallery"
                          value={formData.gallery}
                          onChange={handleInputChange}
                          placeholder="e.g. https://domain.com/img1.jpg, https://domain.com/img2.jpg"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    padding: "16px 24px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid #edf2f7",
                    backgroundColor: "#f7fafc",
                    flexShrink: 0,
                  }}
                >
                  <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProduct ? "Save Changes" : "Create Product"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
