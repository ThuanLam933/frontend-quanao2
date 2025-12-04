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
  MenuItem,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";
const STORAGE_KEY = "cart";

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

export default function CartPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState(null);

  // product_id -> list variants
  const [variantsMap, setVariantsMap] = useState({});

  // ----------------- HELPERS -----------------
  const normalizeLocalItem = (it) => {
  let pureName = it.name;

  // Tự động tách nếu name có dạng "Tên sản phẩm - Size - Màu"
  if (pureName && pureName.includes(" - ")) {
    const parts = pureName.split(" - ");
    pureName = parts[0]; // tên thật
    it.size_name = it.size_name ?? it.size ?? parts[1];  // size
    it.color_name = it.color_name ?? it.color ?? parts[2]; // màu
  }

  return {
    id: it.id ?? Math.random(),
    product_id: it.product_id ?? null,
    product_detail_id: it.product_detail_id ?? null,
    name: pureName,
    price:
      typeof it.unit_price === "number"
        ? it.unit_price
        : Number(it.price ?? 0),
    qty: Number(it.quantity ?? it.qty ?? 1),
    image_url: it.image_url ?? it.image ?? null,
    size_name: it.size_name ?? it.size ?? null,   // đọc thêm it.size
    color_name: it.color_name ?? it.color ?? null, // đọc thêm it.color
  };
};



  const normalizeImg = (u) => {
    if (!u) return "/images/posterdenim.png";
    if (typeof u !== "string") return "/images/posterdenim.png";
    return u.startsWith("http") ? u : `${API_BASE}/storage/${u}`;
  };

  const saveAndBroadcast = (nextItems) => {
    try {
      const toStore = nextItems.map((it) => ({
  id: it.id,
  product_id: it.product_id,
  product_detail_id: it.product_detail_id,
  name: it.name,            // CHỈ TÊN THẬT
  size: it.size_name,       // size tách riêng
  color: it.color_name,     // màu tách riêng
  unit_price: it.price,
  image_url: it.image_url,
  quantity: it.qty,
}));


      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));

      const totalQty = toStore.reduce(
        (s, it) => s + (Number(it.quantity) || 0),
        0
      );
      try {
        localStorage.setItem("guest_cart_count", String(totalQty));
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent("cartUpdated", {
          detail: { count: totalQty, items: nextItems },
        })
      );
    } catch (e) {
      console.warn("Failed to save cart to storage", e);
    }
  };

  // ----------------- LOAD CART -----------------
  useEffect(() => {
    setLoading(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "[]";
      const parsed = JSON.parse(raw);
      const arr = (Array.isArray(parsed) ? parsed : []).map((it) =>
        normalizeLocalItem(it)
      );
      setItems(arr);

      const totalQty = arr.reduce(
        (s, it) => s + (Number(it.qty) || 0),
        0
      );
      try {
        localStorage.setItem("guest_cart_count", String(totalQty));
      } catch (e) {}
      window.dispatchEvent(
        new CustomEvent("cartUpdated", {
          detail: { count: totalQty, items: arr },
        })
      );
    } catch (e) {
      console.warn("Cart load error", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ----------------- LOAD VARIANTS FOR ITEMS -----------------
  useEffect(() => {
    const productIds = Array.from(
      new Set(items.map((it) => it.product_id).filter(Boolean))
    );
    if (!productIds.length) return;

    let cancelled = false;

    const fetchVariants = async () => {
      try {
        const results = await Promise.all(
          productIds.map(async (pid) => {
            try {
              const res = await fetch(
                `${API_BASE}/api/product-details?product_id=${pid}`
              );
              if (!res.ok) return [pid, []];
              const data = await res.json();
              const arr = Array.isArray(data) ? data : [];

              const normalized = arr.map((d) => ({
                id: d.id,
                product_id: d.product_id,
                price:
                  typeof d.price === "number"
                    ? d.price
                    : d.price
                    ? Number(d.price)
                    : 0,
                quantity: d.quantity ?? 0,
                size_name: d.size?.name ?? null,
                color_name: d.color?.name ?? null,
                image_url:
                  (Array.isArray(d.images) && d.images[0]?.full_url) ||
                  d.product?.image_url ||
                  null,
              }));

              return [pid, normalized];
            } catch {
              return [pid, []];
            }
          })
        );

        if (cancelled) return;

        setVariantsMap((prev) => {
          const next = { ...prev };
          for (const [pid, list] of results) {
            next[pid] = list;
          }
          return next;
        });
      } catch (e) {
        console.warn("Load variants for cart failed", e);
      }
    };

    fetchVariants();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const getVariantsForProduct = (productId) => variantsMap[productId] || [];

  const getSizesForItem = (it) => {
    const vars = getVariantsForProduct(it.product_id);
    const set = new Set();
    vars.forEach((v) => {
      if (v.size_name) set.add(v.size_name);
    });
    return Array.from(set);
  };

  const getColorsForItem = (it) => {
    const vars = getVariantsForProduct(it.product_id).filter((v) =>
      it.size_name ? v.size_name === it.size_name : true
    );
    const set = new Set();
    vars.forEach((v) => {
      if (v.color_name) set.add(v.color_name);
    });
    return Array.from(set);
  };

  const hasStockForSize = (productId, sizeName) => {
    return getVariantsForProduct(productId).some(
      (v) => v.size_name === sizeName && v.quantity > 0
    );
  };

  const hasStockForSizeColor = (productId, sizeName, colorName) => {
    return getVariantsForProduct(productId).some(
      (v) =>
        v.size_name === sizeName &&
        v.color_name === colorName &&
        v.quantity > 0
    );
  };

  const updateCartItemVariant = (itemId, variant) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === itemId);
      if (idx === -1) return prev;

      let next = [...prev];

      // Nếu đã có dòng khác cùng product_detail_id -> gộp qty
      const existingIdx = next.findIndex(
        (it, iIndex) =>
          iIndex !== idx && it.product_detail_id === variant.id
      );

      if (existingIdx !== -1) {
        next[existingIdx] = {
          ...next[existingIdx],
          qty:
            (Number(next[existingIdx].qty) || 0) +
            (Number(next[idx].qty) || 0),
        };
        next.splice(idx, 1);
      } else {
        next[idx] = {
          ...next[idx],
          product_detail_id: variant.id,
          product_id: variant.product_id,
          size_name: variant.size_name,
          color_name: variant.color_name,
          price: variant.price,
          image_url: variant.image_url || next[idx].image_url,
        };
      }

      saveAndBroadcast(next);
      return next;
    });

    setSnack({
      severity: "success",
      message: "Đã cập nhật phiên bản sản phẩm",
    });
  };

  const handleChangeSize = (item, newSize) => {
    if (!item.product_id) return;
    const vars = getVariantsForProduct(item.product_id);
    const candidates = vars.filter(
      (v) => v.size_name === newSize && v.quantity > 0
    );
    if (!candidates.length) {
      setSnack({
        severity: "warning",
        message: "Size này tạm hết hàng",
      });
      return;
    }

    // cố gắng giữ lại màu cũ nếu còn hàng
    let chosen =
      candidates.find((v) => v.color_name === item.color_name) ||
      candidates[0];

    updateCartItemVariant(item.id, chosen);
  };

  const handleChangeColor = (item, newColor) => {
    if (!item.product_id || !item.size_name) return;

    const vars = getVariantsForProduct(item.product_id);
    const candidate = vars.find(
      (v) =>
        v.size_name === item.size_name &&
        v.color_name === newColor &&
        v.quantity > 0
    );

    if (!candidate) {
      setSnack({
        severity: "warning",
        message: "Biến thể này tạm hết hàng",
      });
      return;
    }

    updateCartItemVariant(item.id, candidate);
  };

  // ----------------- LOCAL QTY ACTIONS -----------------
  const addQty = (id) => {
    const next = items.map((i) =>
      i.id === id ? { ...i, qty: (Number(i.qty) || 1) + 1 } : i
    );
    setItems(next);
    saveAndBroadcast(next);
  };

  const subQty = (id) => {
    const next = items.map((i) =>
      i.id === id
        ? { ...i, qty: Math.max(1, (Number(i.qty) || 1) - 1) }
        : i
    );
    setItems(next);
    saveAndBroadcast(next);
  };

  const updateQty = (id, value) => {
    const q = Math.max(1, Number(value || 1));
    const next = items.map((i) =>
      i.id === id ? { ...i, qty: q } : i
    );
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
    setSnack({
      severity: "info",
      message: "Giỏ hàng đã được làm rỗng",
    });
  };

  const subtotal = useMemo(() => {
    return items.reduce(
      (s, it) =>
        s +
        (typeof it.price === "number" ? it.price : 0) * (it.qty || 0),
      0
    );
  }, [items]);

  const handleCheckout = () => {
    if (items.length === 0) {
      setSnack({
        severity: "warning",
        message: "Giỏ hàng trống",
      });
      return;
    }
    setSnack({
      severity: "success",
      message: "Chuyển đến trang thanh toán...",
    });
    setTimeout(() => {
      navigate("/payment");
    }, 400);
  };

  // ----------------- RENDER -----------------
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "background.default",
          pb: 6,
        }}
      >
        <Container maxWidth="lg" sx={{ mt: 6 }}>
          <Grid container spacing={4}>
            {/* Left: Cart items */}
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Giỏ hàng
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => navigate("/collections")}
                    >
                      Tiếp tục mua sắm
                    </Button>
                    <Button
                      variant="text"
                      color="error"
                      onClick={clearCart}
                      disabled={items.length === 0}
                      startIcon={<DeleteOutlineIcon />}
                    >
                      Xóa hết
                    </Button>
                  </Stack>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {loading ? (
                  <Box
                    sx={{
                      py: 6,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Typography>Đang tải...</Typography>
                  </Box>
                ) : items.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Giỏ hàng của bạn đang trống
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", mb: 2 }}
                    >
                      Thêm sản phẩm vào giỏ để bắt đầu mua sắm.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => navigate("/collections")}
                    >
                      Xem sản phẩm
                    </Button>
                  </Box>
                ) : (
                  <List disablePadding>
                    {items.map((it) => (
                      <ListItem
  key={it.id}
  sx={{
    py: 3,
    px: 2,
    mb: 3,
    borderBottom: "1px solid #e5e5e5",
    display: "flex",
    alignItems: "flex-start",
  }}
>
  {/* IMAGE */}
  <Avatar
    variant="square"
    src={normalizeImg(it.image_url)}
    alt={it.name}
    sx={{
      width: 96,
      height: 96,
      mr: 3,
      border: "1px solid #ddd",
    }}
  />

  {/* CONTENT */}
  <Box sx={{ flex: 1 }}>
    {/* NAME — KHÔNG CÒN SIZE + MÀU */}
    <Typography
  sx={{
    fontWeight: 600,
    fontSize: "1.05rem",
    color: "#111",
    mb: 0.5,
  }}
>
  {it.name}
</Typography>


    {/* PRICE */}
    <Typography sx={{ fontSize: ".95rem", color: "#222", fontWeight: 600 }}>
      {it.price.toLocaleString("vi-VN")}₫
    </Typography>

    {/* SIZE + COLOR */}
    <Box sx={{ mt: 2, display: "flex", gap: 3 }}>
      {/* SIZE */}
      <Box>
        <Typography sx={{ fontSize: ".8rem", color: "#555" }}>Size</Typography>
        <TextField
          select
          size="small"
          value={it.size_name}
          onChange={(e) => handleChangeSize(it, e.target.value)}
          sx={{
            width: 85,
            mt: 0.5,
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
              height: 38,
              fontSize: ".9rem",
            },
          }}
        >
          {getSizesForItem(it).map((size) => (
            <MenuItem
              key={size}
              value={size}
              disabled={!hasStockForSize(it.product_id, size)}
            >
              {size}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* COLOR */}
      <Box>
        <Typography sx={{ fontSize: ".8rem", color: "#555" }}>Màu</Typography>
        <TextField
          select
          size="small"
          value={it.color_name}
          onChange={(e) => handleChangeColor(it, e.target.value)}
          sx={{
            width: 110,
            mt: 0.5,
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
              height: 38,
              fontSize: ".9rem",
            },
          }}
        >
          {getColorsForItem(it).map((color) => (
            <MenuItem
              key={color}
              value={color}
              disabled={
                !hasStockForSizeColor(it.product_id, it.size_name, color)
              }
            >
              {color}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Box>

    {/* QTY + DELETE */}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mt: 2.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton size="small" onClick={() => subQty(it.id)}>
          <RemoveCircleOutlineIcon fontSize="small" />
        </IconButton>

        <TextField
          value={it.qty}
          size="small"
          onChange={(e) => updateQty(it.id, e.target.value)}
          sx={{
            width: 60,
            "& input": { textAlign: "center" },
          }}
        />

        <IconButton size="small" onClick={() => addQty(it.id)}>
          <AddCircleOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      <IconButton color="error" onClick={() => removeItem(it.id)}>
        <DeleteOutlineIcon />
      </IconButton>
    </Box>
  </Box>
</ListItem>



                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Right: Summary */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 3, position: "sticky", top: 24 }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary" }}
                >
                  Tóm tắt đơn hàng
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, mt: 1 }}
                >
                  Thanh toán
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary" }}
                  >
                    Tạm tính
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800 }}
                  >
                    {subtotal.toLocaleString("vi-VN")}₫
                  </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleCheckout}
                    disabled={items.length === 0}
                  >
                    Thanh toán
                  </Button>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => {
                    setSnack({
                      severity: "info",
                      message: "Lưu giỏ hàng (demo)",
                    });
                  }}
                >
                  Lưu để sau
                </Button>

                <Divider sx={{ my: 2 }} />

                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary" }}
                >
                  Phương thức thanh toán COD
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Snackbar
          open={!!snack}
          autoHideDuration={2500}
          onClose={() => setSnack(null)}
        >
          {snack ? (
            <Alert
              onClose={() => setSnack(null)}
              severity={snack.severity}
            >
              {snack.message}
            </Alert>
          ) : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
