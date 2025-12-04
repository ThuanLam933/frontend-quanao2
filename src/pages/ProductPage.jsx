// src/pages/ProductPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Stack,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Card,
  CardMedia,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const API_BASE = "http://127.0.0.1:8000";
const CART_STORAGE_KEY = "cart";
const CART_COUNT_KEY = "guest_cart_count";

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

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [images, setImages] = useState([]);
  const [mainImage, setMainImage] = useState(null);

  const [related, setRelated] = useState([]);

  const [qty, setQty] = useState(1);
  const [snack, setSnack] = useState(null);
  const [loading, setLoading] = useState(false);

  // ----------------- HELPERS -----------------
  const getMainImage = (p) => {
    if (!p?.image_url) return null;
    return p.image_url.startsWith("http")
      ? p.image_url
      : `${API_BASE}/storage/${p.image_url}`;
  };

  // ---------------- Fetch product ----------------
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      const p = await res.json();

      setProduct(p);
      setVariants(p.details || []);

      const first = p.details?.[0];

      if (first) {
        setSelectedSize(first.size?.name || null);
        setSelectedColor(first.color?.name || null);
        setSelectedVariant(first);
      }

      setMainImage(getMainImage(p));
    } catch (err) {
      console.log("Error loading product");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ----------- COLORS filtered by SIZE -------------
  const colorsForSize = useMemo(() => {
    if (!selectedSize) return [];
    return variants.filter((v) => v.size?.name === selectedSize);
  }, [variants, selectedSize]);

  // ---------------- Fetch images of a variant ----------------
  const fetchImages = useCallback(
    async (variantId) => {
      if (!variantId) return;

      try {
        const res = await fetch(
          `${API_BASE}/api/image-products/?product_detail_id=${variantId}`
        );

        const raw = await res.json();
        const arr = Array.isArray(raw) ? raw : raw.data || [];

        const list = arr.map((img) => ({
          id: img.id,
          url:
            img.full_url ||
            img.url ||
            `${API_BASE}/storage/${img.url_image}`,
          sort_order: img.sort_order,
        }));

        const sorted = list.sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );

        setImages(sorted);
        setMainImage(sorted[0]?.url || getMainImage(product));
      } catch {
        setImages([]);
      }
    },
    [product]
  );

  // ---------------- Fetch related ----------------
  const fetchRelated = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/product-details/`);
      const arr = await res.json();

      const filtered = arr.filter(
        (v) => v.product_id == product?.id && v.id != selectedVariant?.id
      );

      setRelated(filtered.slice(0, 8));
    } catch {}
  }, [product, selectedVariant]);

  // ---------------- Effects ----------------
  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (selectedVariant) {
      fetchImages(selectedVariant.id);
    }
  }, [selectedVariant, fetchImages]);

  useEffect(() => {
    if (product) fetchRelated();
  }, [product, fetchRelated]);

  // ---------------- CART ----------------
  const addToCart = () => {
    if (!selectedVariant) {
      setSnack({
        severity: "warning",
        message: "Vui lòng chọn size và màu trước khi thêm.",
      });
      return;
    }

    const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    const q = Math.max(1, qty);

    // tìm dòng đã có cùng product_detail_id
    const existing = cart.find(
      (i) => i.product_detail_id === selectedVariant.id
    );

    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + q;
      // đồng bộ thông tin mới nhất (phòng khi giá/ảnh thay đổi)
      existing.product_id = selectedVariant.product_id;
      existing.name = product.name;
      existing.size = selectedVariant.size?.name || null;
      existing.color = selectedVariant.color?.name || null;
      existing.size_name = selectedVariant.size?.name || null;
      existing.color_name = selectedVariant.color?.name || null;
      existing.unit_price = selectedVariant.price;
      existing.image_url = mainImage;
    } else {
      cart.push({
        // id riêng cho dòng cart (không dùng id biến thể để tránh xung đột)
        id: Date.now(),
        product_detail_id: selectedVariant.id,
        product_id: selectedVariant.product_id,
        name: product.name, // chỉ tên sản phẩm
        // thông tin biến thể riêng
        size: selectedVariant.size?.name || null,
        color: selectedVariant.color?.name || null,
        size_name: selectedVariant.size?.name || null,
        color_name: selectedVariant.color?.name || null,
        unit_price: selectedVariant.price,
        quantity: q,
        image_url: mainImage,
      });
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

    // cập nhật badge giỏ hàng trên header
    const totalQty = cart.reduce(
      (s, it) => s + (Number(it.quantity) || 0),
      0
    );
    try {
      localStorage.setItem(CART_COUNT_KEY, String(totalQty));
    } catch (e) {}
    window.dispatchEvent(
      new CustomEvent("cartUpdated", {
        detail: { count: totalQty, items: cart },
      })
    );

    setSnack({ severity: "success", message: "Đã thêm vào giỏ hàng!" });
  };

  // ---------------- RENDER ----------------
  if (loading || !product) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* LEFT: IMAGE */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Box
                  component="img"
                  src={mainImage}
                  alt=""
                  sx={{
                    width: "100%",
                    maxHeight: 500,
                    objectFit: "contain",
                    borderRadius: 2,
                  }}
                />

                {/* thumbnails */}
                <Stack direction="row" spacing={1} mt={2}>
                  {images.map((img) => (
                    <Box
                      key={img.id}
                      component="img"
                      src={img.url}
                      onClick={() => setMainImage(img.url)}
                      sx={{
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        cursor: "pointer",
                        border:
                          img.url === mainImage
                            ? "2px solid #162447"
                            : "1px solid #ddd",
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* RIGHT: INFO */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {product.name}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* SIZE */}
                <Typography sx={{ fontWeight: 600 }}>Chọn Size:</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={selectedSize}
                  onChange={(e, size) => {
                    if (!size) return;
                    setSelectedSize(size);

                    const options = variants.filter(
                      (v) => v.size?.name === size
                    );

                    const valid =
                      options.find(
                        (v) => v.color?.name === selectedColor
                      ) || options.find((v) => v.quantity > 0);

                    if (valid) {
                      setSelectedColor(valid.color?.name);
                      setSelectedVariant(valid);
                    }
                  }}
                  sx={{ my: 1 }}
                >
                  {[...new Set(variants.map((v) => v.size?.name))].map(
                    (size) => {
                      const hasStock = variants.some(
                        (v) => v.size?.name === size && v.quantity > 0
                      );

                      return (
                        <ToggleButton
                          key={size}
                          value={size}
                          disabled={!hasStock}
                        >
                          {size}
                        </ToggleButton>
                      );
                    }
                  )}
                </ToggleButtonGroup>

                {/* COLOR */}
                <Typography sx={{ fontWeight: 600 }}>Chọn Màu:</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={selectedColor}
                  onChange={(e, color) => {
                    if (!color) return;
                    setSelectedColor(color);

                    const found = variants.find(
                      (v) =>
                        v.size?.name === selectedSize &&
                        v.color?.name === color
                    );
                    if (found) setSelectedVariant(found);
                  }}
                  sx={{ my: 1 }}
                >
                  {colorsForSize.map((v) => (
                    <ToggleButton
                      key={v.id}
                      value={v.color?.name}
                      disabled={v.quantity === 0}
                    >
                      {v.color?.name}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                {/* PRICE */}
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, mt: 2 }}
                >
                  {selectedVariant?.price
                    ? selectedVariant.price.toLocaleString("vi-VN") + "₫"
                    : "Liên hệ"}
                </Typography>

                {/* QTY */}
                <TextField
                  type="number"
                  label="Số lượng"
                  size="small"
                  value={qty}
                  fullWidth
                  sx={{ mt: 2 }}
                  onChange={(e) =>
                    setQty(
                      Math.max(1, Math.floor(Number(e.target.value)))
                    )
                  }
                />

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  startIcon={<AddShoppingCartIcon />}
                  onClick={addToCart}
                >
                  Thêm vào giỏ
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* RELATED */}
          <Box mt={5}>
            <Typography variant="h6">Sản phẩm liên quan</Typography>
            <Grid container spacing={2} mt={1}>
              {related.map((r) => (
                <Grid item xs={6} sm={4} md={3} key={r.id}>
                  <Card
                    onClick={() => navigate(`/product/${r.id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={r.product?.image_url}
                    />
                    <CardContent sx={{ p: 1 }}>
                      <Typography noWrap>{r.product?.name}</Typography>
                      <Typography variant="caption">
                        {r.price
                          ? r.price.toLocaleString("vi-VN") + "₫"
                          : "Liên hệ"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Snackbar
            open={!!snack}
            autoHideDuration={2500}
            onClose={() => setSnack(null)}
          >
            {snack ? (
              <Alert severity={snack.severity}>{snack.message}</Alert>
            ) : null}
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
