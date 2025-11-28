// src/pages/CartPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  IconButton,
  Button,
  Paper,
  Grid,
  Avatar,
  Stack,
  TextField,
  Divider,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useNavigate } from "react-router-dom";

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

const STORAGE_KEY = "cart";

export default function CartPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState(null);

  // normalize item shape from storage
  const normalizeLocalItem = (it) => {
    return {
      id: it.id ?? Math.random(),
      cart_detail_id: it.cart_detail_id ?? null,
      product_detail_id: it.product_detail_id ?? null,
      name: it.name ?? it.title ?? `Sản phẩm #${it.id ?? ""}`,
      price:
        typeof it.unit_price === "number"
          ? it.unit_price
          : typeof it.price === "number"
          ? it.price
          : it.unit_price && !isNaN(parseFloat(it.unit_price))
          ? parseFloat(it.unit_price)
          : it.price && !isNaN(parseFloat(it.price))
          ? parseFloat(it.price)
          : 0,
      qty: Number(it.quantity ?? it.qty ?? 1),
      image_url: it.image_url ?? it.image ?? null,
      slug: it.slug ?? null,
      description: it.description ?? "",
    };
  };

  // read cart from localStorage once (no backend)
  useEffect(() => {
    setLoading(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "[]";
      const parsed = JSON.parse(raw);
      const arr = (Array.isArray(parsed) ? parsed : []).map((it) => normalizeLocalItem(it));
      setItems(arr);
      const totalQty = arr.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      try {
        localStorage.setItem("guest_cart_count", String(totalQty));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: totalQty, items: arr } }));
    } catch (e) {
      console.warn("Cart load error", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // helper to persist given items to storage and broadcast
  const saveAndBroadcast = (nextItems) => {
    try {
      const toStore = nextItems.map((it) => ({
        id: it.id,
        name: it.name,
        unit_price: it.price,
        line_total: typeof it.price === "number" ? it.price * (it.qty || 1) : null,
        price_display: typeof it.price === "number" ? it.price.toLocaleString("vi-VN") + "₫" : "Liên hệ",
        image_url: it.image_url,
        quantity: it.qty,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      const totalQty = toStore.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      try {
        localStorage.setItem("guest_cart_count", String(totalQty));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: totalQty, items: nextItems } }));
    } catch (e) {
      console.warn("Failed to save cart to storage", e);
    }
  };

  // local modifications update state then persist immediately
  const addQty = (id) => {
    const next = items.map((i) => (i.id === id ? { ...i, qty: (Number(i.qty) || 1) + 1 } : i));
    setItems(next);
    saveAndBroadcast(next);
  };

  const subQty = (id) => {
    const next = items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, (Number(i.qty) || 1) - 1) } : i));
    setItems(next);
    saveAndBroadcast(next);
  };

  const updateQty = (id, value) => {
    const q = Math.max(1, Number(value || 1));
    const next = items.map((i) => (i.id === id ? { ...i, qty: q } : i));
    setItems(next);
    saveAndBroadcast(next);
  };

  const removeItem = (id) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    saveAndBroadcast(next);
    setSnack({ severity: "info", message: "Đã xoá sản phẩm" });
  };

  const clearCart = () => {
    setItems([]);
    saveAndBroadcast([]);
    setSnack({ severity: "info", message: "Giỏ hàng đã được làm rỗng" });
  };

  const subtotal = useMemo(() => {
    return items.reduce((s, it) => s + ((typeof it.price === "number" ? it.price : 0) * (it.qty || 0)), 0);
  }, [items]);

  const handleCheckout = () => {
    if (items.length === 0) {
      setSnack({ severity: "warning", message: "Giỏ hàng trống" });
      return;
    }
    setSnack({ severity: "success", message: "Chuyển đến trang thanh toán..." });
    setTimeout(() => {
      navigate("/payment");
    }, 400);
  };

  const normalizeImg = (u) => {
    if (!u) return "/images/posterdenim.png";
    if (typeof u !== "string") return "/images/posterdenim.png";
    return u.startsWith("http") ? u : `${API_BASE}/storage/${u}`;
  };

  // UI: NO header/banner/footer here — MainLayout will provide them
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default", pb: 6 }}>
        <Container maxWidth="lg" sx={{ mt: 6 }}>
          <Grid container spacing={4}>
            {/* Left: Cart items */}
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>Giỏ hàng</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" color="inherit" onClick={() => navigate("/collections")}>Tiếp tục mua sắm</Button>
                    <Button variant="text" color="error" onClick={clearCart} disabled={items.length===0} startIcon={<DeleteOutlineIcon />}>Xóa hết</Button>
                  </Stack>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {loading ? (
                  <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}><Typography>Đang tải...</Typography></Box>
                ) : items.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Giỏ hàng của bạn đang trống</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>Thêm sản phẩm vào giỏ để bắt đầu mua sắm.</Typography>
                    <Button variant="contained" onClick={() => navigate("/collections")}>Xem sản phẩm</Button>
                  </Box>
                ) : (
                  <List disablePadding>
                    {items.map((it) => (
                      <ListItem key={it.id} sx={{ py: 2, borderBottom: "1px solid rgba(13,27,42,0.04)" }}>
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={normalizeImg(it.image_url)}
                            alt={it.name}
                            sx={{ width: 88, height: 88, mr: 2 }}
                          />
                        </ListItemAvatar>

                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                              <Typography sx={{ fontWeight: 700 }}>{it.name}</Typography>
                              {it.slug && <Chip size="small" label={it.slug} sx={{ ml: 1 }} />}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" sx={{ color: "text.secondary" }}>{it.description ?? ""}</Typography>
                              <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 800 }}>{typeof it.price === "number" ? it.price.toLocaleString("vi-VN") + "₫" : "Liên hệ"}</Typography>
                            </Box>
                          }
                        />

                        <ListItemSecondaryAction sx={{ right: 0, display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                            <IconButton size="small" onClick={() => subQty(it.id)}><RemoveCircleOutlineIcon /></IconButton>
                            <TextField
                              value={it.qty}
                              onChange={(e) => updateQty(it.id, e.target.value)}
                              inputProps={{ style: { textAlign: "center" } }}
                              size="small"
                              sx={{ width: 72 }}
                            />
                            <IconButton size="small" onClick={() => addQty(it.id)}><AddCircleOutlineIcon /></IconButton>
                          </Box>

                          <IconButton edge="end" color="error" onClick={() => removeItem(it.id)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Right: Summary */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 3, position: "sticky", top: 24 }}>
                <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>Tóm tắt đơn hàng</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>Thanh toán</Typography>

                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Tạm tính</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{subtotal.toLocaleString("vi-VN")}₫</Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button fullWidth variant="contained" size="large" onClick={handleCheckout} disabled={items.length === 0}>
                    Thanh toán
                  </Button>
                </Box>

                <Button fullWidth variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => { setSnack({ severity: "info", message: "Lưu giỏ hàng (demo)" }); }}>
                  Lưu để sau
                </Button>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Phương thức thanh toán COD/Hệ thống thanh toán online sẽ được tích hợp sau.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
