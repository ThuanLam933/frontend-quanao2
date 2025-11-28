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
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LogoutIcon from "@mui/icons-material/Logout";

import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#F7FAFC", paper: "#fff" },
    primary: { main: "#000000", contrastText: "#fff" }, // nút đen
    text: { primary: "#111", secondary: "#666" },
  },
  typography: { fontFamily: "Poppins, Roboto, sans-serif" },
  shape: { borderRadius: 2 },
});

// helper
function a11yProps(index) {
  return { id: `account-section-${index}`, "aria-controls": `account-panel-${index}` };
}

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

  const [section, setSection] = useState(0); // 0: info, 1: orders, 2: shipping, 3: newsletter
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState(null);

  // profile form (KHÔNG còn birthday)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // orders / addresses
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [addresses, setAddresses] = useState([]);

  // chỉ giữ chữ số, dài tối đa 10
  const sanitizePhone = (value) => {
    if (!value) return "";
    const digits = value.replace(/\D/g, "");
    return digits.slice(0, 10);
  };

  // init form theo user
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

  // ====== FETCH ORDERS ======
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
      const url = `${API_BASE}/api/orders`;
      const res = await fetch(url, { headers });

      const text = await res.text().catch(() => "");
      const ct = res.headers.get("content-type") || "";

      let parsed = null;
      if (
        ct.includes("application/json") ||
        text.trim().startsWith("{") ||
        text.trim().startsWith("[")
      ) {
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = null;
        }
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.warn("fetchOrders auth warning:", res.status, parsed || text);
          setSnack({
            severity: "warning",
            message: "Không thể tải đơn hàng: cần đăng nhập hoặc quyền không đủ.",
          });
          setOrders([]);
          return;
        }
        const msg =
          (parsed && (parsed.message || parsed.error)) ||
          `Lỗi khi tải đơn hàng (${res.status})`;
        setSnack({ severity: "error", message: msg });
        setOrders([]);
        return;
      }

      const list = Array.isArray(parsed)
        ? parsed
        : parsed?.data ?? parsed?.orders ?? [];
      const finalList = Array.isArray(list) ? list : [];
      setOrders(finalList);
      try {
        localStorage.setItem("orders_cache", JSON.stringify(finalList));
      } catch {}
    } catch (err) {
      console.error("fetchOrders network error:", err);
      setSnack({ severity: "error", message: "Lỗi mạng khi tải đơn hàng." });
      try {
        const raw = localStorage.getItem("orders_cache") || "[]";
        const cached = JSON.parse(raw);
        setOrders(Array.isArray(cached) ? cached : []);
      } catch {
        setOrders([]);
      }
    } finally {
      setLoadingOrders(false);
    }
  }

  // ====== FETCH ADDRESSES (localStorage demo) ======
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
    } else if (user && !token) {
      setSnack({
        severity: "warning",
        message: "Bạn chưa đăng nhập hoặc token không hợp lệ.",
      });
    }
  }, [user, fetchAddresses]);

  // ====== SAVE PROFILE ======
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
        setSnack({ severity: "error", message: "Email không hợp lệ." });
        setSaving(false);
        return;
      }
      if (form.phone && !/^\d{10}$/.test(form.phone)) {
        setSnack({
          severity: "error",
          message: "Số điện thoại phải đúng 10 chữ số (chỉ gồm số).",
        });
        setSaving(false);
        return;
      }

      const originalUser = user ? { ...user } : null;
      const optimisticUser = { ...(user || {}), ...form };

      setUser(optimisticUser);
      try {
        localStorage.setItem("user", JSON.stringify(optimisticUser));
      } catch {}

      try {
        window.dispatchEvent(new Event("userUpdated"));
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("app-user");
          bc.postMessage({ type: "userUpdated", user: optimisticUser });
          bc.close();
        }
      } catch {}

      if (!navigator.onLine) {
        try {
          const pendingKey = "pending_user_updates";
          const raw = localStorage.getItem(pendingKey) || "[]";
          const arr = JSON.parse(raw);
          arr.push({ at: Date.now(), payload: form, userId: user?.id ?? null });
          localStorage.setItem(pendingKey, JSON.stringify(arr));
        } catch {}
        setSnack({
          severity: "info",
          message:
            "Bạn đang offline — thay đổi đã lưu cục bộ và sẽ đồng bộ khi có mạng.",
        });
        setSaving(false);
        return;
      }

      const token = localStorage.getItem("access_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const url = `${API_BASE}/api/me`;
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(form),
      }).catch((err) => {
        console.error("Network error on profile update:", err);
        return null;
      });

      if (!res) {
        setSnack({
          severity: "info",
          message: "Lỗi mạng — đã lưu cục bộ, sẽ thử đồng bộ sau.",
        });
        setSaving(false);
        return;
      }

      const text = await res.text().catch(() => "");
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }

      if (!res.ok) {
        if (res.status === 404) {
          console.warn("Profile update endpoint not found (404). Keeping local.");
          setSnack({
            severity: "warning",
            message: "Đã lưu cục bộ nhưng server không hỗ trợ cập nhật (404).",
          });
          setSaving(false);
          return;
        }
        const serverMsg =
          (body && (body.message || body.error)) ||
          `Cập nhật thất bại (${res.status})`;

        try {
          if (originalUser)
            localStorage.setItem("user", JSON.stringify(originalUser));
          else localStorage.removeItem("user");
        } catch {}
        setUser(originalUser);
        setSnack({ severity: "error", message: serverMsg });
        setSaving(false);
        return;
      }

      const updatedFromServer =
        body && typeof body === "object" && (body.id || body.email || body.name)
          ? body
          : optimisticUser;

      try {
        localStorage.setItem("user", JSON.stringify(updatedFromServer));
      } catch {}
      setUser(updatedFromServer);

      try {
        window.dispatchEvent(new Event("userUpdated"));
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("app-user");
          bc.postMessage({ type: "userUpdated", user: updatedFromServer });
          bc.close();
        }
      } catch {}

      setSnack({
        severity: "success",
        message: "Cập nhật thông tin thành công.",
      });
    } catch (err) {
      console.error("save profile err:", err);
      try {
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);
        } else {
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch {}
      setSnack({
        severity: "error",
        message: err?.message ?? "Cập nhật thất bại.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ====== LOGOUT ======
  const handleLogout = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      setUser(null);
      setSnack({ severity: "info", message: "Đã đăng xuất." });
      navigate("/login");
    } catch (err) {
      console.warn("logout", err);
      setSnack({ severity: "error", message: "Không thể đăng xuất." });
    }
  };

  const handleGoToOrder = (id) => navigate(`/order/${id}`);

  const fullName = user?.name || "";
  const greetingName =
    fullName || (user?.email ? user.email.split("@")[0] : "Bạn");

  // ============ RENDER ============

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "80vh", backgroundColor: "#fff", py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* LEFT: menu + logout */}
            <Grid item xs={12} md={3}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, textTransform: "capitalize" }}
                >
                  Xin Chào, {greetingName}!
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
                  boxShadow: "none",
                  border: "1px solid #eee",
                }}
              >
                <List disablePadding>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={section === 0}
                      onClick={() => setSection(0)}
                      {...a11yProps(0)}
                      sx={{
                        py: 2,
                        "&.Mui-selected": {
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                    >
                      <ListItemIcon>
                        <PersonOutlineIcon />
                      </ListItemIcon>
                      <ListItemText primary="Thông Tin Cá Nhân" />
                    </ListItemButton>
                  </ListItem>

                  <Divider />

                  <ListItem disablePadding>
                    <ListItemButton
                      selected={section === 1}
                      onClick={() => setSection(1)}
                      {...a11yProps(1)}
                      sx={{
                        py: 2,
                        "&.Mui-selected": {
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                    >
                      <ListItemIcon>
                        <ShoppingBagIcon />
                      </ListItemIcon>
                      <ListItemText primary="Lịch Sử Đặt Hàng" />
                    </ListItemButton>
                  </ListItem>

                  <Divider />

                  <ListItem disablePadding>
                    <ListItemButton
                      selected={section === 2}
                      onClick={() => setSection(2)}
                      {...a11yProps(2)}
                      sx={{
                        py: 2,
                        "&.Mui-selected": {
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                    >
                      <ListItemIcon>
                        <LocalShippingIcon />
                      </ListItemIcon>
                      <ListItemText primary="Thông Tin Giao Hàng" />
                    </ListItemButton>
                  </ListItem>

                  <Divider />

                  <ListItem disablePadding>
                    <ListItemButton
                      selected={section === 3}
                      onClick={() => setSection(3)}
                      {...a11yProps(3)}
                      sx={{
                        py: 2,
                        "&.Mui-selected": {
                          backgroundColor: "#f5f5f5",
                        },
                      }}
                    >
                      <ListItemIcon>
                        <MailOutlineIcon />
                      </ListItemIcon>
                      <ListItemText primary="Đăng Ký Nhận Tin" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            {/* RIGHT: content */}
            <Grid item xs={12} md={9}>
              <Paper
                sx={{
                  p: 4,
                  borderRadius: 0,
                  border: "1px solid #eee",
                  boxShadow: "none",
                }}
              >
                {/* SECTION 0: PERSONAL INFO */}
                {section === 0 && (
                  <Box id="account-panel-0">
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        textTransform: "uppercase",
                        mb: 3,
                      }}
                    >
                      Thông Tin Cá Nhân
                    </Typography>

                    {/* Tất cả ô ở 1 cột, "Sinh nhật" -> "Mật khẩu" */}
                    <Grid container spacing={3} direction="column">
                      <Grid item xs={12}>
                        <TextField
                          label="Email"
                          fullWidth
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Họ & Tên"
                          fullWidth
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Mật khẩu"
                          type="password"
                          fullWidth
                          value={form.password}
                          onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
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
                          inputProps={{ maxLength: 10 }}
                        />
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 4 }}>
                      <Button
                        variant="contained"
                        onClick={handleSaveProfile}
                        disabled={saving}
                        sx={{
                          px: 5,
                          py: 1.5,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {saving ? (
                          <CircularProgress size={20} sx={{ color: "#fff" }} />
                        ) : (
                          "LƯU THAY ĐỔI"
                        )}
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* SECTION 1: ORDER HISTORY */}
                {section === 1 && (
                  <Box id="account-panel-1">
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        textTransform: "uppercase",
                        mb: 3,
                      }}
                    >
                      Lịch Sử Đặt Hàng
                    </Typography>

                    {loadingOrders ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 4,
                        }}
                      >
                        <CircularProgress />
                      </Box>
                    ) : orders.length === 0 ? (
                      <Typography>Chưa có đơn hàng nào.</Typography>
                    ) : (
                      <List>
                        {orders.map((o) => (
                          <React.Fragment key={o.id}>
                            <ListItem
                              sx={{ py: 2 }}
                              secondaryAction={
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleGoToOrder(o.id)}
                                >
                                  Xem chi tiết
                                </Button>
                              }
                            >
                              <ListItemText
                                primary={`Đơn hàng #${o.id}`}
                                secondary={
                                  <>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {`Trạng thái: ${o.status ?? "—"}`}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {`Tổng: ${
                                        o.Total_price
                                          ? Number(
                                              o.Total_price
                                            ).toLocaleString("vi-VN") + "₫"
                                          : "—"
                                      }`}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {`Ngày: ${o.created_at ?? o.date ?? "—"}`}
                                    </Typography>
                                  </>
                                }
                              />
                            </ListItem>
                            <Divider />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {/* SECTION 2: SHIPPING INFO */}
                {section === 2 && (
                  <Box id="account-panel-2">
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        textTransform: "uppercase",
                        mb: 3,
                      }}
                    >
                      Thông Tin Giao Hàng
                    </Typography>

                    {addresses.length === 0 ? (
                      <Typography>
                        Chưa có địa chỉ nào. Bạn có thể lưu địa chỉ trong phần
                        thông tin cá nhân hoặc tại bước thanh toán.
                      </Typography>
                    ) : (
                      <Grid container spacing={2}>
                        {addresses.map((a, idx) => (
                          <Grid item xs={12} key={idx}>
                            <Paper sx={{ p: 2, borderRadius: 1 }}>
                              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                                {a.name ?? `Địa chỉ ${idx + 1}`}
                              </Typography>
                              <Typography variant="body2">
                                {a.address}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {a.city}
                              </Typography>
                              {a.phone && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {`Điện thoại: ${a.phone}`}
                                </Typography>
                              )}
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                )}

                {/* SECTION 3: NEWSLETTER */}
                {section === 3 && (
                  <Box id="account-panel-3">
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        textTransform: "uppercase",
                        mb: 3,
                      }}
                    >
                      Đăng Ký Nhận Tin
                    </Typography>

                    <Typography sx={{ mb: 2 }}>
                      Nhận email về sản phẩm mới, chương trình khuyến mãi và các
                      tin tức mới nhất từ cửa hàng.
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ maxWidth: 400 }}>
                      <TextField
                        fullWidth
                        placeholder="Nhập email của bạn"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />
                      <Button
                        variant="contained"
                        onClick={() =>
                          setSnack({
                            severity: "success",
                            message: "Đã đăng ký nhận tin (demo).",
                          })
                        }
                      >
                        Đăng ký
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Snackbar
          open={!!snack}
          autoHideDuration={3000}
          onClose={() => setSnack(null)}
        >
          {snack ? (
            <Alert
              onClose={() => setSnack(null)}
              severity={snack.severity}
              sx={{ width: "100%" }}
            >
              {snack.message}
            </Alert>
          ) : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
