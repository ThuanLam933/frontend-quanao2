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
  Stack,
  TextField,
  Divider,
  Snackbar,
  
  List,
  ListItem,
  
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";

import Avatar from "@mui/material/Avatar";

import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";
const STORAGE_KEY = "cart";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    primary: { main: "#111111", contrastText: "#FFFFFF" },
    secondary: { main: "#DD002A" }, // gần giống đỏ Uniqlo
    text: { primary: "#111111", secondary: "#666666" },
  },
  shape: { borderRadius: 0 }, // Uniqlo rất ít bo góc
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
    h5: { fontWeight: 700 },
    body2: { fontSize: 13 },
  },
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
      it.size_name = it.size_name ?? it.size ?? parts[1]; // size
      it.color_name = it.color_name ?? it.color ?? parts[2]; // màu
    }

    return {
  id: it.id ?? Math.random(),
  product_id: it.product_id ?? null,
  product_detail_id: it.product_detail_id ?? null,
  name: pureName,

  original_price: Number(it.original_price ?? it.unit_price ?? 0),
  final_price: Number(it.final_price ?? it.unit_price ?? 0),
  has_discount: !!it.has_discount,

  qty: Number(it.quantity ?? it.qty ?? 1),
  image_url: it.image_url ?? it.image ?? null,
  size_name: it.size_name ?? it.size ?? null,
  color_name: it.color_name ?? it.color ?? null,
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
        name: it.name, // CHỈ TÊN THẬT
        size: it.size_name, // size tách riêng
        color: it.color_name, // màu tách riêng
        unit_price: it.final_price,
        original_price: it.original_price,
        final_price: it.final_price,
        has_discount: it.has_discount,
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

              const normalized = arr.map((d) => {
  const original = Number(d.price ?? 0);
  const final =
    d.has_discount && d.final_price
      ? Number(d.final_price)
      : original;

  return {
    id: d.id,
    product_id: d.product_id,

    original_price: original,
    final_price: final,
    has_discount: !!d.has_discount,

    quantity: d.quantity ?? 0,
    size_name: d.size?.name ?? null,
    color_name: d.color?.name ?? null,
    image_url:
      (Array.isArray(d.images) && d.images[0]?.full_url) ||
      d.product?.image_url ||
      null,
  };
});


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
          original_price: variant.original_price,
          final_price: variant.final_price,
          has_discount: variant.has_discount,
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
    (s, it) => s + (it.final_price || 0) * (it.qty || 0),
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

  const formatVND = (n) =>
    typeof n === "number"
      ? n.toLocaleString("vi-VN") + "₫"
      : "—";

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
              <Box
                sx={{
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "2px solid #111",
                  pb: 1,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  GIỎ HÀNG
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="text"
                    sx={{ borderRadius: 0, fontSize: 15 }}
                    onClick={() => navigate("/collections")}
                  >
                    Tiếp tục mua sắm
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    onClick={clearCart}
                    disabled={items.length === 0}
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    sx={{ borderRadius: 0, fontSize: 13 }}
                  >
                    Xóa hết
                  </Button>
                </Stack>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  border: "1px solid #e0e0e0",
                  boxShadow: "none",
                }}
              >
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
                      sx={{
                        backgroundColor: "#DD002A",
                        color: "#fff",
                        borderRadius: 0,
                        "&:hover": { backgroundColor: "#c10023" },
                      }}
                      onClick={() => navigate("/collections")}
                    >
                      Xem sản phẩm
                    </Button>
                  </Box>
                ) : (
                  <List disablePadding>
                    {items.map((it, index) => {
                      const sizes = getSizesForItem(it);
                      const colors = getColorsForItem(it);

                      return (
                        <React.Fragment key={it.id ?? index}>
                          <ListItem
                            disableGutters
                            sx={{
                              px: 2,
                              py: 2.5,
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
                                width: 150,
                                height: 150,
                                mr: 2.5,
                                border: "1px solid #ddd",
                                borderRadius: 0,
                              }}
                            />

                            {/* CONTENT */}
                            <Box sx={{ flex: 1 }}>
                              {/* NAME */}
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: 17,
                                
                                  color: "#111",
                                  mb: 0.5,
                                  textTransform: "none",
                                }}
                              >
                                {it.name}
                              </Typography>

                              {/* SIZE + COLOR TEXT */}
                              <Typography
                                variant="body2"
                                sx={{ color: "#666", mb: 1 }}
                              >
                                {it.size_name && <>Size: {it.size_name} · </>}
                                {it.color_name && <>Màu: {it.color_name}</>}
                              </Typography>

                              {/* PRICE */}
                              <Box sx={{ mb: 1.5 }}>
  {it.has_discount ? (
    <>
      <Typography
        sx={{
          fontSize: 16,
          textDecoration: "line-through",
          color: "#999",
          lineHeight: 1.2,
        }}
      >
        {formatVND(it.original_price)}
      </Typography>

      <Typography
        sx={{
          fontSize: 20,
          fontWeight: 700,
          color: "secondary.main",
          lineHeight: 1.2,
        }}
      >
        {formatVND(it.final_price)}
      </Typography>
    </>
  ) : (
    <Typography
      sx={{
        fontSize: 14,
        fontWeight: 700,
        color: "#111",
      }}
    >
      {formatVND(it.final_price)}
    </Typography>
  )}
</Box>


                              {/* SIZE / COLOR SELECTORS (CHIP STYLE) */}
                              <Box sx={{ display: "flex", gap: 4, mb: 1.5 }}>
                                {/* Size chips */}
                                <Box>
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      color: "#666",
                                      mb: 0.5,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Size
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    {sizes.map((size) => {
                                      const selected = size === it.size_name;
                                      const disabled = !hasStockForSize(
                                        it.product_id,
                                        size
                                      );

                                      return (
                                        <Chip
                                          key={size}
                                          label={size}
                                          size="small"
                                          clickable={!disabled}
                                          disabled={disabled}
                                          onClick={() =>
                                            !disabled &&
                                            handleChangeSize(it, size)
                                          }
                                          sx={{
                                            borderRadius: 0,
                                            border: "1px solid #bbb",
                                            fontSize: 11,
                                            height: 26,
                                            px: 1.5,
                                            backgroundColor: selected
                                              ? "#111"
                                              : "#fff",
                                            color: selected ? "#fff" : "#111",
                                            "&.Mui-disabled": {
                                              opacity: 0.4,
                                              borderStyle: "dashed",
                                            },
                                            "&:hover": {
                                              backgroundColor: selected
                                                ? "#111"
                                                : "#f5f5f5",
                                            },
                                          }}
                                        />
                                      );
                                    })}
                                  </Box>
                                </Box>

                                {/* Color chips */}
                                <Box>
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      color: "#666",
                                      mb: 0.5,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Màu
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    {colors.map((color) => {
                                      const selected =
                                        color === it.color_name;
                                      const disabled = !hasStockForSizeColor(
                                        it.product_id,
                                        it.size_name,
                                        color
                                      );

                                      return (
                                        <Chip
                                          key={color}
                                          label={color}
                                          size="small"
                                          clickable={!disabled}
                                          disabled={disabled}
                                          onClick={() =>
                                            !disabled &&
                                            handleChangeColor(it, color)
                                          }
                                          sx={{
                                            borderRadius: 0,
                                            border: "1px solid #bbb",
                                            fontSize: 11,
                                            height: 26,
                                            px: 1.5,
                                            backgroundColor: selected
                                              ? "#111"
                                              : "#fff",
                                            color: selected ? "#fff" : "#111",
                                            "&.Mui-disabled": {
                                              opacity: 0.4,
                                              borderStyle: "dashed",
                                            },
                                            "&:hover": {
                                              backgroundColor: selected
                                                ? "#111"
                                                : "#f5f5f5",
                                            },
                                          }}
                                        />
                                      );
                                    })}
                                  </Box>
                                </Box>
                              </Box>

                              {/* QTY + DELETE */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  mt: 1,
                                }}
                              >
                                {/* QTY CONTROL */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() => subQty(it.id)}
                                  >
                                    <RemoveCircleOutlineIcon fontSize="small" />
                                  </IconButton>

                                  <TextField
                                    value={it.qty}
                                    size="small"
                                    onChange={(e) =>
                                      updateQty(it.id, e.target.value)
                                    }
                                    sx={{
                                      width: 60,
                                      "& input": {
                                        textAlign: "center",
                                        fontSize: 13,
                                      },
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 0,
                                        height: 32,
                                      },
                                    }}
                                  />

                                  <IconButton
                                    size="small"
                                    onClick={() => addQty(it.id)}
                                  >
                                    <AddCircleOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Box>

                                {/* DELETE */}
                                <Button
                                  variant="text"
                                  color="error"
                                  onClick={() => removeItem(it.id)}
                                  sx={{
                                    fontSize: 12,
                                    borderRadius: 0,
                                    textTransform: "none",
                                    minWidth: "auto",
                                    px: 0,
                                  }}
                                  startIcon={
                                    <DeleteOutlineIcon fontSize="small" />
                                  }
                                >
                                  Xóa
                                </Button>
                              </Box>
                            </Box>
                          </ListItem>
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Right: Summary */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  position: "sticky",
                  top: 24,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid #e0e0e0",
                    backgroundColor: "#f7f7f7",
                    boxShadow: "none",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      mb: 1,
                    }}
                  >
                    Tóm tắt đơn hàng
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">Tạm tính</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatVND(subtotal)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2">Phí vận chuyển</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {/* Phí ship xử lý bên PaymentPage, ở đây chỉ hiển thị gợi ý */}
                      Sẽ tính ở bước sau
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 700, letterSpacing: 0.3 }}
                    >
                      Tổng tạm tính
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 700, fontSize: 16 }}
                    >
                      {formatVND(subtotal)}
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleCheckout}
                    disabled={items.length === 0}
                    sx={{
                      borderRadius: 0,
                      backgroundColor: "#DD002A",
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      textTransform: "none",
                      mb: 1.5,
                      "&:hover": { backgroundColor: "#c10023" },
                    }}
                  >
                    Đặt hàng
                  </Button>

                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontSize: 11 }}
                  >
                    Phương thức thanh toán hiện tại: Thanh toán khi nhận hàng
                    (COD). 
                  </Typography>
                </Paper>
              </Box>
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
