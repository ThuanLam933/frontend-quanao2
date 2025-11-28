// src/pages/HomePage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  Grid,
  Button,
  Paper,
  Stack,
  CircularProgress,
  Pagination,
  Snackbar,
  Alert,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate, createSearchParams } from "react-router-dom";

/**
 * HomePage (user-facing) — upload-related UI removed.
 * Replace API_BASE if your backend uses a different origin/port.
 */

const API_BASE = "http://127.0.0.1:8000";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#F7FAFC", paper: "#fff" },
    primary: { main: "#162447", contrastText: "#fff" },
    secondary: { main: "#42A5F5" },
    text: { primary: "#0D1B2A", secondary: "#5C6F91" },
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: "Poppins, Roboto, sans-serif" },
});

export default function HomePage() {
  const navigate = useNavigate();

  // UI / pagination state
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  // ---------- Fetch categories ----------
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories/`);
      if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
      const data = await res.json();
      // Expecting an array; if backend wraps, adapt as needed
      setCategories(Array.isArray(data) ? data : data || []);
    } catch (err) {
      console.warn("Categories load:", err);
      setCategories([]); // fallback empty
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // ---------- Fetch products ----------
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/products/`);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);

      const data = await res.json();

      const normalized = (Array.isArray(data) ? data : data || []).map((p) => {
        const firstDetail = p.details?.[0] ?? {};
        const price =
          typeof firstDetail.price === "string" || typeof firstDetail.price === "number"
            ? parseFloat(firstDetail.price)
            : null;

        const colorName = firstDetail.color?.name ?? null;
        const sizeName = firstDetail.size?.name ?? null;

        return {
          id: p.id,
          name: p.name ?? p.title ?? "Không tên",
          slug: p.slug ?? null,
          description: p.description ?? "",
          price,
          color: colorName,
          size: sizeName,
          rating: typeof p.rating === "number" ? p.rating : 0,
          categories_id: p.categories_id ?? p.category_id ?? null,
          image_url:
            p.image_url && typeof p.image_url === "string"
              ? p.image_url.startsWith("http")
                ? p.image_url
                : `${API_BASE}/storage/${p.image_url}`
              : null,
        };
      });

      console.log("✅ Products normalized:", normalized);
      setProducts(normalized);
    } catch (err) {
      console.error("❌ Fetch products error:", err);
      setError("Không thể tải sản phẩm. Vui lòng thử lại.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // category tiles (no localStorage overrides, just use category data or static fallback)
  const categoryTiles = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c, i) => {
        const slugOrName = c.slug ?? c.name ?? `cat-${i}`;
        return {
          id: c.id ?? i,
          title: (c.name || "Danh mục").toUpperCase(),
          slug: slugOrName,
          img: c.image_url
            ? (c.image_url.startsWith("http") ? c.image_url : `${API_BASE}/storage/${c.image_url}`)
            : `/images/cat-${slugOrName.toString().toLowerCase().replace(/\s+/g, "-")}.jpg`,
          to: `/collections?${createSearchParams({ category: c.slug ?? c.name })}`,
        };
      });
    }
    // fallback static tiles (ensure these images exist in public/images)
    return [
      { id: "c1", title: "CLOTHERS", img: "/images/quanxanh3.jpg", to: "/collections?category=clother" },
      { id: "c2", title: "T-SHIRT", img: "/images/quanxanh2.jpg", to: "/collections?category=tshirt" },
      { id: "c3", title: "JEANS", img: "/images/quanxanh2.jpg", to: "/collections?category=jeans" },
      { id: "c4", title: "SHORTS", img: "/images/quanxanh3.jpg", to: "/collections?category=shorts" },
    ];
  }, [categories]);

  // client-side filtering (search) + pagination
  const filtered = useMemo(() => {
    let list = products.slice();
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.slug && p.slug.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // util
  const safePrice = (price) => {
    if (price == null || typeof price !== "number" || price <= 0) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  const handleAddToCart = (p) => {
    try {
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];

      const unitPrice =
        typeof p.price === "number"
          ? p.price
          : p.price && !isNaN(parseFloat(p.price))
          ? parseFloat(p.price)
          : null;

      const idx = cart.findIndex((it) => it.id === p.id);
      if (idx >= 0) {
        cart[idx].quantity = (cart[idx].quantity || 1) + 1;
        if (unitPrice != null) cart[idx].unit_price = unitPrice;
        cart[idx].line_total = cart[idx].unit_price != null ? cart[idx].unit_price * cart[idx].quantity : null;
      } else {
        cart.push({
          id: p.id,
          name: p.name,
          unit_price: unitPrice,
          line_total: unitPrice != null ? unitPrice * 1 : null,
          price_display: unitPrice != null ? unitPrice.toLocaleString("vi-VN") + "₫" : "Liên hệ",
          image_url: p.image_url ?? null,
          quantity: 1,
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));

      const totalQty = cart.reduce((s, it) => s + (it.quantity || 0), 0);
      setCartCount(totalQty);

      setSnack({ severity: "success", message: `${p.name} đã thêm vào giỏ.` });
    } catch (e) {
      console.warn("Cannot update cart in localStorage", e);
      setSnack({ severity: "error", message: "Không thể lưu giỏ hàng." });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
        {/* Category tiles */}
        <Container maxWidth="lg" sx={{ mt: 6 }}>
          <Grid container spacing={3}>
            {categoryTiles.map((c) => (
              <Grid item xs={12} sm={6} md={3} key={c.id}>
                <Paper
                  elevation={0}
                  sx={{
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    height: { xs: 160, md: 220 },
                    borderRadius: 1,
                    "&:hover .overlay": { opacity: 0.95 },
                  }}
                  onClick={() => navigate(c.to)}
                >
                  <Box
                    component="img"
                    src={c.img}
                    alt={c.title}
                    onError={(e) => (e.currentTarget.src = "/images/quanxanh2.jpg")}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: "brightness(0.95)",
                      transition: "transform 0.4s ease",
                      "&:hover": { transform: "scale(1.03)" },
                    }}
                    onClick={() => navigate(c.to)}
                  />
                  <Box
                    className="overlay"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.28)",
                      color: "#fff",
                      opacity: 0.85,
                      transition: "opacity 0.25s ease",
                    }}
                    onClick={() => navigate(c.to)}
                  >
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 26 }, letterSpacing: 1.2 }}>
                      {c.title}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Products grid */}
        <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
            New Arrivals
          </Typography>

          {loadingProducts ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" textAlign="center" sx={{ py: 6 }}>
              {error}
            </Typography>
          ) : (
            <>
              <Grid container spacing={3}>
                {currentPageProducts.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography textAlign="center">Không tìm thấy sản phẩm.</Typography>
                  </Grid>
                ) : (
                  currentPageProducts.map((p) => (
                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        <CardMedia component="img" height="280" image={p.image_url || "/images/quanxanh2.jpg"} alt={p.name} sx={{ objectFit: "cover" }} />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {p.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#5C6F91", mt: 1 }}>
                            {(p.rating ?? 0).toFixed(1)} ⭐
                          </Typography>
                          <Typography variant="h6" sx={{ mt: 1, color: "#162447", fontWeight: 800 }}>
                            {safePrice(p.price)}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                          <Button size="small" variant="outlined" onClick={() => navigate(`/product/${p.id}`)}>
                            Xem
                          </Button>
                          <Button size="small" variant="contained" onClick={() => handleAddToCart(p)}>
                            Thêm giỏ
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination count={pageCount} page={page} onChange={(_, v) => setPage(v)} color="primary" />
              </Box>
            </>
          )}
        </Container>

        {/* Snackbar */}
        <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
