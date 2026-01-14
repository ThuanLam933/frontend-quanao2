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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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

function a11yProps(index) {
  return {
    id: `account-section-${index}`,
    "aria-controls": `account-panel-${index}`,
  };
}

const getProductImage = (product, images) => {
  const base = "http://127.0.0.1:8000/storage/";

  if (images && images[0] && images[0].full_url) return images[0].full_url;

  if (images && images[0] && images[0].url_image) {
    return base + images[0].url_image;
  }

  if (product && product.image_url) {
    return product.image_url.startsWith("http")
      ? product.image_url
      : base + product.image_url;
  }

  return "";
};

export default function AccountPage() {
  const navigate = useNavigate();

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

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [addresses, setAddresses] = useState([]);

  const [pwd, setPwd] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const getNewColorName = (idx, colorId) => {
  const colors = variantOptions[idx]?.colors ?? [];
  const found = colors.find((c) => Number(c.id) === Number(colorId));
  return found?.name ?? "—";
};

const getNewSizeName = (idx, colorId, sizeId) => {
  const sizes =
    variantOptions[idx]?.sizesByColor?.[String(colorId)] ??
    variantOptions[idx]?.sizesByColor?.[colorId] ??
    [];
  const found = sizes.find((s) => Number(s.id) === Number(sizeId));
  return found?.name ?? "—";
};


  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  const EXCHANGE_STATUS_COLOR = {
    pending: "warning",
    approved: "success",
    rejected: "error",
    in_transit: "info",
    completed: "success",
    cancelled: "error",
    canceled: "error",
  };

  const EXCHANGE_STATUS_LABEL = {
    pending: "Chờ xử lý",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    in_transit: "Đang vận chuyển",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    canceled: "Đã hủy",
  };

  const EXCHANGE_STATUS_OPTIONS = [
    { value: "pending", label: EXCHANGE_STATUS_LABEL.pending },
    { value: "approved", label: EXCHANGE_STATUS_LABEL.approved },
    { value: "rejected", label: EXCHANGE_STATUS_LABEL.rejected },
    { value: "in_transit", label: EXCHANGE_STATUS_LABEL.in_transit },
    { value: "completed", label: EXCHANGE_STATUS_LABEL.completed },
    { value: "cancelled", label: EXCHANGE_STATUS_LABEL.cancelled },
  ];


  // ==== ĐỔI TRẢ ====
  const [openExchangeDialog, setOpenExchangeDialog] = useState(false);
  const [exchangeList, setExchangeList] = useState([]);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeOrder, setExchangeOrder] = useState(null);
  const [exchangeForm, setExchangeForm] = useState({
    note: "",
    exchange_details: [],
  });
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false);
  const [variantOptions, setVariantOptions] = useState({}); 
