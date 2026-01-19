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
import ReviewProduct from "./ReviewProduct"; 

const API_BASE = "http://127.0.0.1:8000";
const CART_KEY = "cart";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    primary: { main: "#111111" },
    secondary: { main: "#DD002A" },
    text: { primary: "#111111", secondary: "#666666" },
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
    h5: { fontWeight: 700 },
    body2: { fontSize: 13 },
  },
});

const normalizePrice = (p) => {
  const num = Number(p);
  return isNaN(num) ? 0 : num;
};

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

  const fixImage = (url) => {
    if (!url) return "/images/placeholder.jpg";
    return url.startsWith("http") ? url : `${API_BASE}/storage/${url}`;
  };

  const isStopped = useMemo(() => Number(product?.status ?? 1) !== 1, [product]);

  const selectVariant = (v) => {
    if (!v) return;

    const original = normalizePrice(v.price);
    const final = v.has_discount && v.final_price ? normalizePrice(v.final_price) : original;

    setSelectedVariant({
      ...v,
      original_price: original,
      final_price: final,
      has_discount: !!v.has_discount,
      discount_percent: original > 0 ? Math.round(((original - final) / original) * 100) : 0,
    });
  };

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      const p = await res.json();

      const normalizedProduct = { ...p, status: Number(p.status ?? 1) };
      setProduct(normalizedProduct);

      const normalizedVariants = (p.details || []).map((v) => {
        const original = normalizePrice(v.price);
        const final =
          v.has_discount && v.final_price ? normalizePrice(v.final_price) : original;

        return {
          ...v,
          original_price: original,
          final_price: final,
          has_discount: !!v.has_discount,
          discount_percent: original > 0 ? Math.round(((original - final) / original) * 100) : 0,
          quantity: Number(v.quantity ?? 0),
        };
      });

      setVariants(normalizedVariants);

      const firstInStock = normalizedVariants.find((v) => (v.quantity ?? 0) > 0);
      const firstAny = normalizedVariants[0];
      const chosen = firstInStock || firstAny || null;

      if (chosen) {
        setSelectedSize(chosen.size?.name ?? null);
        setSelectedColor(chosen.color?.name ?? null);
        selectVariant(chosen);
      } else {
        setSelectedSize(null);
        setSelectedColor(null);
        setSelectedVariant(null);
      }

      setMainImage(fixImage(p.image_url));
    } catch (err) {
      console.log("Error loading product:", err);
      setSnack({ severity: "error", message: "Không thể tải sản phẩm." });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchImages = useCallback(async () => {
    if (!selectedVariant) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/image-products/?product_detail_id=${selectedVariant.id}`
      );
      const raw = await res.json();
      const arr = Array.isArray(raw) ? raw : raw.data || [];

      const list = arr
        .map((img) => ({
          id: img.id,
          url: fixImage(img.full_url || img.url_image),
          sort_order: img.sort_order ?? 0,
        }))
        .sort((a, b) => a.sort_order - b.sort_order);

      setImages(list);
      if (list.length > 0) setMainImage(list[0].url);
    } catch {
      setImages([]);
    }
  }, [selectedVariant]);

  const fetchRelated = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/`);
      const arr = await res.json();

      const list = (Array.isArray(arr) ? arr : [])
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
  }, [fetchImages]);

  useEffect(() => {
    if (product) fetchRelated();
  }, [product, fetchRelated]);

  const colorsForSize = useMemo(() => {
    if (!selectedSize) return [];
    return variants.filter((v) => v.size?.name === selectedSize);
  }, [variants, selectedSize]);

  const selectedOutOfStock = useMemo(
    () => !!selectedVariant && Number(selectedVariant.quantity ?? 0) <= 0,
    [selectedVariant]
  );

  const addToCart = () => {
    if (isStopped) {
      setSnack({ severity: "warning", message: "Sản phẩm đã ngưng bán." });
      return;
    }

    if (!selectedVariant) {
      setSnack({ severity: "warning", message: "Vui lòng chọn size & màu." });
      return;
    }

    if (Number(selectedVariant.quantity ?? 0) <= 0) {
      setSnack({ severity: "warning", message: "Biến thể này đã hết hàng." });
      return;
    }

    if (qty > Number(selectedVariant.quantity ?? 0)) {
      setSnack({
        severity: "warning",
        message: `Số lượng tối đa còn lại: ${Number(selectedVariant.quantity ?? 0)}.`,
      });
      return;
    }

    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

    const price = selectedVariant.has_discount ? selectedVariant.final_price : selectedVariant.original_price;

    const exist = cart.find((item) => item.product_detail_id === selectedVariant.id);

    if (exist) {
      const newQty = (exist.quantity || 0) + qty;

      if (newQty > Number(selectedVariant.quantity ?? 0)) {
        setSnack({
          severity: "warning",
          message: `Trong giỏ đã có. Tổng tối đa còn lại: ${Number(selectedVariant.quantity ?? 0)}.`,
        });
        return;
      }

      exist.quantity = newQty;
      exist.unit_price = price;
    } else {
      cart.push({
        id: Date.now(),
        product_detail_id: selectedVariant.id,
        product_id: product.id,
        name: product.name,
        size: selectedVariant.size?.name,
        color: selectedVariant.color?.name,
        unit_price: price,
        original_price: selectedVariant.original_price,
        final_price: selectedVariant.final_price,
        has_discount: selectedVariant.has_discount,
        quantity: qty,
        image_url: mainImage,
      });
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    setSnack({ severity: "success", message: "Đã thêm vào giỏ hàng!" });
  };

  if (loading || !product) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ py: 4, backgroundColor: "#fff" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
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
                  opacity: isStopped ? 0.75 : 1,
                }}
              />

              <Stack direction="row" spacing={1} mt={2}>
                {images.map((img) => (
                  <Box
                    key={img.id}
                    component="img"
                    src={img.url}
                    onClick={() => !isStopped && setMainImage(img.url)}
                    sx={{
                      width: 90,
                      height: 90,
                      objectFit: "cover",
                      cursor: isStopped ? "not-allowed" : "pointer",
                      opacity: isStopped ? 0.6 : 1,
                      border: mainImage === img.url ? "2px solid #111" : "1px solid #ccc",
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {product.name}
                </Typography>

                {isStopped && (
                  <Chip
                    label="Hết bán"
                    sx={{
                      borderRadius: 0,
                      bgcolor: "#eee",
                      color: "#777",
                      fontWeight: 700,
                    }}
                  />
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 600, mb: 1 }}>Size</Typography>
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                {[...new Set(variants.map((v) => v.size?.name).filter(Boolean))].map((size) => {
                  const hasStock = variants.some(
                    (v) => v.size?.name === size && (v.quantity ?? 0) > 0
                  );
                  const disabled = isStopped || !hasStock;

                  return (
                    <Chip
                      key={size}
                      label={size}
                      clickable={!disabled}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;

                        setSelectedSize(size);

                        const list = variants.filter(
                          (v) => v.size?.name === size && (v.quantity ?? 0) > 0
                        );

                        const valid = list.find((v) => v.color?.name === selectedColor) || list[0];

                        if (valid) {
                          setSelectedColor(valid.color?.name);
                          selectVariant(valid);
                        }
                      }}
                      sx={{
                        borderRadius: 0,
                        border: "1px solid #111",
                        backgroundColor: selectedSize === size ? "#111" : "#fff",
                        color: selectedSize === size ? "#fff" : "#111",
                        opacity: disabled ? 0.6 : 1,
                      }}
                    />
                  );
                })}
              </Stack>

              <Typography sx={{ fontWeight: 600, mb: 1 }}>Màu</Typography>
              <Stack direction="row" spacing={1} mb={3} flexWrap="wrap">
                {colorsForSize.map((v) => {
                  const disabled = isStopped || (v.quantity ?? 0) <= 0;

                  return (
                    <Chip
                      key={v.id}
                      label={v.color?.name}
                      clickable={!disabled}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        setSelectedColor(v.color?.name);
                        selectVariant(v);
                      }}
                      sx={{
                        borderRadius: 0,
                        border: "1px solid #111",
                        backgroundColor: selectedColor === v.color?.name ? "#111" : "#fff",
                        color: selectedColor === v.color?.name ? "#fff" : "#111",
                        opacity: disabled ? 0.6 : 1,
                      }}
                    />
                  );
                })}
              </Stack>

              <Box sx={{ mb: 2 }}>
                {isStopped ? (
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#999" }}>
                    Hết bán
                  </Typography>
                ) : selectedOutOfStock ? (
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#999" }}>
                    Hết hàng
                  </Typography>
                ) : selectedVariant?.has_discount ? (
                  <>
                    <Typography
                      sx={{
                        fontSize: 25,
                        color: "#999",
                        textDecoration: "line-through",
                      }}
                    >
                      {selectedVariant.original_price.toLocaleString("vi-VN")}₫
                    </Typography>

                    <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main" }}>
                      {selectedVariant.final_price.toLocaleString("vi-VN")}₫
                    </Typography>
                  </>
                ) : (
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {selectedVariant?.final_price
                      ? selectedVariant.final_price.toLocaleString("vi-VN") + "₫"
                      : "Liên hệ"}
                  </Typography>
                )}
              </Box>

              <TextField
  label="Số lượng"
  type="number"
  size="small"
  value={qty}
  sx={{ width: 120 }}
  disabled={isStopped || selectedOutOfStock}
  inputProps={{ min: 1 }}
  onChange={(e) => {
    const v = e.target.value;

    // cho phép rỗng để người dùng xoá và gõ lại
    if (v === "") {
      setQty("");
      return;
    }

    // chỉ cho nhập số nguyên dương
    if (/^\d+$/.test(v)) {
      setQty(v);
    }
  }}
  onBlur={() => {
    // khi rời khỏi input: nếu rỗng hoặc 0 thì về 1
    const n = parseInt(qty, 10);
    if (!n || n < 1) setQty("1");
  }}
/>


              <Button
                fullWidth
                variant="contained"
                disabled={isStopped || selectedOutOfStock}
                sx={{
                  mt: 3,
                  py: 1.6,
                  fontSize: 16,
                  fontWeight: 700,
                  backgroundColor: "#111",
                  borderRadius: 0,
                  "&:hover": { backgroundColor: "#333" },
                  "&.Mui-disabled": { backgroundColor: "#ccc", color: "#666" },
                }}
                onClick={addToCart}
              >
                {isStopped ? "Sản phẩm ngưng bán" : selectedOutOfStock ? "Hết hàng" : "Thêm vào giỏ hàng"}
              </Button>
            </Grid>
          </Grid>
            <Divider sx={{ my: 4 }} />
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Mô tả sản phẩm
              </Typography>
              <Typography sx={{ color: "#333", whiteSpace: "pre-wrap" }}>
                {product.description || "Chưa có mô tả."}
              </Typography>
            </Box>
            <Divider sx={{ my: 4 }} />
            {/* REVIEW SECTION - thêm đúng ở đây */}
            <ReviewProduct productId={product.id} />

            <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)}>
              {snack && <Alert severity={snack.severity}>{snack.message}</Alert>}
            </Snackbar>

        </Container>
      </Box>
    </ThemeProvider>
  );
}
