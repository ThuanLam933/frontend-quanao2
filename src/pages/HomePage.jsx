// src/pages/HomePage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Typography,
  Box,
  Container,
  Grid,
  Button,
  Paper,
  CircularProgress,
  Pagination,
  Snackbar,
  Alert,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * HomePage (user-facing)
 */

const API_BASE = "http://127.0.0.1:8000";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#111" },
    text: {
      primary: "#111",
      secondary: "#555",
    },
    background: {
      default: "#fff",
      paper: "#fff",
    },
  },
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
    subtitle1: { fontWeight: 500 },
  },
  shape: { borderRadius: 4 }, // rất ít bo góc
});

export default function HomePage() {
  const navigate = useNavigate();

  // URL search params
  const [searchParams] = useSearchParams();

  // query lấy từ URL ?q=
  const query = useMemo(
    () => (searchParams.get("q") || "").trim(),
    [searchParams]
  );

  // pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);

  // category đang chọn (id), null = tất cả
  const [selectedCategory, setSelectedCategory] = useState(null);

  // mỗi lần query đổi thì reset về trang 1
  useEffect(() => {
    setPage(1);
  }, [query]);

  // ---------- Fetch categories ----------
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories/`);
      if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
      const data = await res.json();
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
          typeof firstDetail.price === "string" ||
          typeof firstDetail.price === "number"
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
          // quan trọng: categories_id dùng để filter
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

  // category tiles
  const categoryTiles = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c, i) => {
        return {
          id: c.id ?? i,
          title: (c.name || "Danh mục").toUpperCase(),
          categoryId: c.id ?? null, // dùng id để filter
          img: c.image_url
            ? c.image_url.startsWith("http")
              ? c.image_url
              : `${API_BASE}/storage/${c.image_url}`
            : `/images/cat-${(c.slug ?? c.name ?? `cat-${i}`)
                .toString()
                .toLowerCase()
                .replace(/\s+/g, "-")}.jpg`,
        };
      });
    }
    // fallback static tiles (không map được vào categories_id, chỉ để trang cho đẹp)
    return [
      {
        id: "c1",
        title: "CLOTHERS",
        img: "/images/quanxanh3.jpg",
        categoryId: null,
      },
      {
        id: "c2",
        title: "T-SHIRT",
        img: "/images/quanxanh2.jpg",
        categoryId: null,
      },
      {
        id: "c3",
        title: "JEANS",
        img: "/images/quanxanh2.jpg",
        categoryId: null,
      },
      {
        id: "c4",
        title: "SHORTS",
        img: "/images/quanxanh3.jpg",
        categoryId: null,
      },
    ];
  }, [categories]);

  // client-side filtering (category + search) + pagination
  const filtered = useMemo(() => {
    let list = products.slice();

    // FILTER THEO CATEGORY (bằng categories_id)
    if (selectedCategory != null) {
      list = list.filter(
        (p) => Number(p.categories_id) === Number(selectedCategory)
      );
    }

    // FILTER THEO SEARCH
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, query, selectedCategory]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // util
  const safePrice = (price) => {
    if (price == null || typeof price !== "number" || price <= 0)
      return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  const handleAddToCart = async (p) => {
  try {
    // 1. Lấy danh sách biến thể của product
    const res = await fetch(
      `${API_BASE}/api/product-details?product_id=${p.id}`
    );
    if (!res.ok) {
      throw new Error(`Fetch product details failed: ${res.status}`);
    }

    const data = await res.json();
    const variantsRaw = Array.isArray(data) ? data : [];

    // 2. Chuẩn hóa + lọc ra những variant còn hàng
    const variants = variantsRaw
      .map((d) => ({
        id: d.id,
        product_id: d.product_id,
        price:
          typeof d.price === "number"
            ? d.price
            : d.price
            ? Number(d.price)
            : 0,
        quantity: d.quantity ?? 0,
        size: d.size?.name ?? null,
        color: d.color?.name ?? null,
        image_url:
          (Array.isArray(d.images) && d.images[0]?.full_url) ||
          d.product?.image_url ||
          p.image_url ||
          null,
      }))
      .filter((v) => v.quantity > 0); // chỉ lấy variant còn hàng

    if (!variants.length) {
      setSnack({
        severity: "warning",
        message: "Sản phẩm này hiện tạm hết hàng.",
      });
      return;
    }

    // 3. Chọn biến thể đầu tiên còn hàng
    const v = variants[0];

    // 4. Đọc giỏ hiện tại từ localStorage
    const raw = localStorage.getItem("cart") || "[]";
    const cart = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];

    // 5. Nếu đã có dòng cùng product_detail_id thì cộng số lượng
    const idx = cart.findIndex(
      (it) =>
        it.product_detail_id === v.id ||
        (it.product_id === v.product_id &&
          it.size === v.size &&
          it.color === v.color)
    );

    if (idx >= 0) {
      cart[idx].quantity = (cart[idx].quantity || 1) + 1;
      cart[idx].unit_price = v.price;
    } else {
      cart.push({
        // id là id của dòng cart, dùng random / timestamp để không bị trùng
        id: Date.now(),
        product_id: v.product_id,
        product_detail_id: v.id,
        name: p.name,          // chỉ tên sản phẩm
        size: v.size,          // size tách riêng
        color: v.color,        // màu tách riêng
        unit_price: v.price,
        image_url: v.image_url,
        quantity: 1,
      });
    }

    // 6. Lưu lại localStorage
    localStorage.setItem("cart", JSON.stringify(cart));

    setSnack({
      severity: "success",
      message: `${p.name} đã được thêm vào giỏ.`,
    });
  } catch (e) {
    console.warn("Cannot update cart in localStorage", e);
    setSnack({
      severity: "error",
      message: "Không thể thêm sản phẩm vào giỏ.",
    });
  }
};


  // click vào category tile
  const handleCategoryClick = (tile) => {
    // nếu categoryId null thì reset filter
    if (!tile.categoryId) {
      setSelectedCategory(null);
      setPage(1);
      return;
    }

    setPage(1);
    setSelectedCategory((prev) =>
      Number(prev) === Number(tile.categoryId) ? null : tile.categoryId
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
        {/* Category tiles */}
        <Container maxWidth="lg" sx={{ mt: 6 }}>
          <Grid container spacing={3}>
            {categoryTiles.map((c) => {
              const isActive =
                selectedCategory != null &&
                c.categoryId != null &&
                Number(selectedCategory) === Number(c.categoryId);

              return (
                <Grid item xs={12} sm={6} md={3} key={c.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                      height: { xs: 160, md: 220 },
                      borderRadius: 1,
                      border: isActive ? "2px solid #111" : "1px solid transparent",
                      opacity:
                        selectedCategory != null && !isActive ? 0.5 : 1,
                      transition: "opacity 0.25s ease, border 0.25s ease",
                      "&:hover .overlay": { opacity: 0.95 },
                    }}
                    onClick={() => handleCategoryClick(c)}
                  >
                    <Box
                      component="img"
                      src={c.img}
                      alt={c.title}
                      onError={(e) =>
                        (e.currentTarget.src = "/images/quanxanh2.jpg")
                      }
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        filter: "brightness(0.95)",
                        transition: "transform 0.4s ease",
                        "&:hover": { transform: "scale(1.03)" },
                      }}
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
                    >
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: 18, md: 26 },
                          letterSpacing: 1.2,
                        }}
                      >
                        {c.title}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Container>

        {/* Products grid */}
        <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
          {/* Chỉ còn tiêu đề, không còn ô search trên HomePage */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              New Arrivals
            </Typography>
          </Box>

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
                    <Typography textAlign="center">
                      Không tìm thấy sản phẩm.
                    </Typography>
                  </Grid>
                ) : (
                  currentPageProducts.map((p) => (
                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                      <Card
                        elevation={0}
                        sx={{
                          border: "1px solid #eee",
                          boxShadow: "none",
                          transition: "0.25s ease",
                          "&:hover": {
                            transform: "translateY(-3px)",
                          },
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={p.image_url || "/images/placeholder.jpg"}
                          sx={{
                            height: 320,
                            objectFit: "cover",
                            transition: "transform 0.35s ease",
                            "&:hover": {
                              transform: "scale(1.02)",
                            },
                          }}
                        />

                        <CardContent>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {p.name}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{ color: "#777", mt: 1 }}
                          >
                            {(p.rating ?? 0).toFixed(1)} ★
                          </Typography>

                          <Typography
                            variant="h6"
                            sx={{
                              mt: 1,
                              fontWeight: 700,
                              letterSpacing: 0.5,
                            }}
                          >
                            {safePrice(p.price)}
                          </Typography>
                        </CardContent>

                        <CardActions sx={{ px: 2, pb: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{
                              borderRadius: 0,
                              borderColor: "#111",
                              textTransform: "none",
                            }}
                            onClick={() => navigate(`/product/${p.id}`)}
                          >
                            Xem
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            sx={{
                              bgcolor: "#111",
                              color: "#fff",
                              borderRadius: 0,
                              textTransform: "none",
                              "&:hover": { bgcolor: "#000" },
                            }}
                            onClick={() => handleAddToCart(p)}
                          >
                            Thêm giỏ
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, v) => setPage(v)}
                  color="primary"
                />
              </Box>
            </>
          )}
        </Container>

        {/* Snackbar */}
        <Snackbar
          open={!!snack}
          autoHideDuration={2500}
          onClose={() => setSnack(null)}
        >
          {snack ? (
            <Alert onClose={() => setSnack(null)} severity={snack.severity}>
              {snack.message}
            </Alert>
          ) : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