// { [idx]: [{id, label}] }
  const fetchProductDetailOptions = async (productId, idx, excludeId) => {
  if (!productId) return;

  try {
    const token = localStorage.getItem("access_token");
    const res = await fetch(
      `${API_BASE}/api/product-details?product_id=${productId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không tải được biến thể");

    const list = Array.isArray(data) ? data : data.data ?? [];

    
    const filtered = list.filter((pd) =>
      excludeId ? Number(pd.id) !== Number(excludeId) : true
    );

    
    const colorsMap = new Map(); // colorId -> {id,name}
    const sizesByColor = {}; // colorId -> Map(sizeId-> {id,name})
    const pdByColorSize = {}; // `${colorId}-${sizeId}` -> pdId

    filtered.forEach((pd) => {
      const color = pd?.color;
      const size = pd?.size;
      if (!color?.id || !size?.id) return;

      colorsMap.set(color.id, { id: color.id, name: color.name });

      if (!sizesByColor[color.id]) sizesByColor[color.id] = new Map();
      sizesByColor[color.id].set(size.id, { id: size.id, name: size.name });

      pdByColorSize[`${color.id}-${size.id}`] = pd.id;
    });

    const colors = Array.from(colorsMap.values());
    const sizesByColorPlain = Object.fromEntries(
      Object.entries(sizesByColor).map(([colorId, m]) => [
        colorId,
        Array.from(m.values()),
      ])
    );

    setVariantOptions((prev) => ({
      ...prev,
      [idx]: {
        pds: filtered,
        colors,
        sizesByColor: sizesByColorPlain,
        pdByColorSize,
      },
    }));
  } catch (e) {
    setVariantOptions((prev) => ({
      ...prev,
      [idx]: { pds: [], colors: [], sizesByColor: {}, pdByColorSize: {} },
    }));
  }
};


  const sanitizePhone = (value) => {
    if (!value) return "";
    return value.replace(/\D/g, "").slice(0, 10);
  };

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
      delete payload.password;

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
    } catch {
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
  const handleOpenExchanges = async (orderId) => {
    setOpenExchangeDialog(true);
    setExchangeLoading(true);
    setExchangeList([]);
    setExchangeOrder(null);
    setExchangeForm({ note: "", exchange_details: [] });

    try {
      const token = localStorage.getItem("access_token");
     
      const orderRes = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || "Không tìm thấy đơn hàng");
      setExchangeOrder(orderData);

      
      const userId = user?.id;
      const exchangesRes = await fetch(`${API_BASE}/api/user-exchanges/${userId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const exchangesData = await exchangesRes.json();
      
      const oid = Number(orderId);
      const filtered = Array.isArray(exchangesData)
        ? exchangesData.filter((ex) => (ex.order_id) === oid)
        : [];
      setExchangeList(filtered);

     
      const items =
  orderData.items ??
  orderData.order_details ??
  orderData.orderDetails ??
  [];

if (Array.isArray(items) && items.length > 0) {
  setExchangeForm((prev) => ({
    ...prev,
    exchange_details: items.map((item) => {
      const pd =
        item.product_detail ?? item.productDetail ?? item.product_detail_id_obj ?? null;

      const pdId =
        item.product_detail_id ??
        pd?.id ??
        item.productDetail?.id;

      const product = pd?.product ?? item.product ?? {};
      const productId = product?.id ?? item.product_id ?? null;

      const colorName =
        pd?.color?.name ?? item.color?.name ?? item.color_name ?? "";

      const sizeName =
        pd?.size?.name ?? item.size?.name ?? item.size_name ?? "";

      const colorId = pd?.color?.id ?? null;
      const sizeId = pd?.size?.id ?? null;
      return {
      
      product_old_detail_id: pdId,
      product_old_color_name: colorName,
      product_old_size_name: sizeName,

      
      color_id: null,
      size_id: null,
      product_new_id: null,

      
      product_id: productId,
      product_name: product?.name ?? item.product_name ?? "",
      product_price: item.price ?? item.product_price ?? 0,
      quantity: 1,
      max_quantity: Number(item.quantity ?? 1),
      reason: "",
    };
    }),
  }));

  
  setVariantOptions({});

  
  items.forEach((item, idx) => {
  const pd = item.product_detail ?? item.productDetail ?? null;
  const product = pd?.product ?? item.product ?? {};
  const productId = product?.id ?? item.product_id ?? null;

  const oldPdId =
    item.product_detail_id ??
    pd?.id ??
    item.productDetail?.id ??
    null;

  if (productId) fetchProductDetailOptions(productId, idx, oldPdId);
});

} else {
  setSnack({
    severity: "error",
    message: "Đơn hàng không có sản phẩm để đổi trả.",
  });
}


    } catch (err) {
      setSnack({
        severity: "error",
        message: err.message || "Không tải được dữ liệu báo cáo đổi trả.",
      });
      setOpenExchangeDialog(false);
    } finally {
      setExchangeLoading(false);
    }
  };

  
  const handleCloseExchangeDialog = () => {
    setOpenExchangeDialog(false);
    setExchangeList([]);
    setExchangeOrder(null);
    setExchangeForm({ note: "", exchange_details: [] });
  };

  

  const handleSubmitExchange = async () => {
  setExchangeSubmitting(true);
  try {
    
    const missingNew = (exchangeForm.exchange_details || []).some(
      (d) => !d.product_new_id
    );
    if (missingNew) {
      setSnack({
        severity: "error",
        message: "Vui lòng chọn Size,Màu của sản phẩm cần đổi.",
      });
      return; 
    }
    const invalidQty = (exchangeForm.exchange_details || []).some(
  (d) =>
    Number(d.quantity) < 1 ||
    Number(d.quantity) > Number(d.max_quantity ?? 1)
);

if (invalidQty) {
  setSnack({ severity: "error", message: "Số lượng đổi/trả không hợp lệ." });
  return;
}


    const token = localStorage.getItem("access_token");

    const payload = {
  order_id: exchangeOrder.id,
  user_id: user.id,
  note: exchangeForm.note,
  exchange_details: exchangeForm.exchange_details.map((d) => ({
    product_detail_id: d.product_old_detail_id, 
    quantity: d.quantity,
    reason: d.reason,
    product_old_id: d.product_old_detail_id,
    product_new_id: d.product_new_id,
  })),
};


    const res = await fetch(`${API_BASE}/api/exchanges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gửi báo cáo đổi trả thất bại.");
    }

    setSnack({ severity: "success", message: "Đã gửi báo cáo đổi trả!" });
    handleOpenExchanges(exchangeOrder.id);
  } catch (err) {
    setSnack({ severity: "error", message: err.message || "Có lỗi xảy ra." });
  } finally {
    setExchangeSubmitting(false);
  }
};

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };
    
  const greetingName =
    user?.name || (user?.email ? user.email.split("@")[0] : "Bạn");

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ backgroundColor: "#fff", py: 5 }}>
        <Container maxWidth="lg" sx={{ maxWidth: "1080px !important", px: 2 }}>
          <Grid container spacing={4}>
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

            <Grid item xs={12} md={9}>
              <Paper
                sx={{
                  p: 4,
                  borderRadius: 0,
                  border: "1px solid #e0e0e0",
                }}
              >
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
                          const STATUS_LABEL = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    canceled: "Đã hủy",
    completed: "Hoàn thành",
};

const isCompleted = (o.status || "").toLowerCase() === "completed";
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
                                  {STATUS_LABEL[(o.status || "").toLowerCase()] ?? o.status ?? "—"}
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
                              
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  if (!isCompleted){
                                    setSnack({ severity: "warning", message: "Chi duoc doi tra khi don hang da thanh cong "});
                                    return;
                                  }
                                  handleOpenExchanges(o.id);
                                }}
                                disabled={!isCompleted}
                                sx={{ borderRadius: 0, px: 3, fontWeight: 600, ml: 2 }}
                              >
                                ĐỔI TRẢ
                              </Button>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                )}

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
                    <strong>Thanh toán:</strong> {orderDetail.payment_method}
                  </Typography>
                  <Typography sx={{ mb: 0.5 }}>
                    <strong>Ngày đặt:</strong>{" "}
                    {orderDetail.created_at
                      ? new Date(orderDetail.created_at).toLocaleString("vi-VN")
                      : "—"}
                  </Typography>
                  {orderDetail.note && (
                    <Typography sx={{ mt: 0.5 }}>
                      <strong>Ghi chú:</strong> {orderDetail.note}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {(() => {
                  const itemsSubtotal = (orderDetail.items || []).reduce(
                    (s, it) => {
                      const price = Number(it.price || 0);
                      const qty = Number(it.quantity || 0);
                      return s + price * qty;
                    },
                    0
                  );

                  const shipping = Number(
                    orderDetail.shipping ??
                      orderDetail.shipping_fee ??
                      orderDetail.totals?.shipping ??
                      0
                  );

                  const totalAfterDiscount = Number(
                    orderDetail.total_after_discount ??
                      orderDetail.totals?.total_after_discount ??
                      orderDetail.total_price ??
                      0
                  );

                  const discountCode =
                    orderDetail.discount_code ??
                    orderDetail.discount?.code ??
                    orderDetail.voucher_code ??
                    null;

                  const computedDiscount = Math.max(
                    0,
                    itemsSubtotal + shipping - totalAfterDiscount
                  );

                  const discountAmount = Number(
                    orderDetail.discount_amount ??
                      orderDetail.discount?.amount_discount ??
                      computedDiscount
                  );

                  if (!discountAmount || discountAmount <= 0) return null;

                  return (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          textTransform: "uppercase",
                          mb: 1,
                        }}
                      >
                        Ưu đãi
                      </Typography>

                      <Typography sx={{ mb: 0.5 }}>
                        <strong>Mã giảm giá:</strong> {discountCode || "—"}
                      </Typography>

                      <Typography sx={{ mb: 0.5 }}>
                        <strong>Số tiền giảm:</strong> -{" "}
                        {discountAmount.toLocaleString("vi-VN")}₫
                      </Typography>
                    </Box>
                  );
                })()}

                <Typography
                  sx={{ fontWeight: 700, mb: 2, textTransform: "uppercase" }}
                >
                  Sản phẩm
                </Typography>

                <Stack spacing={2}>
                  {(orderDetail.items || []).map((item) => {
                    const pd = item.product_detail || item.productDetail || {};
                    const product = pd.product || {};
                    const color = pd.color || {};
                    const size = pd.size || {};
                    const images = pd.images || [];

                    const imgUrl = getProductImage(product, images);

                    const lineTotal = (item.price || 0) * (item.quantity || 0);

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
                              ? Number(item.price).toLocaleString("vi-VN") + "₫"
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

                  {(!orderDetail.items || orderDetail.items.length === 0) && (
                    <Typography>Đơn hàng chưa có dữ liệu sản phẩm.</Typography>
                  )}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography
                  sx={{ fontWeight: 700, fontSize: 18, textAlign: "right" }}
                >
                  Tổng đơn:{" "}
                  {orderDetail.total_price
                    ? Number(orderDetail.total_price).toLocaleString("vi-VN") +
                      "₫"
                    : "—"}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseOrderDialog}>Đóng</Button>
          </DialogActions>
        </Dialog>
            <Dialog
  open={openExchangeDialog}
  onClose={handleCloseExchangeDialog}
  maxWidth="md"
  fullWidth
>
  <DialogTitle sx={{ fontWeight: 700 }}>
    {exchangeOrder ? `Đổi trả - Đơn hàng #${exchangeOrder.id}` : "Đổi trả"}
  </DialogTitle>

  <DialogContent dividers>
    {exchangeLoading ? (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    ) : (
      <Box>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          Lịch sử đổi trả
        </Typography>

        {exchangeList.length === 0 ? (
          <Typography sx={{ color: "#666", mb: 2 }}>
            Chưa có yêu cầu đổi trả nào cho đơn này.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {exchangeList.map((ex) => {
              const st = String(ex.status ?? "").toLowerCase();
              return (
                <Paper key={ex.id} sx={{ p: 2, border: "1px solid #eee" }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>
                      Yêu cầu #{ex.id}
                    </Typography>

                    <Chip
                      size="small"
                      label={EXCHANGE_STATUS_LABEL[st] ?? ex.status ?? "—"}
                      color={EXCHANGE_STATUS_COLOR[st] || "default"}
                    />
                  </Stack>

                  <Typography variant="body2">Ghi chú: {ex.note ?? "—"}</Typography>
                </Paper>
              );
            })}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        <TextField
          label="Ghi chú"
          fullWidth
          multiline
          minRows={2}
          value={exchangeForm.note}
          onChange={(e) =>
            setExchangeForm((p) => ({ ...p, note: e.target.value }))
          }
          sx={{ mb: 2 }}
        />

        <Typography sx={{ fontWeight: 700, mb: 1 }}>Sản phẩm đổi trả</Typography>

        <Stack spacing={2}>
          {(exchangeForm.exchange_details || []).map((d, idx) => (
            <Paper key={idx} sx={{ p: 2, border: "1px solid #eee" }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                 <TextField
                    label="Số lượng"
                    type="number"
                    fullWidth
                    inputProps={{ min: 1, max: d.max_quantity ?? 1 }}
                    value={d.quantity}
                    onChange={(e) => {
                      const maxQ = Number(d.max_quantity ?? 1);
                      const vRaw = Number(e.target.value || 1);
                      const v = Math.max(1, Math.min(maxQ, vRaw));

                      setExchangeForm((prev) => {
                        const next = [...prev.exchange_details];
                        next[idx] = { ...next[idx], quantity: v };
                        return { ...prev, exchange_details: next };
                      });
                    }}
                  />

                </Grid>

                <Grid item xs={12} md={9}>
                  <TextField
                    label="Lý do"
                    fullWidth
                    value={d.reason}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExchangeForm((prev) => {
                        const next = [...prev.exchange_details];
                        next[idx] = { ...next[idx], reason: v };
                        return { ...prev, exchange_details: next };
                      });
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Chọn màu</InputLabel>
                    <Select
                      label="Chọn màu"
                      value={d.color_id ?? ""}
                      onChange={(e) => {
                        const colorId = e.target.value ? Number(e.target.value) : null;

                        setExchangeForm((prev) => {
                          const next = [...prev.exchange_details];
                          const current = next[idx];

                          // reset size khi đổi màu để tránh size cũ không hợp lệ
                          next[idx] = {
                            ...current,
                            color_id: colorId,
                            size_id: null,
                            product_new_id: null,
                          };
                          return { ...prev, exchange_details: next };
                        });
                      }}
                    >
                      <MenuItem value="">
                        <em>Chưa chọn</em>
                      </MenuItem>

                      {(variantOptions[idx]?.colors ?? []).map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!d.color_id}>
                    <InputLabel>Chọn size</InputLabel>
                    <Select
                      label="Chọn size"
                      value={d.size_id ?? ""}
                      onChange={(e) => {
                        const sizeId = e.target.value ? Number(e.target.value) : null;

                        setExchangeForm((prev) => {
                          const next = [...prev.exchange_details];
                          const current = next[idx];

                          const map = variantOptions[idx]?.pdByColorSize ?? {};
                          const newPdId =
                            current.color_id && sizeId
                              ? map[`${current.color_id}-${sizeId}`] ?? null
                              : null;

                          next[idx] = {
                            ...current,
                            size_id: sizeId,
                            product_new_id: newPdId, // <-- tự set ở đây
                          };
                          return { ...prev, exchange_details: next };
                        });
                      }}
                    >
                      <MenuItem value="">
                        <em>Chưa chọn</em>
                      </MenuItem>

                      {(
                        variantOptions[idx]?.sizesByColor?.[String(d.color_id)] ??
                        variantOptions[idx]?.sizesByColor?.[d.color_id] ??
                        []
                      ).map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ mt: 1, color: "#666" }}>
                    <strong>Sản phẩm cũ</strong> <br />
                    Tên sản phẩm: {d.product_name} <br />
                    Màu sản phẩm: {d.product_old_color_name} <br />
                    Size sản phẩm: {d.product_old_size_name} <br />
                    Giá sản phẩm:{" "}
                    {d.product_price
                      ? Number(d.product_price).toLocaleString("vi-VN") + "₫"
                      : "—"}{" "}
                    <br />
                    product_detail_id: {d.product_old_detail_id}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ mt: 1, color: "#666" }}>
                    <strong>Sản phẩm mới</strong> <br />
                    Tên sản phẩm: {d.product_name} <br />
                    Màu sản phẩm: {d.color_id ? getNewColorName(idx, d.color_id) : "—"} <br />
                    Size sản phẩm:{" "}
                    {d.color_id && d.size_id ? getNewSizeName(idx, d.color_id, d.size_id) : "—"}{" "}
                    <br />
                    Giá sản phẩm:{" "}
                    {d.product_price
                      ? Number(d.product_price).toLocaleString("vi-VN") + "₫"
                      : "—"}{" "}
                    <br />
                    product_detail_id_mới: {d.product_new_id ?? "—"}
                  </Typography>
                </Grid>
              </Grid>

              
            </Paper>
          ))}
        </Stack>

        {(!exchangeForm.exchange_details || exchangeForm.exchange_details.length === 0) && (
          <Typography sx={{ color: "#d32f2f", mt: 2 }}>
            Không có sản phẩm để đổi trả (items rỗng hoặc sai key).
          </Typography>
        )}
      </Box>
    )}
  </DialogContent>

  <DialogActions>
    <Button onClick={handleCloseExchangeDialog}>Đóng</Button>
    <Button
      variant="contained"
      
      onClick={handleSubmitExchange}
      disabled={exchangeSubmitting || exchangeLoading || !exchangeOrder || exchangeForm.exchange_details.length === 0}
      sx={{ backgroundColor: "#000", borderRadius: 0, fontWeight: 700, "&:hover": { backgroundColor: "#222" } }}
    >
      {exchangeSubmitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "GỬI YÊU CẦU"}
    </Button>
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
