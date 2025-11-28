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
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

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

function formatVND(n) {
  if (n == null || Number.isNaN(Number(n))) return "Liên hệ";
  return Number(n).toLocaleString("vi-VN") + "₫";
}

export default function PaymentPage() {
  const navigate = useNavigate();

  // cart from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("cart") || "[]";
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  const [loadingCart, setLoadingCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState(null);

  // shipping / billing form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // payment method: 'cod' or 'card'
  const [paymentMethod, setPaymentMethod] = useState("cod");

  // card details (only basic client-side)
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // shipping fee (fixed for demo, you can compute dynamically)
  const SHIPPING_FEE = 30000;

  // helper: mask card number for logs, avoid storing sensitive data
  const maskCardNumber = (num) => {
    if (!num) return null;
    const s = String(num).replace(/\s+/g, "");
    if (s.length <= 4) return "*".repeat(s.length);
    return "*".repeat(Math.max(0, s.length - 4)) + s.slice(-4);
  };

  // helper: append error logs to localStorage (keep last 50)
  const appendErrorLog = (entry) => {
    try {
      const raw = localStorage.getItem("payment_error_logs") || "[]";
      const arr = JSON.parse(raw);
      arr.push({ time: new Date().toISOString(), ...entry });
      localStorage.setItem("payment_error_logs", JSON.stringify(arr.slice(-50)));
    } catch {}
  };

  const subtotal = useMemo(() => {
    return cart.reduce((s, it) => {
      const unit = it.unit_price != null ? Number(it.unit_price) : 0;
      const qty = Number(it.quantity || 1);
      return s + (isNaN(unit) ? 0 : unit * qty);
    }, 0);
  }, [cart]);

  const total = subtotal > 0 ? subtotal + SHIPPING_FEE : 0;

  useEffect(() => {
    // optional: prefill user info if logged in
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u) {
          if (!name && (u.name || u.fullname)) setName(u.name || u.fullname);
          if (!email && u.email) setEmail(u.email);
          if (!phone && u.phone) setPhone(u.phone);
        }
      }
    } catch {}
  }, []); // run once

  const validateForm = () => {
    if (!name.trim()) return "Vui lòng nhập họ tên người nhận.";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "Email không hợp lệ.";
    if (!phone || phone.trim().length < 6) return "Số điện thoại không hợp lệ.";
    if (!address || address.trim().length < 6) return "Vui lòng nhập địa chỉ giao hàng.";
    if (!cart || cart.length === 0) return "Giỏ hàng rỗng.";
    if (paymentMethod === "card") {
      if (!/^\d{12,19}$/.test(cardNumber.replace(/\s+/g, ""))) return "Số thẻ không hợp lệ.";
      if (!cardName.trim()) return "Tên trên thẻ không được để trống.";
      if (!/^\d{3,4}$/.test(cardCvc)) return "CVC không hợp lệ.";
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return "Ngày hết hạn phải theo định dạng MM/YY.";
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    const v = validateForm();
    if (v) {
      setSnack({ severity: "error", message: v });
      return;
    }
    setSubmitting(true);

    // Prepare payload - adapt to your backend shape
    const payload = {
      customer: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      },
      items: cart.map((it) => ({
        product_id: it.id,
        quantity: it.quantity || 1,
        unit_price: it.unit_price || null,
      })),
      payment: {
        method: paymentMethod, // 'cod' or 'card'
        // for 'card' we send minimal info (in real app use gateway tokenization)
        card: paymentMethod === "card" ? {
          number: cardNumber.replace(/\s+/g, ""),
          name: cardName,
          expiry: cardExpiry,
          cvc: cardCvc,
        } : null,
      },
      totals: {
        subtotal,
        shipping: SHIPPING_FEE,
        total,
      },
    };

    // create a redacted copy for logging (never store full card number/cvc)
    const payloadMasked = JSON.parse(JSON.stringify(payload));
    if (payloadMasked.payment && payloadMasked.payment.card) {
      payloadMasked.payment.card.number = maskCardNumber(payloadMasked.payment.card.number);
      payloadMasked.payment.card.cvc = payloadMasked.payment.card.cvc ? "***" : null;
    }

    try {
      console.debug("Placing order payload (masked):", payloadMasked);
      const token = localStorage.getItem("access_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // call backend - adjust endpoint if needed
      const res = await fetch(`${API_BASE}/api/orders`, { 
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = null; }

      if (!res.ok) {
        const msg = (body && (body.message || JSON.stringify(body))) || `Tạo đơn thất bại (${res.status})`;
        console.error("Order API error:", { status: res.status, body, payload: payloadMasked });
        appendErrorLog({ type: "server", status: res.status, body: body || text, payload: payloadMasked });
        setSnack({ severity: "error", message: msg });
        setSubmitting(false);
        return;
      }

      // success - backend may return created order id
      const order = (body && typeof body === "object" && (body.id || body.order_id || body.order)) ? (body.order || body) : body;
      console.info("Order created:", { order, payload: payloadMasked });
      // clear cart
      try { localStorage.removeItem("cart"); } catch {}
      setCart([]);
      setSnack({ severity: "success", message: "Đặt hàng thành công!" });

      // redirect to order details or thank you page
      const orderId = order?.id ?? order?.order_id ?? null;
      setTimeout(() => {
        if (orderId) navigate(`/order/${orderId}`);
        else navigate("/thank-you");
      }, 900);
    } catch (err) {
      console.error("Place order exception:", err, { payload: payloadMasked });
      appendErrorLog({ type: "exception", error: err?.message || String(err), stack: err?.stack, payload: payloadMasked });
      setSnack({ severity: "error", message: "Lỗi khi tạo đơn. Vui lòng thử lại." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "80vh", backgroundColor: "background.default", py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
            Thanh toán
          </Typography>

          <Grid container spacing={3}>
            {/* Left: checkout form */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Thông tin giao hàng
                </Typography>

                <Stack spacing={2}>
                  <TextField label="Họ và tên" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
                  <TextField label="Email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
                  <TextField label="Số điện thoại" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <TextField label="Địa chỉ (đường, phường, quận, thành phố)" fullWidth multiline minRows={2} value={address} onChange={(e) => setAddress(e.target.value)} />

                  <Divider />

                  <Typography variant="h6">Phương thức thanh toán</Typography>
                  <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <FormControlLabel value="cod" control={<Radio />} label="Thanh toán khi nhận hàng (COD)" />
                    <FormControlLabel value="card" control={<Radio />} label="Thanh toán bằng thẻ (thử nghiệm)" />
                  </RadioGroup>

                  {paymentMethod === "card" && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Thông tin thẻ (chỉ demo — đừng dùng thẻ thật)</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField label="Số thẻ" fullWidth value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField label="Tên chủ thẻ" fullWidth value={cardName} onChange={(e) => setCardName(e.target.value)} />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField label="MM/YY" fullWidth value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField label="CVC" fullWidth value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123" />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
                    <Button variant="outlined" onClick={() => navigate(-1)}>Quay lại</Button>
                    <Button variant="contained" onClick={handlePlaceOrder} disabled={submitting}>
                      {submitting ? <CircularProgress size={20} color="inherit" /> : `Đặt hàng — ${formatVND(total)}`}
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Right: order summary */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Tóm tắt đơn hàng</Typography>

                {cart.length === 0 ? (
                  <Typography variant="body2">Giỏ hàng trống.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {cart.map((it) => (
                      <Card key={it.id} variant="outlined" sx={{ display: "flex" }}>
                        <CardContent sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700 }}>{it.name}</Typography>
                          <Typography variant="body2" color="text.secondary">Số lượng: {it.quantity}</Typography>
                        </CardContent>
                        <CardActions sx={{ alignItems: "center", px: 2 }}>
                          <Typography sx={{ fontWeight: 800 }}>{formatVND(it.unit_price != null ? it.unit_price * (it.quantity || 1) : null)}</Typography>
                        </CardActions>
                      </Card>
                    ))}

                    <Divider />

                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography>Subtotal</Typography>
                      <Typography>{formatVND(subtotal)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography>Phí vận chuyển</Typography>
                      <Typography>{formatVND(SHIPPING_FEE)}</Typography>
                    </Box>

                    <Divider />

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Tổng</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{formatVND(total)}</Typography>
                    </Box>
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
