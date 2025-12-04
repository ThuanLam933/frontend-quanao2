// src/pages/ProductPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Stack,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Chip,
} from "@mui/material";

import { createTheme, ThemeProvider } from "@mui/material/styles";

const API_BASE = "http://127.0.0.1:8000";
const CART_KEY = "cart";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    primary: { main: "#111111" },
    text: {
      primary: "#111111",
      secondary: "#666666",
    },
  },
  shape: { borderRadius: 0 }, // phong cách Uniqlo
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
    h5: { fontWeight: 700 },
    body2: { fontSize: 13 },
  },
});

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [mainImage, setMainImage] = useState(null);
  const [related, setRelated] = useState([]);

  const [qty, setQty] = useState(1);
  const [snack, setSnack] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lấy ảnh chính
  const fixImage = (url) => {
    if (!url) return "/images/placeholder.jpg";
    return url.startsWith("http") ? url : `${API_BASE}/storage/${url}`;
  };

  // Fetch sản phẩm
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      const p = await res.json();

      setProduct(p);
      setVariants(p.details || []);

      const first = p.details?.[0];

      if (first) {
        setSelectedSize(first.size?.name);
        setSelectedColor(first.color?.name);
        setSelectedVariant(first);
        setMainImage(fixImage(p.image_url));
      }
    } catch (err) {
      console.log("Error loading product:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch ảnh cho variant
  const fetchImages = useCallback(async () => {
    if (!selectedVariant) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/image-products/?product_detail_id=${selectedVariant.id}`
      );
      const raw = await res.json();
      const arr = Array.isArray(raw) ? raw : raw.data || [];

      const list = arr.map((img) => ({
        id: img.id,
        url: fixImage(img.full_url || img.url_image),
        sort_order: img.sort_order ?? 0,
      }));

      const sorted = list.sort((a, b) => a.sort_order - b.sort_order);

      setImages(sorted);
      if (sorted.length > 0) setMainImage(sorted[0].url);
    } catch {
      setImages([]);
    }
  }, [selectedVariant]);

  // Related
  const fetchRelated = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/`);
      const arr = await res.json();

      const list = arr
        .filter((p) => p.categories_id === product?.categories_id && p.id !== product?.id)
        .slice(0, 4);

      setRelated(list);
    } catch {}
  }, [product]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    fetchImages();
  }, [selectedVariant]);

  useEffect(() => {
    if (product) fetchRelated();
  }, [product]);

  // Colors theo size
  const colorsForSize = useMemo(() => {
    if (!selectedSize) return [];
    return variants.filter((v) => v.size?.name === selectedSize);
  }, [variants, selectedSize]);

  // Thêm vào giỏ
  const addToCart = () => {
    if (!selectedVariant) {
      setSnack({ severity: "warning", message: "Vui lòng chọn size & màu." });
      return;
    }

    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

    // nếu đã có → cộng dồn
    const exist = cart.find((item) => item.product_detail_id === selectedVariant.id);

    if (exist) {
      exist.quantity += qty;
    } else {
      cart.push({
        id: Date.now(),
        product_detail_id: selectedVariant.id,
        product_id: product.id,
        name: product.name,
        size: selectedVariant.size?.name,
        color: selectedVariant.color?.name,
        unit_price: selectedVariant.price,
        quantity: qty,
        image_url: mainImage,
      });
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    window.dispatchEvent(
      new CustomEvent("cartUpdated", { detail: { count: cart.length, items: cart } })
    );

    setSnack({ severity: "success", message: "Đã thêm vào giỏ hàng!" });
  };

  // ---------------- RENDER ----------------
  if (loading || !product)
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ py: 4, backgroundColor: "#fff" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* LEFT IMAGE COLUMN - STYLE UNIQLO */}
            <Grid item xs={12} md={7}>
              <Box
                component="img"
                src={mainImage}
                alt={product.name}
                sx={{
                  width: "100%",
                  height: 580,
                  objectFit: "cover",
                  border: "1px solid #e0e0e0",
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
                      width: 90,
                      height: 90,
                      objectFit: "cover",
                      cursor: "pointer",
                      border:
                        mainImage === img.url
                          ? "2px solid #111"
                          : "1px solid #ccc",
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            {/* RIGHT COLUMN */}
            <Grid item xs={12} md={5}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                {product.name}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* SIZE SELECT */}
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Chọn Size</Typography>
              <Stack direction="row" spacing={1} mb={2}>
                {[...new Set(variants.map((v) => v.size?.name))].map((size) => {
                  const hasStock = variants.some(
                    (v) => v.size?.name === size && v.quantity > 0
                  );

                  return (
                    <Chip
                      key={size}
                      label={size}
                      clickable={hasStock}
                      disabled={!hasStock}
                      onClick={() => {
                        setSelectedSize(size);
                        const opt = variants.filter((v) => v.size?.name === size);
                        const valid =
                          opt.find((v) => v.color?.name === selectedColor) ||
                          opt.find((v) => v.quantity > 0);
                        if (valid) {
                          setSelectedVariant(valid);
                          setSelectedColor(valid.color?.name);
                        }
                      }}
                      sx={{
                        borderRadius: 0,
                        border: "1px solid #111",
                        px: 2,
                        backgroundColor:
                          selectedSize === size ? "#111" : "#fff",
                        color: selectedSize === size ? "#fff" : "#111",
                      }}
                    />
                  );
                })}
              </Stack>

              {/* COLOR SELECT */}
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Chọn Màu</Typography>
              <Stack direction="row" spacing={1} mb={3}>
                {colorsForSize.map((v) => (
                  <Chip
                    key={v.id}
                    label={v.color?.name}
                    clickable={v.quantity > 0}
                    disabled={v.quantity === 0}
                    onClick={() => {
                      setSelectedColor(v.color?.name);
                      setSelectedVariant(v);
                    }}
                    sx={{
                      borderRadius: 0,
                      border: "1px solid #111",
                      px: 2,
                      backgroundColor:
                        selectedColor === v.color?.name ? "#111" : "#fff",
                      color:
                        selectedColor === v.color?.name ? "#fff" : "#111",
                    }}
                  />
                ))}
              </Stack>

              {/* PRICE */}
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                {selectedVariant?.price
                  ? selectedVariant.price.toLocaleString("vi-VN") + "₫"
                  : "Liên hệ"}
              </Typography>

              {/* QTY */}
              <TextField
                label="Số lượng"
                type="number"
                size="small"
                value={qty}
                sx={{ width: 120 }}
                onChange={(e) =>
                  setQty(Math.max(1, Math.floor(Number(e.target.value))))
                }
              />

              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  py: 1.6,
                  fontSize: 16,
                  fontWeight: 700,
                  backgroundColor: "#111",
                  "&:hover": { backgroundColor: "#000" },
                }}
                onClick={addToCart}
              >
                Thêm vào giỏ hàng
              </Button>
            </Grid>
          </Grid>

          {/* RELATED */}
          <Box mt={6}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Sản phẩm liên quan
            </Typography>

            <Grid container spacing={2}>
              {related.map((p) => (
                <Grid item xs={6} sm={4} md={3} key={p.id}>
                  <Box
                    onClick={() => navigate(`/product/${p.id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <Box
                      component="img"
                      src={fixImage(p.image_url)}
                      sx={{
                        width: "100%",
                        height: 260,
                        objectFit: "cover",
                        border: "1px solid #eee",
                      }}
                    />
                    <Typography sx={{ mt: 1, fontWeight: 600 }}>
                      {p.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {p.details?.[0]?.price
                        ? p.details[0].price.toLocaleString("vi-VN") + "₫"
                        : "Liên hệ"}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* SNACKBAR */}
          <Snackbar
            open={!!snack}
            autoHideDuration={2500}
            onClose={() => setSnack(null)}
          >
            {snack && (
              <Alert severity={snack.severity}>{snack.message}</Alert>
            )}
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
