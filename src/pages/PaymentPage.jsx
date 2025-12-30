// src/pages/PaymentPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Stack,
  Button,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

// 🎨 UI STYLE — KHÔNG ĐỤNG LOGIC
const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    primary: { main: "#DD002A", contrastText: "#fff" }, // 🔥 nút đỏ Uniqlo
    text: { primary: "#111", secondary: "#555" },
  },
  shape: { borderRadius: 0 }, // Uniqlo ít bo góc
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
    h6: { fontWeight: 700 },
    h5: { fontWeight: 800 },
    body2: { fontSize: 13 },
  },
});

function formatVND(n) {
  if (n == null || Number.isNaN(Number(n))) return "Liên hệ";
  return Number(n).toLocaleString("vi-VN") + "₫";
}

export default function PaymentPage() {
  const navigate = useNavigate();

  // CART FROM STORAGE (NOT CHANGED)
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("cart") || "[]";
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });
  const DISCOUNT_KEY="cart_discount";
  const [discount, setDiscount] = useState(() => {
  try {
    const raw = localStorage.getItem(DISCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
});


  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState(null);

  // FORM DATA (NOT CHANGED)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // PAYMENT
  const [paymentMethod, setPaymentMethod] = useState("cod");
  

  const SHIPPING_FEE = 30000;

  const subtotal = useMemo(() => {
  return cart.reduce((s, it) => {
    const unit =
      Number(it.final_price ?? it.unit_price) || 0;
    const qty = Number(it.quantity || 1);
    return s + unit * qty;
  }, 0);
}, [cart]);


  const discountAmount = Number(discount?.amount_discount ?? 0);
  const subtotalAfterDiscount = discount?.total_after_discount !=null
  ?Number(discount.total_after_discount):subtotal;
  const total =subtotalAfterDiscount + SHIPPING_FEE;

  // Validation (NOT CHANGED)
  const validateForm = () => {
    if (!name.trim()) return "Vui lòng nhập họ tên người nhận.";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "Email không hợp lệ.";
    if (!phone || phone.trim().length < 6) return "Số điện thoại không hợp lệ.";
    if (!address || address.trim().length < 6) return "Vui lòng nhập địa chỉ giao hàng.";

  

    return null;
  };

  // Create Order (NOT CHANGED)
  const handlePlaceOrder = async () => {
  const v = validateForm();
  if (v) {
    setSnack({ severity: "error", message: v });
    return;
  }

  setSubmitting(true);
  const discountId = discount?.discount?.id ?? discount?.id ?? null;


  try {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("access_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // ✅ COD: tạo đơn luôn (giữ như bạn đang chạy OK)
    if (paymentMethod === "cod") {
      const orderRes = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
  customer: { name, email, phone, address },
  items: cart,
  payment: { method: "cod" },

  // ✅ BẮT BUỘC để BE biết dùng mã nào
  discount_id: discountId,

  // ✅ ĐÚNG key: total_after_discount / total
  totals: {
    subtotal,
    total_after_discount: subtotalAfterDiscount,
    shipping: SHIPPING_FEE,
    total,
  },

  // optional, không bắt buộc nhưng giữ cũng được
  discount: discount
    ? {
        code: discount?.discount?.code || discount?.code,
        amount_discount: discountAmount,
      }
    : null,
}),

      });

      const orderBody = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderBody?.message || "Tạo đơn thất bại");

      localStorage.removeItem("cart");
      localStorage.removeItem(DISCOUNT_KEY); // ✅ xoá mã giảm giá luôn
      // ✅ BE trả { message, order } nên id nằm trong order
      navigate(`/order/${orderBody?.order?.id}`);

      return;
    }

    // ✅ BANKING/VNPAY: KHÔNG tạo đơn tại đây
    // 1) lưu draft để return page tạo đơn sau khi thanh toán thành công
    localStorage.setItem(
      "pending_checkout",
      JSON.stringify({
        customer: { name, email, phone, address },
        items: cart,
        payment: { method: "Banking" }, // ✅ đúng như BE đang accept
        totals: {
  subtotal,
  total_after_discount: subtotalAfterDiscount,
  shipping: SHIPPING_FEE,
  total,
},
discount_id: discountId,

        createdAt: Date.now(),
      })
    );

    // 2) tạo link VNPay (BE của bạn public route, chỉ cần amount)
    const payRes = await fetch(`${API_BASE}/api/vnpay_create_payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total }),
    });

    const payBody = await payRes.json();
    if (!payRes.ok || !payBody?.payment_url) {
      throw new Error(payBody?.message || "Không tạo được link thanh toán");
    }

    // 3) redirect sang VNPay
    window.location.href = payBody.payment_url;
  } catch (err) {
    setSnack({ severity: "error", message: err.message || "Có lỗi xảy ra" });
  } finally {
    setSubmitting(false);
  }
};




  // ------------------- UI RENDER -------------------
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          backgroundColor: "background.default",
          pb: 8,
          pt: 4,
          minHeight: "90vh",
        }}
      >
        <Container maxWidth="lg">
          {/* PAGE TITLE */}
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, mb: 3, letterSpacing: 0.5 }}
          >
            THANH TOÁN
          </Typography>

          <Grid container spacing={4}>
            {/* LEFT FORM */}
            <Grid item xs={12} md={7}>
              <Paper
                sx={{
                  p: 3,
                  border: "1px solid #e5e5e5",
                  boxShadow: "none",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Thông tin giao hàng
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    label="Họ và tên"
                    value={name}
                    fullWidth
                    onChange={(e) => setName(e.target.value)}
                    InputProps={{ sx: { borderRadius: 0 } }}
                  />
                  <TextField
                    label="Email"
                    value={email}
                    fullWidth
                    onChange={(e) => setEmail(e.target.value)}
                    InputProps={{ sx: { borderRadius: 0 } }}
                  />
                  <TextField
                    label="Số điện thoại"
                    value={phone}
                    fullWidth
                    onChange={(e) => setPhone(e.target.value)}
                    InputProps={{ sx: { borderRadius: 0 } }}
                  />
                  <TextField
                    label="Địa chỉ"
                    value={address}
                    fullWidth
                    multiline
                    minRows={2}
                    onChange={(e) => setAddress(e.target.value)}
                    InputProps={{ sx: { borderRadius: 0 } }}
                  />

                  <Divider />

                  {/* PAYMENT METHOD */}
                  <Typography variant="h6">Phương thức thanh toán</Typography>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <FormControlLabel
                      value="cod"
                      control={<Radio />}
                      label="Thanh toán khi nhận hàng (COD)"
                    />
                    <FormControlLabel
                      value="Banking"
                      control={<Radio />}
                      label="Thanh toán bằng thẻ"
                    />
                  </RadioGroup>

                  {/* BUTTONS */}
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
                    <Button variant="outlined" sx={{ borderRadius: 0 }} onClick={() => navigate(-1)}>
                      Quay lại
                    </Button>

                    <Button
                      variant="contained"
                      sx={{
                        borderRadius: 0,
                        px: 3,
                        fontWeight: 700,
                        backgroundColor: "#DD002A",
                        "&:hover": { backgroundColor: "#c10023" },
                      }}
                      disabled={submitting}
                      onClick={handlePlaceOrder}
                    >
                      {submitting ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        `Đặt hàng — ${formatVND(total)}`
                      )}
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* RIGHT SUMMARY */}
            <Grid item xs={12} md={5}>
              <Paper
                sx={{
                  p: 2.5,
                  border: "1px solid #e5e5e5",
                  boxShadow: "none",
                  backgroundColor: "#f7f7f7",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Tóm tắt đơn hàng
                </Typography>

                {cart.length === 0 ? (
                  <Typography>Giỏ hàng trống.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {cart.map((it) => (
                      <Box
                        key={it.id}
                        sx={{
                          display: "flex",
                          borderBottom: "1px solid #eee",
                          pb: 2,
                        }}
                      >
                        <Box
                          component="img"
                          src={it.image_url}
                          sx={{
                            width: 90,
                            height: 90,
                            objectFit: "cover",
                            border: "1px solid #ddd",
                            mr: 2,
                          }}
                        />

                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {it.name}
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: "#666" }}>
                            Size: {it.size_name || it.size} — Màu: {it.color_name || it.color}
                          </Typography>
                          <Typography sx={{ fontSize: 13 }}>
                            Số lượng: {it.quantity}
                          </Typography>
                        </Box>

                        <Box sx={{ textAlign: "right" }}>
  {it.has_discount && (
    <Typography
      sx={{
        fontSize: 12,
        textDecoration: "line-through",
        color: "#999",
      }}
    >
      {formatVND(it.original_price * it.quantity)}
    </Typography>
  )}

  <Typography sx={{ fontWeight: 700 }}>
    {formatVND(
      (it.final_price ?? it.unit_price) * it.quantity
    )}
  </Typography>
</Box>

                      </Box>
                    ))}

                    <Divider />

                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography>Giá</Typography>
                      <Typography>{formatVND(subtotal)}</Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography>Phí vận chuyển</Typography>
                      <Typography>{formatVND(SHIPPING_FEE)}</Typography>
                    </Box>
                    <Box sx={{ display:"flex", justifyContent:"space-between" }}>
                      <Typography>Giảm giá</Typography>
                      <Typography>{discount ? `- ${formatVND(discountAmount)}` : "-"}</Typography>
                    </Box>

                    <Divider />

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Tổng cộng
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {formatVND(total)}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
            {snack ? (
              <Alert severity={snack.severity} onClose={() => setSnack(null)}>
                {snack.message}
              </Alert>
            ) : null}
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
