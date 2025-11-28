// src/pages/ProductPage.jsx
import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShareIcon from "@mui/icons-material/Share";
import StarIcon from "@mui/icons-material/Star";
import { createTheme, ThemeProvider } from "@mui/material/styles";

/**
 * ProductPage (user-facing) - uses same cart format as HomePage.
 * Fixed: qty input is controlled and used when adding to cart.
 */

const API_BASE = "http://127.0.0.1:8000";
const CART_STORAGE_KEY = "cart"; // same as HomePage
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

  const [productDetail, setProductDetail] = useState(null);
  const [related, setRelated] = useState([]);
  const [images, setImages] = useState([]);
  const [mainImage, setMainImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState(null);

  const [snack, setSnack] = useState(null);
  const [fav, setFav] = useState(false);

  // <-- NEW: quantity state for add-to-cart -->
  const [qty, setQty] = useState(1);

  // ---------- Fetch product detail ----------
  const fetchProductDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/product-details/${id}/`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fetch failed: ${res.status} ${txt}`);
      }
      const p = await res.json();
      const normalized = {
        id: p.id,
        product_id: p.product_id ?? null,
        color: p.color ?? null,
        size: p.size ?? null,
        price: typeof p.price === "number" ? p.price : p.price ? Number(p.price) : null,
        quantity: typeof p.quantity === "number" ? p.quantity : p.quantity ? Number(p.quantity) : 0,
        status: typeof p.status === "number" ? !!p.status : typeof p.status === "boolean" ? p.status : true,
        product: p.product ?? null,
        created_at: p.created_at ?? null,
        updated_at: p.updated_at ?? null,
      };
      setProductDetail(normalized);
    } catch (err) {
      console.error("fetchProductDetail error:", err);
      setError("Không thể tải chi tiết sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ---------- Fetch related ----------
  const fetchRelated = useCallback(
    async (productId) => {
      if (!productId) return;
      setLoadingRelated(true);
      try {
        const res = await fetch(`${API_BASE}/api/product-details/`);
        if (!res.ok) throw new Error(`Fetch related failed: ${res.status}`);
        const arr = await res.json();
        const normalized = (Array.isArray(arr) ? arr : arr || []).map((d) => ({
          id: d.id,
          product_id: d.product_id ?? null,
          price: typeof d.price === "number" ? d.price : d.price ? Number(d.price) : null,
          quantity: typeof d.quantity === "number" ? d.quantity : d.quantity ? Number(d.quantity) : 0,
          product: d.product ?? null,
          image:
            d.product && d.product.image_url
              ? d.product.image_url.startsWith("http")
                ? d.product.image_url
                : `${API_BASE}/storage/${d.product.image_url}`
              : null,
        }));
        const filtered = normalized.filter((d) => d.product_id === productId && d.id !== Number(id)).slice(0, 8);
        setRelated(filtered);
      } catch (err) {
        console.warn("fetchRelated error:", err);
        setRelated([]);
      } finally {
        setLoadingRelated(false);
      }
    },
    [id]
  );

  // ---------- Fetch images ----------
  const fetchImages = useCallback(async (productDetailId) => {
    if (!productDetailId) return;
    setLoadingImages(true);
    try {
      const res = await fetch(`${API_BASE}/api/image-products/?product_detail_id=${encodeURIComponent(productDetailId)}`);
      if (!res.ok) {
        console.warn("fetchImages failed", res.status);
        setImages([]);
        setMainImage(null);
        return;
      }
      const data = await res.json();
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (Array.isArray(data.data)) items = data.data;
      else if (Array.isArray(data.items)) items = data.items;
      else items = data || [];

      const normalized = (items || []).map((it) => {
        let url = it.full_url ?? it.url ?? null;
        if (!url && it.url_image) {
          if (/^https?:\/\//i.test(it.url_image)) url = it.url_image;
          else url = `${API_BASE}/storage/${it.url_image.replace(/^\/+/, "")}`;
        }
        return {
          id: it.id,
          raw: it,
          url,
          description: it.description ?? "",
          sort_order: it.sort_order ?? "",
        };
      });

      setImages(normalized);
      setMainImage(normalized.length > 0 ? normalized[0].url || null : null);
    } catch (err) {
      console.warn("fetchImages error:", err);
      setImages([]);
      setMainImage(null);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // ---------- Effects ----------
  useEffect(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

  useEffect(() => {
    if (productDetail && productDetail.product_id) {
      fetchRelated(productDetail.product_id);
      fetchImages(productDetail.id);
    }
  }, [productDetail, fetchRelated, fetchImages]);

  // ---------- Utilities ----------
  const safePrice = (price) => {
    if (price == null) return "Liên hệ";
    if (typeof price !== "number") return "Liên hệ";
    if (price <= 0) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  function updateCartCountAndEvent(cart) {
    try {
      const totalQty = cart.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      localStorage.setItem(CART_COUNT_KEY, String(totalQty));
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: totalQty, items: cart } }));
    } catch (e) {
      console.warn("updateCartCountAndEvent error", e);
    }
  }

  // ---------- Add to cart (match HomePage behavior) ----------
  const handleAddToCart = (p) => {
    try {
      // coerce qty to integer >=1
      const q = Math.max(1, Math.floor(Number(qty) || 1));

      // Load existing cart
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const cart = raw ? JSON.parse(raw) : [];

      // Determine unit price
      let unitPrice = null;
      if (typeof p.price === "number") unitPrice = p.price;
      else if (p.product && Array.isArray(p.product.details) && p.product.details[0] && (p.product.details[0].price || p.product.details[0].price === 0)) {
        const maybe = p.product.details[0].price;
        unitPrice = !isNaN(Number(maybe)) ? Number(maybe) : null;
      }
      if (unitPrice == null && p.product && (p.product.price || p.product.price === 0)) {
        const maybe = p.product.price;
        unitPrice = !isNaN(Number(maybe)) ? Number(maybe) : null;
      }

      const idx = cart.findIndex((it) => it.id === p.id);
      if (idx >= 0) {
        // increment existing quantity by q
        cart[idx].quantity = (Number(cart[idx].quantity) || 0) + q;
        if (unitPrice != null) cart[idx].unit_price = unitPrice;
        cart[idx].line_total = cart[idx].unit_price != null ? cart[idx].unit_price * cart[idx].quantity : null;
      } else {
        // push new with quantity q
        cart.push({
          id: p.id,
          name: p.product?.name ?? p.name ?? `#${p.id}`,
          unit_price: unitPrice,
          line_total: unitPrice != null ? unitPrice * q : null,
          price_display: unitPrice != null ? unitPrice.toLocaleString("vi-VN") + "₫" : "Liên hệ",
          image_url: mainImage ?? (p.product && p.product.image_url ? (p.product.image_url.startsWith("http") ? p.product.image_url : `${API_BASE}/storage/${p.product.image_url}`) : null),
          quantity: q,
        });
      }

      // persist
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

      // update count and fire event
      updateCartCountAndEvent(cart);
const productName = p?.product?.name ?? p?.name ?? `Sản phẩm #${p?.id ?? "?"}`;
      setSnack({ severity: "success", message: `${productName} đã thêm ${q} vào giỏ.` });

    } catch (e) {
      console.error("handleAddToCart error", e);
      setSnack({ severity: "error", message: "Thêm giỏ thất bại." });
    }
  };

  const handleToggleFav = () => {
    setFav((s) => !s);
    setSnack({ severity: "info", message: fav ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích" });
  };

  // ---------- Render ----------
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default", py: 4 }}>
        <Container maxWidth="lg">
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <Typography color="error">{error}</Typography>
              <Button sx={{ ml: 2 }} onClick={() => fetchProductDetail()}>
                Thử lại
              </Button>
            </Box>
          ) : productDetail ? (
            <>
              <Grid container spacing={4} alignItems="flex-start">
                {/* LEFT: Image area (md=6) */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        {mainImage ? (
                          <Box
                            component="img"
                            src={mainImage}
                            alt={`product-${productDetail.id}`}
                            sx={{
                              width: "100%",
                              maxWidth: 600,
                              maxHeight: { xs: 380, md: 640 },
                              height: "auto",
                              objectFit: "contain",
                              borderRadius: 2,
                              display: "block",
                              margin: "0 auto",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "100%",
                              height: 420,
                              borderRadius: 2,
                              backgroundColor: "#F3F7F9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#8F9BA6",
                            }}
                          >
                            <Typography>Chưa có ảnh cho sản phẩm này</Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Thumbnails */}
                      <Stack spacing={1} sx={{ width: 90 }}>
                        {loadingImages ? (
                          <Box sx={{ width: "100%", height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CircularProgress size={20} />
                          </Box>
                        ) : images.length ? (
                          images.map((img, i) => (
                            <Box key={img.id || i} sx={{ position: "relative" }}>
                              <Box
                                component="img"
                                src={img.url || ""}
                                alt={`thumb-${i}`}
                                onClick={() => setMainImage(img.url)}
                                sx={{
                                  width: "100%",
                                  height: 80,
                                  objectFit: "cover",
                                  borderRadius: 1,
                                  cursor: "pointer",
                                  border: img.url === mainImage ? "2px solid #162447" : "1px solid rgba(13,27,42,0.06)",
                                }}
                              />
                            </Box>
                          ))
                        ) : (
                          <Box sx={{ width: "100%", height: 80, borderRadius: 1, backgroundColor: "#F7FAFC", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA8B6" }}>
                            <Typography variant="caption">Không có ảnh</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>

                {/* RIGHT: single Paper (md=6) that contains both description and order box */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={6} sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 3,
                        flexDirection: { xs: "column", md: "row" },
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Left side inside the Paper: Description + attributes */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                          {productDetail.product?.name ?? `Chi tiết #${productDetail.id}`}
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <StarIcon sx={{ color: "#FFD54F", fontSize: 18 }} />
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {productDetail.product?.rating != null ? Number(productDetail.product?.rating).toFixed(1) : "—"}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            • Mã SP: {productDetail.product_id ?? "—"}
                          </Typography>
                        </Stack>

                        <Divider sx={{ my: 1 }} />

                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                          Mô tả sản phẩm
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {productDetail.product?.description ?? productDetail.product?.name ?? `Chi tiết #${productDetail.id}`}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                          Thuộc tính
                        </Typography>
                        <Stack spacing={1}>
                          <Typography variant="body2">Màu: {productDetail.color?.name ?? "—"}</Typography>
                          <Typography variant="body2">Size: {productDetail.size?.name ?? "—"}</Typography>
                          <Typography variant="body2">Kho: {productDetail.quantity ?? 0}</Typography>
                          <Typography variant="body2">Mã chi tiết: {productDetail.id}</Typography>
                        </Stack>
                      </Box>

                      {/* Right side inside the Paper: Order box */}
                      <Box sx={{ width: { xs: "100%", md: 320 } }}>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Trạng thái
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                            {productDetail.status ? "Còn hàng" : "Hết hàng"}
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Giá
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main", mt: 0.5 }}>
                            {safePrice(productDetail.price)}
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* <-- controlled qty input --> */}
                        <TextField
                          label="Số lượng"
                          type="number"
                          size="small"
                          value={qty}
                          onChange={(e) => {
                            const v = Math.floor(Number(e.target.value || 0));
                            setQty(v >= 1 ? v : 1);
                          }}
                          inputProps={{ min: 1 }}
                          sx={{ width: "100%", mb: 2 }}
                        />

                        <Button variant="contained" startIcon={<AddShoppingCartIcon />} fullWidth onClick={() => handleAddToCart(productDetail)} disabled={!productDetail.status}>
                          Thêm giỏ
                        </Button>

                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Button variant="outlined" startIcon={<FavoriteBorderIcon />} fullWidth onClick={handleToggleFav}>
                            {fav ? "Đã yêu thích" : "Yêu thích"}
                          </Button>
                          <Button variant="text" startIcon={<ShareIcon />} fullWidth onClick={() => setSnack({ severity: "info", message: "Chia sẻ chưa có." })}>
                            Chia sẻ
                          </Button>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          Kho: {productDetail.quantity ?? 0}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                          Mã chi tiết: {productDetail.id}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* RELATED products full width under the row */}
                <Grid item xs={12}>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Sản phẩm liên quan
                    </Typography>
                    {loadingRelated ? (
                      <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <Grid container spacing={2}>
                        {related.length === 0 ? (
                          <Grid item xs={12}>
                            <Typography variant="body2">Không có sản phẩm liên quan.</Typography>
                          </Grid>
                        ) : (
                          related.map((r) => (
                            <Grid item xs={6} sm={4} md={3} key={r.id}>
                              <Card onClick={() => navigate(`/product/${r.id}`)} sx={{ cursor: "pointer" }}>
                                <CardMedia component="img" height="120" image={r.image || "/images/placeholder.png"} alt={r.product?.name ?? `detail-${r.id}`} sx={{ objectFit: "cover" }} />
                                <CardContent sx={{ p: 1 }}>
                                  <Typography variant="body2" noWrap>{r.product?.name ?? `Chi tiết #${r.id}`}</Typography>
                                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{r.price ? r.price.toLocaleString("vi-VN") + "₫" : "Liên hệ"}</Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))
                        )}
                      </Grid>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </>
          ) : (
            <Box sx={{ py: 8 }}>
              <Typography textAlign="center">Không có dữ liệu sản phẩm.</Typography>
            </Box>
          )}
        </Container>

        <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
