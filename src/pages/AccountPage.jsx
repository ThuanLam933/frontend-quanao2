// src/pages/user/AccountPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  Grid,
  Tabs,
  Tab,
  TextField,
  Stack,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#F7FAFC", paper: "#fff" },
    primary: { main: "#162447", contrastText: "#fff" },
    text: { primary: "#0D1B2A", secondary: "#5C6F91" },
  },
  typography: { fontFamily: "Poppins, Roboto, sans-serif" },
  shape: { borderRadius: 8 },
});

function a11yProps(index) {
  return { id: `account-tab-${index}`, "aria-controls": `account-tabpanel-${index}` };
}

export default function AccountPage() {
  const navigate = useNavigate();

  // user is read from localStorage; replace with auth context or API call if available
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState(null);

  // profile form
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  // orders / wishlist / addresses state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [addresses, setAddresses] = useState([]);

  // chỉ giữ chữ số và giới hạn tối đa 10 ký tự
  const sanitizePhone = (value) => {
    if (!value) return "";
    const digits = value.replace(/\D/g, "");
    return digits.slice(0, 10);
  };

  // initialize form when user loads or changes
  useEffect(() => {
    if (user)
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: sanitizePhone(user.phone ?? ""),
        password: user.password ?? "",
      });
  }, [user]);

  // ---------- fetchOrders: function declaration (hoisted) to avoid TDZ ----------
  // fetch orders (use Authorization token; handle errors without auto-logout)
  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        // no token -> don't call API, show nothing
        setOrders([]);
        setLoadingOrders(false);
        return;
      }

      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const url = `${API_BASE}/api/orders`;
      let res = await fetch(url, { headers });

      // read body/text for robust parsing
      const text = await res.text().catch(() => "");
      const ct = res.headers.get("content-type") || "";

      // parse JSON if possible
      let parsed = null;
      if (ct.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch (e) {
          parsed = null;
        }
      }

      if (!res.ok) {
        // If 401/403: warn user but do not force logout to avoid unexpected behavior
        if (res.status === 401 || res.status === 403) {
          console.warn("fetchOrders auth warning:", res.status, parsed || text);
          setSnack({ severity: "warning", message: "Không thể tải đơn hàng: cần đăng nhập hoặc quyền không đủ." });
          setOrders([]);
          return;
        }
        // other errors: show server message if available
        const msg = (parsed && (parsed.message || parsed.error)) || `Lỗi khi tải đơn hàng (${res.status})`;
        setSnack({ severity: "error", message: msg });
        setOrders([]);
        return;
      }

      // OK: use parsed JSON or wrapper
      const list = Array.isArray(parsed) ? parsed : parsed?.data ?? parsed?.orders ?? [];
      setOrders(Array.isArray(list) ? list : []);
      try {
        localStorage.setItem("orders_cache", JSON.stringify(Array.isArray(list) ? list : []));
      } catch {}

      // success done
      return;
    } catch (err) {
      console.error("fetchOrders network error:", err);
      setSnack({ severity: "error", message: "Lỗi mạng khi tải đơn hàng." });
      // fallback -> cached orders
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

  // fetch addresses (if you store locally or via API)
  const fetchAddresses = useCallback(() => {
    try {
      // try localStorage fallback
      const raw = localStorage.getItem("addresses") || "[]";
      setAddresses(JSON.parse(raw));
    } catch {
      setAddresses([]);
    }
  }, []);

  // Call fetchOrders only when user exists AND token exists
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (user && token) {
      fetchOrders();
      // fetchWishlist();
      fetchAddresses();
    } else if (user && !token) {
      // user object exists but token missing -> show mild warning
      setSnack({ severity: "warning", message: "Bạn chưa đăng nhập hoặc token không hợp lệ." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fetchAddresses]);

  const handleTabChange = (e, v) => setTab(v);

  const handleSaveProfile = async () => {
    setSaving(true);

    try {
      // === basic validation ===
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
        setSnack({ severity: "error", message: "Email không hợp lệ." });
        setSaving(false);
        return;
      }
      // sau kiểm tra email
      if (form.phone && !/^\d{10}$/.test(form.phone)) {
        setSnack({ severity: "error", message: "Số điện thoại phải đúng 10 chữ số (chỉ gồm số)." });
        setSaving(false);
        return;
      }

      // keep original for rollback
      const originalUser = user ? { ...user } : null;
      const optimisticUser = { ...(user || {}), ...form };

      // === OPTIMISTIC: update UI & localStorage right away ===
      setUser(optimisticUser);
      try {
        localStorage.setItem("user", JSON.stringify(optimisticUser));
      } catch (e) {
        console.warn("localStorage set failed (optimistic):", e);
      }

      // notify other listeners/tabs
      try {
        window.dispatchEvent(new Event("userUpdated"));
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("app-user");
          bc.postMessage({ type: "userUpdated", user: optimisticUser });
          bc.close();
        }
      } catch (e) {
        /* ignore broadcast errors */
      }

      // === if offline: keep optimistic and inform user ===
      if (!navigator.onLine) {
        // Optionally queue for later sync: push to 'pendingUserUpdates' array in localStorage
        try {
          const pendingKey = "pending_user_updates";
          const raw = localStorage.getItem(pendingKey) || "[]";
          const arr = JSON.parse(raw);
          arr.push({ at: Date.now(), payload: form, userId: user?.id ?? null });
          localStorage.setItem(pendingKey, JSON.stringify(arr));
        } catch (e) {
          console.warn("queue pending update failed:", e);
        }

        setSnack({ severity: "info", message: "Bạn đang offline — thay đổi đã lưu cục bộ và sẽ đồng bộ khi có mạng." });
        setSaving(false);
        return;
      }

      // === Prepare API call ===
      const token = localStorage.getItem("access_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // prefer /api/me endpoint (ensure you have it server-side)
      const url = `${API_BASE}/api/me`;

      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(form),
      }).catch((err) => {
        console.error("Network error on profile update:", err);
        return null;
      });

      // if network error (res === null)
      if (!res) {
        // keep optimistic local change, inform user
        setSnack({ severity: "info", message: "Lỗi mạng — đã lưu cục bộ, sẽ thử đồng bộ sau." });
        setSaving(false);
        return;
      }

      const text = await res.text().catch(() => "");
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch (e) {
        body = null;
      }

      if (!res.ok) {
        // Special-case 404: endpoint not found -> keep local but notify
        if (res.status === 404) {
          console.warn("Profile update endpoint not found (404). Keeping local changes.");
          setSnack({ severity: "warning", message: "Đã lưu cục bộ nhưng server không hỗ trợ cập nhật (404)." });
          setSaving(false);
          return;
        }

        // For other errors -> rollback optimistic changes
        const serverMsg = (body && (body.message || body.error)) || `Cập nhật thất bại (${res.status})`;
        // rollback localStorage & state
        try {
          if (originalUser) localStorage.setItem("user", JSON.stringify(originalUser));
          else localStorage.removeItem("user");
        } catch (e) {
          console.warn("rollback localStorage failed:", e);
        }
        setUser(originalUser);
        setSnack({ severity: "error", message: serverMsg });
        setSaving(false);
        return;
      }

      // === Success ===
      // Prefer server-returned user object (body may include user)
      const updatedFromServer =
        body && typeof body === "object" && (body.id || body.email || body.name) ? body : optimisticUser;

      try {
        localStorage.setItem("user", JSON.stringify(updatedFromServer));
      } catch (e) {
        console.warn("localStorage set failed (final):", e);
      }

      setUser(updatedFromServer);

      // broadcast final user
      try {
        window.dispatchEvent(new Event("userUpdated"));
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("app-user");
          bc.postMessage({ type: "userUpdated", user: updatedFromServer });
          bc.close();
        }
      } catch (e) {
        /* ignore */
      }

      setSnack({ severity: "success", message: "Cập nhật thông tin thành công." });
    } catch (err) {
      console.error("save profile err:", err);
      // rollback to original if possible
      try {
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);
        } else {
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch (e) {
        console.warn("rollback failed:", e);
      }
      setSnack({ severity: "error", message: err?.message ?? "Cập nhật thất bại." });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      setUser(null);
      setSnack({ severity: "info", message: "Đã đăng xuất." });
      // navigate to home or login
      navigate("/login");
    } catch (err) {
      console.warn("logout", err);
      setSnack({ severity: "error", message: "Không thể đăng xuất." });
    }
  };

  const handleGoToProduct = (id) => navigate(`/product/${id}`);

  // small UI helpers
  const initials = (u) => {
    if (!u) return "U";
    const n = u.name || u.email || "";
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "80vh", backgroundColor: "background.default", py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {/* Left: summary / avatar */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, position: "sticky", top: 24 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ width: 72, height: 72, bgcolor: "primary.main" }}>{initials(user)}</Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {user?.name ?? "Khách"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.email ?? "Chưa có email"}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setTab(0)}>
                    Chỉnh sửa thông tin
                  </Button>
                  <Button startIcon={<ShoppingBagIcon />} variant="outlined" onClick={() => setTab(1)}>
                    Đơn hàng
                  </Button>
                  <Button startIcon={<HomeIcon />} color="error" variant="outlined" onClick={handleLogout}>
                    Đăng xuất
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            {/* Right: tabs content */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Tabs value={tab} onChange={handleTabChange} aria-label="account tabs" variant="fullWidth" sx={{ mb: 2 }}>
                  <Tab label="Thông tin" {...a11yProps(0)} />
                  <Tab label="Đơn hàng" {...a11yProps(1)} />
                  <Tab label="Địa chỉ" {...a11yProps(2)} />
                </Tabs>

                {/* Tab 0: Profile */}
                {tab === 0 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Thông tin cá nhân
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Họ tên" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Email" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Số điện thoại"
                          fullWidth
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
                          inputProps={{ maxLength: 10 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Password" fullWidth value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      </Grid>
                    </Grid>

                    <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
                      <Button variant="contained" onClick={handleSaveProfile} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : "Lưu"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setForm({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", password: user?.password ?? "" });
                          setSnack({ severity: "info", message: "Đã phục hồi" });
                        }}
                      >
                        Hủy
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Tab 1: Orders */}
                {tab === 1 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Đơn hàng của tôi
                    </Typography>
                    {loadingOrders ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : orders.length === 0 ? (
                      <Typography>Chưa có đơn hàng.</Typography>
                    ) : (
                      <List>
                        {orders.map((o) => (
                          <React.Fragment key={o.id}>
                            <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                              <ListItemText
                                primary={`#${o.id} — ${o.status ?? "—"}`}
                                secondary={
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">{`Tổng: ${o.Total_price ? Number(o.Total_price).toLocaleString("vi-VN") + "₫" : "—"}`}</Typography>
                                    <Typography variant="caption" color="text.secondary">{`Ngày: ${o.created_at ?? o.date ?? "—"}`}</Typography>
                                  </Box>
                                }
                              />
                              <Button size="small" onClick={() => navigate(`/order/${o.id}`)}>
                                Chi tiết
                              </Button>
                            </ListItem>
                            <Divider />
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {/* Tab 2: Addresses */}
                {tab === 2 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Địa chỉ giao hàng
                    </Typography>
                    {addresses.length === 0 ? (
                      <Typography>Chưa có địa chỉ nào. Bạn có thể thêm địa chỉ trong phần sửa thông tin.</Typography>
                    ) : (
                      <Grid container spacing={2}>
                        {addresses.map((a, idx) => (
                          <Grid item xs={12} key={idx}>
                            <Paper sx={{ p: 2 }}>
                              <Typography sx={{ fontWeight: 700 }}>{a.name ?? `Địa chỉ ${idx + 1}`}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {a.address}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Chip label={a.phone} />
                                <Chip label={a.city} />
                              </Stack>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
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
