// src/pages/user/AccountPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { createTheme, ThemeProvider } from "@mui/material/styles";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import LockIcon from "@mui/icons-material/Lock";

import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    primary: { main: "#000000", contrastText: "#fff" },
    text: { primary: "#111", secondary: "#666" },
  },
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
  },
  shape: { borderRadius: 0 },
});

// helper
function a11yProps(index) {
  return {
    id: `account-section-${index}`,
    "aria-controls": `account-panel-${index}`,
  };
}

// HÀM XỬ LÝ ẢNH CHUẨN CHO ORDER DETAIL
const getProductImage = (product, images) => {
  const base = "http://127.0.0.1:8000/storage/";

  // 1) Ưu tiên ảnh chi tiết full_url từ backend
  if (images && images[0] && images[0].full_url) return images[0].full_url;

  // 2) Nếu backend trả url_image (chưa phải full URL)
  if (images && images[0] && images[0].url_image) {
    return base + images[0].url_image;
  }

  // 3) Nếu product có ảnh đại diện → fallback
  if (product && product.image_url) {
    return product.image_url.startsWith("http")
      ? product.image_url
      : base + product.image_url;
  }

  // 4) Không có ảnh → trả rỗng
  return "";
};

export default function AccountPage() {
  const navigate = useNavigate();

  // user từ localStorage
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [section, setSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState(null);

  // profile
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // shipping addresses
  const [addresses, setAddresses] = useState([]);

  // form đổi mật khẩu
  const [pwd, setPwd] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // dialog chi tiết đơn hàng
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  const sanitizePhone = (value) => {
    if (!value) return "";
    return value.replace(/\D/g, "").slice(0, 10);
  };

  // init form
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: sanitizePhone(user.phone ?? ""),
        password: user.password ?? "",
      });
    }
  }, [user]);

  // fetch orders
  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setOrders([]);
        setLoadingOrders(false);
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${API_BASE}/api/my-orders`, { headers });

      const text = await res.text().catch(() => "");
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        setOrders([]);
        return;
      }

      const list = Array.isArray(parsed)
        ? parsed
        : parsed?.data ?? parsed?.orders ?? [];
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  const fetchAddresses = useCallback(() => {
    try {
      const raw = localStorage.getItem("addresses") || "[]";
      setAddresses(JSON.parse(raw));
    } catch {
      setAddresses([]);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (user && token) {
      fetchOrders();
      fetchAddresses();
    }
  }, [user, fetchAddresses]);

  // save profile
  const handleSaveProfile = async () => {
    setSaving(true);

    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setSnack({ severity: "error", message: "Email không hợp lệ." });
      setSaving(false);
      return;
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setSnack({
        severity: "error",
        message: "Số điện thoại phải đủ 10 chữ số.",
      });
      setSaving(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const payload = { ...form };
      delete payload.password; // không cập nhật mật khẩu chung với profile

      const res = await fetch(`${API_BASE}/api/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setSnack({ severity: "error", message: "Lỗi cập nhật." });
      } else {
        const updated = await res.json();
        localStorage.setItem("user", JSON.stringify(updated));
        setUser(updated);
        setSnack({ severity: "success", message: "Cập nhật thành công." });
      }
    } catch {
      setSnack({ severity: "error", message: "Lỗi mạng." });
    }

    setSaving(false);
  };

  // đổi mật khẩu
  const handleChangePassword = async () => {
    if (!pwd.old_password || !pwd.new_password) {
      setSnack({
        severity: "error",
        message: "Vui lòng nhập đủ thông tin.",
      });
      return;
    }

    if (pwd.new_password !== pwd.confirm_password) {
      setSnack({
        severity: "error",
        message: "Mật khẩu mới và xác nhận không khớp.",
      });
      return;
    }

    const token = localStorage.getItem("access_token");

    const res = await fetch(`${API_BASE}/api/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: pwd.old_password,
        new_password: pwd.new_password,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setSnack({ severity: "success", message: "Đổi mật khẩu thành công!" });
      setPwd({ old_password: "", new_password: "", confirm_password: "" });
    } else {
      setSnack({
        severity: "error",
        message: data.message || "Lỗi đổi mật khẩu",
      });
    }
  };

  // mở dialog chi tiết đơn hàng
  const handleOpenOrderDetail = async (id) => {
    try {
      setLoadingOrderDetail(true);
      setOrderDetail(null);
      setOpenOrderDialog(true);

      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/orders/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setSnack({
          severity: "error",
          message: data.message || "Không tải được chi tiết đơn hàng.",
        });
        setOpenOrderDialog(false);
        return;
      }

      setOrderDetail(data);
    } catch (err) {
      setSnack({
        severity: "error",
        message: "Lỗi kết nối khi tải chi tiết đơn hàng.",
      });
      setOpenOrderDialog(false);
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleCloseOrderDialog = () => {
    setOpenOrderDialog(false);
    setOrderDetail(null);
  };

  // logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const greetingName =
    user?.name || (user?.email ? user.email.split("@")[0] : "Bạn");

  // ============================================================
  // ===================== UI (UNIQLO STYLE) =====================
  // ============================================================

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ backgroundColor: "#fff", py: 5 }}>
        <Container maxWidth="lg" sx={{ maxWidth: "1080px !important", px: 2 }}>
          <Grid container spacing={4}>
            {/* LEFT SIDEBAR */}
            <Grid item xs={12} md={3}>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
                  Xin chào, {greetingName}!
                </Typography>

                <Button
                  onClick={handleLogout}
                  sx={{
                    mt: 1,
                    p: 0,
                    minWidth: "auto",
                    color: "#000",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: "underline",
                  }}
                  startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
                >
                  Đăng xuất
                </Button>
              </Box>

              <Paper
                sx={{
                  borderRadius: 0,
                  border: "1px solid #e0e0e0",
                }}
              >
                <List disablePadding>
                  {[
                    ["Thông Tin Cá Nhân", 0, <PersonOutlineIcon />],
                    ["Lịch Sử Đặt Hàng", 1, <ShoppingBagIcon />],
                    ["Thông Tin Giao Hàng", 2, <LocalShippingIcon />],
                    ["Đăng Ký Nhận Tin", 3, <MailOutlineIcon />],
                    ["Đổi Mật Khẩu", 4, <LockIcon />],
                  ].map(([label, index, icon]) => (
                    <React.Fragment key={index}>
                      <ListItem disablePadding>
                        <ListItemButton
                          selected={section === index}
                          onClick={() => setSection(index)}
                          sx={{
                            py: 2,
                            "&.Mui-selected": {
                              backgroundColor: "#f5f5f5",
                            },
                          }}
                        >
                          <ListItemIcon>{icon}</ListItemIcon>
                          <ListItemText primary={label} />
                        </ListItemButton>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* RIGHT CONTENT */}
            <Grid item xs={12} md={9}>
              <Paper
                sx={{
                  p: 4,
                  borderRadius: 0,
                  border: "1px solid #e0e0e0",
                }}
              >
                {/* SECTION 0: PROFILE */}
                {section === 0 && (
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 22,
                        fontWeight: 700,
                        mb: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      Thông Tin Cá Nhân
                    </Typography>

                    <Stack spacing={3} sx={{ maxWidth: 420 }}>
                      <TextField
                        label="Email"
                        fullWidth
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        InputProps={{ sx: { height: 42 } }}
                      />

                      <TextField
                        label="Họ & Tên"
                        fullWidth
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        InputProps={{ sx: { height: 42 } }}
                      />

                      <TextField
                        label="Số điện thoại"
                        fullWidth
                        value={form.phone}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phone: sanitizePhone(e.target.value),
                          })
                        }
                        InputProps={{ sx: { height: 42 } }}
                      />
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      sx={{
                        mt: 4,
                        backgroundColor: "#000",
                        px: 5,
                        py: 1.5,
                        fontWeight: 700,
                        "&:hover": { backgroundColor: "#222" },
                      }}
                    >
                      {saving ? (
                        <CircularProgress size={20} sx={{ color: "#fff" }} />
                      ) : (
                        "LƯU THAY ĐỔI"
                      )}
                    </Button>
                  </Box>
                )}

                {/* SECTION 1: ORDER HISTORY */}
                {section === 1 && (
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 22,
                        fontWeight: 700,
                        mb: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      Lịch Sử Đặt Hàng
                    </Typography>

                    {loadingOrders ? (
                      <CircularProgress />
                    ) : orders.length === 0 ? (
                      <Typography>Chưa có đơn hàng nào.</Typography>
                    ) : (
                      <Stack spacing={3}>
                        {orders.map((o) => {
                          const formattedDate = o.created_at
                            ? new Date(o.created_at).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—";

                          const statusColors = {
                            pending: "#1976d2",
                            confirmed: "#0288d1",
                            shipping: "#f57c00",
                            completed: "#2e7d32",
                            cancelled: "#d32f2f",
                            returned: "#6d4c41",
                          };

                          const statusColor = statusColors[o.status] || "#333";

                          return (
                            <Paper
                              key={o.id}
                              sx={{
                                p: 3,
                                border: "1px solid #ddd",
                                borderRadius: 0,
                                backgroundColor: "#fafafa",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: 18,
                                  mb: 1,
                                }}
                              >
                                Đơn hàng #{o.id}
                              </Typography>

                              {o.order_code && (
                                <Typography
                                  variant="body2"
                                  sx={{ mb: 1, color: "#777" }}
                                >
                                  Mã đơn: {o.order_code}
                                </Typography>
                              )}

                              <Divider sx={{ mb: 2 }} />

                              <Typography sx={{ mb: 1 }}>
                                <strong>Trạng thái:</strong>{" "}
                                <span
                                  style={{
                                    color: statusColor,
                                    fontWeight: 600,
                                  }}
                                >
                                  {o.status}
                                </span>
                              </Typography>

                              <Typography sx={{ mb: 1 }}>
                                <strong>Tổng tiền:</strong>{" "}
                                <span style={{ fontWeight: 700 }}>
                                  {o.total_price
                                    ? Number(o.total_price).toLocaleString(
                                        "vi-VN"
                                      ) + "₫"
                                    : "—"}
                                </span>
                              </Typography>

                              <Typography sx={{ mb: 1 }}>
                                <strong>Thanh toán:</strong>{" "}
                                {o.payment_method || "—"}
                              </Typography>

                              <Typography sx={{ mb: 2 }}>
                                <strong>Ngày đặt:</strong> {formattedDate}
                              </Typography>

                              <Button
                                variant="outlined"
                                onClick={() => handleOpenOrderDetail(o.id)}
                                sx={{
                                  borderRadius: 0,
                                  px: 3,
                                  fontWeight: 600,
                                }}
                              >
                                XEM CHI TIẾT
                              </Button>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* SECTION 2: SHIPPING INFO */}
                {section === 2 && (
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 22,
                        fontWeight: 700,
                        mb: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      Thông Tin Giao Hàng
                    </Typography>

                    {addresses.length === 0 ? (
                      <Typography>
                        Chưa có địa chỉ nào. Hãy lưu địa chỉ của bạn trong phần
                        hồ sơ hoặc khi đặt hàng.
                      </Typography>
                    ) : (
                      <Stack spacing={2}>
                        {addresses.map((a, idx) => (
                          <Paper
                            key={idx}
                            sx={{ p: 2, border: "1px solid #ddd" }}
                          >
                            <Typography sx={{ fontWeight: 700 }}>
                              {a.name ?? `Địa chỉ ${idx + 1}`}
                            </Typography>
                            <Typography>{a.address}</Typography>
                            {a.phone && (
                              <Typography>Điện thoại: {a.phone}</Typography>
                            )}
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* SECTION 3: NEWSLETTER */}
                {section === 3 && (
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 22,
                        fontWeight: 700,
                        mb: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      Đăng Ký Nhận Tin
                    </Typography>

                    <Typography sx={{ mb: 2 }}>
                      Nhận email về khuyến mãi & sản phẩm mới.
                    </Typography>

                    <Stack spacing={2} sx={{ maxWidth: 400 }}>
                      <TextField
                        placeholder="Nhập email"
                        fullWidth
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />

                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: "#000",
                          px: 4,
                          py: 1.3,
                          fontWeight: 700,
                          borderRadius: 0,
                        }}
                        onClick={() =>
                          setSnack({
                            severity: "success",
                            message: "Đã đăng ký (demo).",
                          })
                        }
                      >
                        Đăng ký
                      </Button>
                    </Stack>
                  </Box>
                )}

                {/* SECTION 4: CHANGE PASSWORD */}
                {section === 4 && (
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 22,
                        fontWeight: 700,
                        mb: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      Đổi Mật Khẩu
                    </Typography>

                    <Stack spacing={3} sx={{ maxWidth: 420 }}>
                      <TextField
                        label="Mật khẩu hiện tại"
                        type="password"
                        fullWidth
                        value={pwd.old_password}
                        onChange={(e) =>
                          setPwd({ ...pwd, old_password: e.target.value })
                        }
                      />

                      <TextField
                        label="Mật khẩu mới"
                        type="password"
                        fullWidth
                        value={pwd.new_password}
                        onChange={(e) =>
                          setPwd({ ...pwd, new_password: e.target.value })
                        }
                      />

                      <TextField
                        label="Xác nhận mật khẩu mới"
                        type="password"
                        fullWidth
                        value={pwd.confirm_password}
                        onChange={(e) =>
                          setPwd({ ...pwd, confirm_password: e.target.value })
                        }
                      />
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={handleChangePassword}
                      sx={{
                        mt: 4,
                        backgroundColor: "#000",
                        px: 5,
                        py: 1.5,
                        fontWeight: 700,
                        "&:hover": { backgroundColor: "#222" },
                      }}
                    >
                      ĐỔI MẬT KHẨU
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* DIALOG CHI TIẾT ĐƠN HÀNG */}
        <Dialog
          open={openOrderDialog}
          onClose={handleCloseOrderDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {orderDetail
              ? `Chi tiết đơn hàng #${orderDetail.id}`
              : "Chi tiết đơn hàng"}
          </DialogTitle>
          <DialogContent dividers>
            {loadingOrderDetail && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!loadingOrderDetail && orderDetail && (
              <Box>
                {/* Thông tin chung */}
                <Box sx={{ mb: 2 }}>
                  {orderDetail.order_code && (
                    <Typography sx={{ mb: 0.5 }}>
                      <strong>Mã đơn:</strong> {orderDetail.order_code}
                    </Typography>
                  )}
                  <Typography sx={{ mb: 0.5 }}>
                    <strong>Trạng thái:</strong> {orderDetail.status}
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <strong>Người nhận:</strong> {orderDetail.name}
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <strong>SĐT:</strong> {orderDetail.phone}
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <strong>Địa chỉ:</strong> {orderDetail.address}
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <strong>Thanh toán:</strong>{" "}
                    {orderDetail.payment_method}
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <strong>Ngày đặt:</strong>{" "}
                    {orderDetail.created_at
                      ? new Date(orderDetail.created_at).toLocaleString(
                          "vi-VN"
                        )
                      : "—"}
                  </Typography>
                  {orderDetail.note && (
                    <Typography sx={{ mt: 0.5 }}>
                      <strong>Ghi chú:</strong> {orderDetail.note}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Sản phẩm */}
                <Typography
                  sx={{ fontWeight: 700, mb: 2, textTransform: "uppercase" }}
                >
                  Sản phẩm
                </Typography>

                <Stack spacing={2}>
                  {(orderDetail.items || []).map((item) => {
                    const pd =
                      item.product_detail || item.productDetail || {};
                    const product = pd.product || {};
                    const color = pd.color || {};
                    const size = pd.size || {};
                    const images = pd.images || [];

                    const imgUrl = getProductImage(product, images);

                    const lineTotal =
                      (item.price || 0) * (item.quantity || 0);

                    return (
                      <Paper
                        key={item.id}
                        sx={{
                          p: 2,
                          display: "flex",
                          gap: 2,
                          border: "1px solid #eee",
                        }}
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.name || "Sản phẩm"}
                            style={{
                              width: 90,
                              height: 90,
                              objectFit: "cover",
                              border: "1px solid #eee",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 90,
                              height: 90,
                              border: "1px solid #eee",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              color: "#999",
                            }}
                          >
                            No image
                          </Box>
                        )}

                        <Box>
                          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                            {product.name || "Sản phẩm"}
                          </Typography>
                          {color.name && (
                            <Typography variant="body2">
                              Màu: {color.name}
                            </Typography>
                          )}
                          {size.name && (
                            <Typography variant="body2">
                              Size: {size.name}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            Giá:{" "}
                            {item.price
                              ? Number(item.price).toLocaleString("vi-VN") +
                                "₫"
                              : "—"}{" "}
                            × {item.quantity}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, mt: 0.5 }}
                          >
                            Thành tiền:{" "}
                            {lineTotal
                              ? lineTotal.toLocaleString("vi-VN") + "₫"
                              : "—"}
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })}

                  {(!orderDetail.items ||
                    orderDetail.items.length === 0) && (
                    <Typography>
                      Đơn hàng chưa có dữ liệu sản phẩm.
                    </Typography>
                  )}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography
                  sx={{ fontWeight: 700, fontSize: 18, textAlign: "right" }}
                >
                  Tổng đơn:{" "}
                  {orderDetail.total_price
                    ? Number(orderDetail.total_price).toLocaleString(
                        "vi-VN"
                      ) + "₫"
                    : "—"}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseOrderDialog}>Đóng</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!snack}
          autoHideDuration={3000}
          onClose={() => setSnack(null)}
        >
          {snack && (
            <Alert severity={snack.severity} onClose={() => setSnack(null)}>
              {snack.message}
            </Alert>
          )}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
