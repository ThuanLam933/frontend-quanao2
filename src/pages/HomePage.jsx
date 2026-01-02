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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * HomePage (user-facing) — style đồng bộ với CartPage / Uniqlo
 */

const API_BASE = "http://127.0.0.1:8000";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    primary: { main: "#111111", contrastText: "#FFFFFF" },
    secondary: { main: "#DD002A" }, // đỏ giống CartPage
    text: { primary: "#111111", secondary: "#666666" },
  },
  shape: { borderRadius: 0 }, // ít bo góc như Uniqlo + CartPage
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
    h5: { fontWeight: 700 },
    subtitle1: { fontWeight: 500 },
    body2: { fontSize: 13 },
  },
});

export default function HomePage() {
  const navigate = useNavigate();

  // URL search params
  const [searchParams] = useSearchParams();
  const query = useMemo(
    () => (searchParams.get("q") || "").trim(),
    [searchParams]
  );

  // pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // data
  const [products, setProducts] = useState([]);
  const [minVariantMap, setMinVariantMap] = useState({}); 
// { [productId]: { variantId, final_price, original_price, has_discount, discount_percent } }

  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);

  // category đang chọn (id), null = tất cả
  const [selectedCategory, setSelectedCategory] = useState(null);
  const[sortBy, setSortBy]= useState("default");
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
  const fetchMinVariantsInStock = useCallback(async (productList) => {
  try {
    const results = await Promise.all(
      productList.map(async (p) => {
        // ✅ ngưng bán thì khỏi gọi API variants
        if (Number(p.status) !== 1) return [p.id, null];

        const res = await fetch(`${API_BASE}/api/product-details?product_id=${p.id}`);
        if (!res.ok) return [p.id, null];

        const data = await res.json();
        const variantsRaw = Array.isArray(data) ? data : [];

        const inStock = variantsRaw
          .filter((d) => (d.quantity ?? 0) > 0)
          .map((d) => {
            const original = Number(d.price) || 0;
            const final = d.has_discount && d.final_price ? Number(d.final_price) : original;

            return {
              variantId: d.id,
              original_price: original,
              final_price: final,
              has_discount: !!d.has_discount,
              discount_percent:
                original > 0 ? Math.round(((original - final) / original) * 100) : 0,
            };
          })
          .filter((v) => v.final_price > 0);

        if (!inStock.length) return [p.id, null];

        const cheapest = inStock.reduce((min, v) =>
          v.final_price < min.final_price ? v : min
        );

        return [p.id, cheapest];
      })
    );

    const map = {};
    results.forEach(([pid, cheapest]) => {
      if (cheapest) map[pid] = cheapest;
    });

    setMinVariantMap(map);

    // ✅ update products chuẩn
    setProducts((prev) =>
      prev.map((p) => {
        if (Number(p.status) !== 1) {
          return { ...p, in_stock: false }; // ✅ ngưng bán coi như không mua
        }
        const cheapest = map[p.id];
        if (!cheapest) return { ...p, in_stock: false };
        return {
          ...p,
          in_stock: true,
          original_price: cheapest.original_price,
          final_price: cheapest.final_price,
          has_discount: cheapest.has_discount,
          discount_percent: cheapest.discount_percent,
        };
      })
    );
  } catch (e) {
    console.warn("fetchMinVariantsInStock error:", e);
  }
}, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/products/`);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);

      const data = await res.json();

      const normalized = (Array.isArray(data) ? data : data || []).map((p) => {
        const details = Array.isArray(p.details) ? p.details : [];

        const variants = details
          .map((d) => {
            const original = Number(d.price) || 0;
            const final = d.has_discount && d.final_price ? Number(d.final_price) : original;

            return {
              original_price: original,
              final_price: final,
              has_discount: !!d.has_discount,
              discount_percent:
                d.has_discount && original > 0
                  ? Math.round(((original - final) / original) * 100)
                  : 0,
            };
          })
          .filter((v) => v.final_price > 0);

        // lấy variant rẻ nhất
        const cheapest =
          variants.length > 0
            ? variants.reduce((min, v) => (v.final_price < min.final_price ? v : min))
            : null;

        return {
          id: p.id,
          name: p.name ?? p.title ?? "Không tên",
          slug: p.slug ?? null,
          description: p.description ?? "",
          original_price: cheapest?.original_price ?? null,
          final_price: cheapest?.final_price ?? null,
          has_discount: cheapest?.has_discount ?? false,
          discount_percent: cheapest?.discount_percent ?? 0,
          status: Number(p.status ?? 1),
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
      fetchMinVariantsInStock(normalized);

    } catch (err) {
      console.error("❌ Fetch products error:", err);
      setError("Không thể tải sản phẩm. Vui lòng thử lại.");
    } finally {
      setLoadingProducts(false);
    }
  }, [fetchMinVariantsInStock]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // ---------- Category tiles ----------
  const categoryTiles = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c, i) => ({
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
      }));
    }
    // fallback static tiles
    return [
      {
        id: "c1",
        title: "CLOTHERS",
        img: "/images/quanxanh3.jpg",
        categoryId: null,
      },
      
    ];
  }, [categories]);

  // ---------- Filter + pagination ----------
  const filtered = useMemo(() => {
  let list = products.slice();

  // filter theo category
  if (selectedCategory != null) {
    list = list.filter(
      (p) => Number(p.categories_id) === Number(selectedCategory)
    );
  }

  // filter theo search
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q)
    );
  }

  // ✅ sort theo giá
  const getPrice = (p) => Number(p.final_price ?? p.original_price ?? 0);

  if (sortBy === "price_asc") {
    list.sort((a, b) => getPrice(a) - getPrice(b));
  } else if (sortBy === "price_desc") {
    list.sort((a, b) => getPrice(b) - getPrice(a));
  }

  return list;
}, [products, query, selectedCategory, sortBy]);


  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // ---------- Utils ----------
  const safePrice = (price) => {
    if (price == null || typeof price !== "number" || price <= 0)
      return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };
  const formatPrice = (price) => {
    if (!price || price <= 0) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };


  // thêm giỏ: luôn chọn biến thể còn hàng đầu tiên
  const handleAddToCart = async (p) => {
    try {
      // 1. Lấy danh sách biến thể của product
      const res = await fetch(
        `${API_BASE}/api/product-details?product_id=${p.id}`
      );
      if (!res.ok) {
        throw new Error(`Fetch product details failed: ${res.status}`);
      }
      if (Number(p.status) !== 1) {
  setSnack({ severity: "warning", message: "Sản phẩm đã ngưng bán." });
  return;
}


      const data = await res.json();
      const variantsRaw = Array.isArray(data) ? data : [];

      // 2. Chuẩn hóa + lọc ra những variant còn hàng
      const variants = variantsRaw
        .map((d) => {
          const original = Number(d.price) || 0;
          const final = d.has_discount && d.final_price ? Number(d.final_price) : original;

          return {
            id: d.id,
            product_id: d.product_id,
            original_price: original,
            final_price: final,
            has_discount: !!d.has_discount,
            quantity: d.quantity ?? 0,
            size: d.size?.name ?? null,
            color: d.color?.name ?? null,
            image_url:
              (Array.isArray(d.images) && d.images[0]?.full_url) ||
              d.product?.image_url ||
              p.image_url ||
              null,
          };
        })
        .filter((v) => v.quantity > 0)
        .sort((a, b) => a.final_price - b.final_price);


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
      let cart;
      try {
        const parsed = JSON.parse(raw);
        cart = Array.isArray(parsed) ? parsed : [];
      } catch {
        cart = [];
      }

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
  id: Date.now(),
  product_id: v.product_id,
  product_detail_id: v.id,
  name: p.name,
  size: v.size,
  color: v.color,

  original_price: v.original_price,
  final_price: v.final_price,
  has_discount: v.has_discount,
  unit_price: v.final_price,

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
                      height: { xs: 170, md: 230 },
                      borderRadius: 0,
                      border: isActive
                        ? "2px solid #111"
                        : "1px solid #e0e0e0",
                      opacity:
                        selectedCategory != null && !isActive ? 0.6 : 1,
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
                          fontSize: { xs: 18, md: 22 },
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
          <Box
            sx={{
              mb: 3,
              borderBottom: "2px solid #111",
              pb: 1,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Sản Phẩm Nổi Bật
            </Typography>
          </Box>
          {/* ✅ Filter bar: Danh mục + Sắp xếp */}
<Box
  sx={{
    display: "flex",
    flexWrap: "wrap",
    gap: 2,
    alignItems: "center",
    mb: 3,
  }}
>
  {/* Danh mục */}
  <FormControl size="small" sx={{ minWidth: 220 }}>
    <InputLabel>Danh mục</InputLabel>
    <Select
      label="Danh mục"
      value={selectedCategory ?? "all"}
      onChange={(e) => {
        const val = e.target.value;
        setSelectedCategory(val === "all" ? null : val);
        setPage(1);
      }}
    >
      <MenuItem value="all">Tất cả</MenuItem>
      {(categories || []).map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  {/* Sort theo giá */}
  <FormControl size="small" sx={{ minWidth: 220 }}>
    <InputLabel>Sắp xếp</InputLabel>
    <Select
      label="Sắp xếp"
      value={sortBy}
      onChange={(e) => {
        setSortBy(e.target.value);
        setPage(1);
      }}
    >
      <MenuItem value="default">Mặc định</MenuItem>
      <MenuItem value="price_asc">Giá: Thấp → Cao</MenuItem>
      <MenuItem value="price_desc">Giá: Cao → Thấp</MenuItem>
    </Select>
  </FormControl>

  {/* Reset nhanh */}
  <Button
    variant="outlined"
    sx={{ borderRadius: 0, borderColor: "#111", textTransform: "none" }}
    onClick={() => {
      setSelectedCategory(null);
      setSortBy("default");
      setPage(1);
    }}
  >
    Xóa lọc
  </Button>
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
      <Typography textAlign="center">Không tìm thấy sản phẩm.</Typography>
    </Grid>
  ) : (
    currentPageProducts.map((p) => {
      const isStopped = Number(p.status) !== 1;

      return (
        <Grid item xs={12} sm={6} md={4} key={p.id}>
          <Card
            elevation={0}
            sx={{
              border: "1px solid #e0e0e0",
              boxShadow: "none",
              borderRadius: 0,
              transition: "0.25s ease",
              "&:hover": { transform: "translateY(-3px)" },
            }}
          >
            <CardMedia
              component="img"
              image={p.image_url || "/images/placeholder.jpg"}
              sx={{
                height: 320,
                objectFit: "cover",
                transition: "transform 0.35s ease",
                "&:hover": { transform: "scale(1.02)" },
              }}
            />

            <CardContent sx={{ pt: 1.5, pb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    fontSize: 14,
                  }}
                >
                  {p.name}
                </Typography>

                {p.has_discount && p.discount_percent > 0 && !isStopped && (
                  <Box
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                      backgroundColor: "secondary.main",
                      px: 0.8,
                      py: 0.2,
                      borderRadius: "2px",
                      lineHeight: 1,
                    }}
                  >
                    -{p.discount_percent}%
                  </Box>
                )}
              </Box>

              <Typography variant="body2" sx={{ color: "#777", mt: 0.5 }}>
                {(p.rating ?? 0).toFixed(1)} ★
              </Typography>

              <Box sx={{ mt: 1 }}>
                {isStopped ? (
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#999" }}>
                    Hết bán
                  </Typography>
                ) : p.in_stock === false ? (
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#999" }}>
                    Hết hàng
                  </Typography>
                ) : p.has_discount ? (
                  <>
                    <Typography
                      sx={{
                        fontSize: 20,
                        color: "#999",
                        textDecoration: "line-through",
                      }}
                    >
                      {formatPrice(p.original_price)}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "secondary.main",
                      }}
                    >
                      {formatPrice(p.final_price)}
                    </Typography>
                  </>
                ) : (
                  <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                    {formatPrice(p.final_price ?? p.original_price)}
                  </Typography>
                )}
              </Box>
            </CardContent>

            <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: 0,
                  borderColor: "#111",
                  textTransform: "none",
                  fontSize: 13,
                  px: 2.5,
                }}
                onClick={() => navigate(`/product/${p.id}`)}
              >
                Xem
              </Button>

              <Button
                size="small"
                variant="contained"
                disabled={isStopped || p.in_stock === false}
                sx={{
                  bgcolor: "#111",
                  color: "#fff",
                  borderRadius: 0,
                  textTransform: "none",
                  fontSize: 13,
                  px: 2.5,
                  ml: 1,
                  "&:hover": { bgcolor: "#000" },
                  "&.Mui-disabled": { bgcolor: "#ccc", color: "#666" },
                }}
                onClick={() => handleAddToCart(p)}
              >
                Thêm giỏ
              </Button>
            </CardActions>
          </Card>
        </Grid>
      );
    })
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
