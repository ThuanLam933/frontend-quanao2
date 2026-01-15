import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    IconButton,
    Chip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Divider,
    Pagination,
    Grid,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";

const API_BASE = "http://127.0.0.1:8000";

const STATUS_COLOR = {
    pending: "warning",
    confirmed: "success",
    cancelled: "error",
    canceled: "error",
};
const STATUS_LABEL = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    canceled: "Đã hủy",
    completed: "Hoàn thành",
    shipping: "Đang giao hàng",
};
const STATUS_OPTIONS = [
  { value: "pending", label: STATUS_LABEL.pending },
  { value: "confirmed", label: STATUS_LABEL.confirmed },
  { value: "shipping", label: STATUS_LABEL.shipping },
  { value: "completed", label: STATUS_LABEL.completed },
  { value: "cancelled", label: STATUS_LABEL.cancelled },
  // nếu backend dùng canceled thì thêm dòng dưới (tuỳ bạn)
  // { value: "canceled", label: STATUS_LABEL.canceled },
];

const PAYMENT_STATUS_COLOR = {
  unpaid: "warning",
  pending: "warning",
  paid: "success",
  failed: "error",
  refunded: "info",
};

const PAYMENT_STATUS_LABEL = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
};

const getPaymentStatus = (o) => {
  
  if (o?.status_method !== undefined && o?.status_method !== null) {
    return Number(o.status_method) === 1 ? "paid" : "unpaid";
  }

  
  const raw =
    o?.paymentStatus ??
    o?.payment?.status ??
    ((o?.is_paid ?? o?.isPaid) ? "paid" : null);

  return raw ? String(raw).toLowerCase() : null;
};



const PAGE_SIZE = 12;
const parseIso = (s) => {
  if (!s) return null;

  const normalized = String(s).replace(
    /\.(\d{3})\d*(Z)$/,
    ".$1$2"
  );

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTimeVN = (isoString) => {
  const d = parseIso(isoString);
  if (!d) return "—";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, "0");
  const MI = String(d.getMinutes()).padStart(2, "0");

  return `${HH}:${MI} ${dd}/${mm}/${yyyy} `;
};

const getOrderTotal = (x) =>
//   x?.total_after_discount ??
//   x?.totalAfterDiscount ??
//   x?.total_discounted ??
  x?.total_price;

const formatVND = (v) =>
  v != null && v !== ""
    ? Number(v).toLocaleString("vi-VN") + "₫"
    : "—";

export default function OrdersPage({ setSnack }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sel, setSel] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [statusMenu, setStatusMenu] = useState({ anchorEl: null, order: null });
    const openStatusMenu = (e, order) => {
    const current = String(order?.status || "").toLowerCase();
    if (current === "completed") {
        setSnack?.({
        severity: "warning",
        message: "Đơn đã hoàn thành, không thể thay đổi trạng thái!",
        });
        return;
    }
    setStatusMenu({ anchorEl: e.currentTarget, order });
    };

    const closeStatusMenu = () => {
    setStatusMenu({ anchorEl: null, order: null });
    };

    const handlePickStatus = async (status) => {
    const order = statusMenu.order;
    if (!order) return;

    closeStatusMenu();

    const current = String(order.status || "").toLowerCase();
    if (current === String(status).toLowerCase()) return;

    await changeStatus(order.id, status);
    };


    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE}/api/orders-all`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) throw new Error("Orders fetch failed");
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data ?? [];
            setOrders(arr);
        } catch (err) {
            console.error(err);
            setSnack({
                severity: "error",
                message: "Không tải danh sách đơn hàng!",
            });
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleView = (o) => setSel(o);

    const changeStatus = async (orderId, status) => {
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Status update failed");
            setSnack({
                severity: "success",
                message: "Cập nhật trạng thái thành công!",
            });
            fetchOrders();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Cập nhật thất bại!" });
        }
    };

    const filtered = orders.filter((o) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            String(o.id).includes(q) ||
            o.user?.email?.toLowerCase().includes(q) ||
            o.email?.toLowerCase().includes(q) ||
            o.name?.toLowerCase().includes(q) ||
            o.status?.toLowerCase().includes(q) ||
            o.payment_method?.toLowerCase().includes(q)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visible = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    return (
        <Box>
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Quản lý đơn hàng
                    </Typography>
                </Box>

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={fetchOrders}
                >
                    Refresh
                </Button>
            </Stack>

            <Paper sx={{ mb: 2, p: 2 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flex: 1 }}
                    >
                        <SearchIcon fontSize="small" />
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Tìm theo ID, email, tên khách, trạng thái, phương thức thanh toán..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Tổng: {orders.length} đơn hàng
                    </Typography>
                </Stack>
            </Paper>

            <Paper sx={{ position: "relative" }}>
                {loading && (
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            bgcolor: "rgba(255,255,255,0.6)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 2,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell align="right" sx={{ width: 60 }}>
                                    #
                                </TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Tên </TableCell>
                                <TableCell align="right">Giá tiền</TableCell>
                                <TableCell>Phương thức thanh toán</TableCell>
                                <TableCell>Trạng thái thanh toán</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>Ngày lên đơn</TableCell>
                                <TableCell align="right" sx={{ width: 160 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visible.map((o) => (
                                <TableRow hover key={o.id}>
                                    <TableCell align="right">{o.id}</TableCell>
                                    <TableCell>
                                        {o.user?.email ?? o.email ?? "—"}
                                    </TableCell>
                                    <TableCell>{o.name ?? "—"}</TableCell>
                                    <TableCell align="right">
                                    {formatVND(getOrderTotal(o))}
                                    </TableCell>

                                    <TableCell>
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            label={o.payment_method ?? "—"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                    {(() => {
                                        const ps = getPaymentStatus(o);
                                        return (
                                        <Chip
                                            size="small"
                                            label={PAYMENT_STATUS_LABEL[ps] ?? (ps ?? "Chua thanh toan")}
                                            color={PAYMENT_STATUS_COLOR[ps] || "default"}
                                        />
                                        );
                                    })()}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={
                                                STATUS_LABEL[(o.status || "").toLowerCase()] ?? o.status ?? "—"
                                            }
                                            // label={o.status ?? "—"}
                                            color={
                                                STATUS_COLOR[
                                                    (o.status || "")
                                                        .toLowerCase()
                                                ] || "default"
                                            }
                                        />
                                    </TableCell>
                                    {/* <TableCell>
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={o.payment_method ?? "—"}
                                    />
                                    </TableCell> */}

                                    

                                    <TableCell>
                                        {formatDateTimeVN(o.created_at  )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="Xem chi tiết">
                                            <IconButton size="small" onClick={() => handleView(o)}>
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                            </Tooltip>

                                            <Tooltip title="Đổi trạng thái">
                                            <IconButton size="small" onClick={(e) => openStatusMenu(e, o)}>
                                                {/* có thể dùng icon khác, tạm dùng RefreshIcon */}
                                                <RefreshIcon fontSize="small" />
                                            </IconButton>
                                            </Tooltip>
                                        </Stack>
                                        </TableCell>

                                </TableRow>
                            ))}

                            {!loading && visible.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Box sx={{ py: 3 }}>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Không có đơn hàng nào.
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider />
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        p: 1.5,
                    }}
                >
                    <Pagination
                        size="small"
                        count={totalPages}
                        page={currentPage}
                        onChange={(_, v) => setPage(v)}
                    />
                </Box>
            </Paper>
                    <Menu
                        anchorEl={statusMenu.anchorEl}
                        open={Boolean(statusMenu.anchorEl)}
                        onClose={closeStatusMenu}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        >
                        {STATUS_OPTIONS.map((opt) => {
                            const current = String(statusMenu.order?.status || "").toLowerCase();
                            const isSelected = current === opt.value;

                            return (
                            <MenuItem
                                key={opt.value}
                                selected={isSelected}
                                disabled={isSelected}
                                onClick={() => handlePickStatus(opt.value)}
                            >
                                <ListItemIcon>
                                {opt.value === "confirmed" ? (
                                    <CheckCircleIcon fontSize="small" color="success" />
                                ) : opt.value === "cancelled" ? (
                                    <CancelIcon fontSize="small" color="error" />
                                ) : (
                                    <CheckCircleIcon fontSize="small" color="warning" />
                                )}
                                </ListItemIcon>
                                <ListItemText primary={opt.label} />
                            </MenuItem>
                            );
                        })}
                        </Menu>

            <OrderDetailDialog sel={sel} onClose={() => setSel(null)} />
        </Box>
    );
}

function OrderDetailDialog({ sel, onClose }) {
    const open = !!sel;
    if (!open) return null;

    const itemsRaw =
        sel.items ||
        sel.order_items ||
        sel.details ||
        sel.products ||
        [];

    const items = Array.isArray(itemsRaw) ? itemsRaw : [];

    const formatCurrency = (v) =>
        typeof v === "number" || (typeof v === "string" && v !== "")
            ? Number(v).toLocaleString("vi-VN") + "₫"
            : "—";

    const statusColor =
        STATUS_COLOR[(sel?.status || "").toLowerCase()] || "default";

const discountCode =
  sel?.discount_code ??
  sel?.coupon_code ??
  sel?.discount?.code ??
  sel?.voucher_code ??
  null;

const discountAmount = Number(
  sel?.amount_discount ??
  sel?.discount_amount ??
  sel?.discount_value ??
  0
) || 0;

const calcItemsSubtotal = (itemsArr) =>
  (itemsArr || []).reduce((sum, it) => {
    const qty = Number(it.quantity ?? it.qty ?? it.qty_order ?? 1) || 1;

    const unit =
      Number(it.final_price ?? it.unit_price ?? it.price ?? 0) || 0;

    return sum + unit * qty;
  }, 0);

const subtotal =
  Number(sel?.subtotal ?? sel?.total_before_discount ?? 0) ||
  calcItemsSubtotal(items);

const totalAfterDiscount =
  Number(
    sel?.total_after_discount ??
    sel?.totalAfterDiscount ??
    sel?.total_discounted ??
    0
  ) || Math.max(0, subtotal - discountAmount);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Order #{sel?.id}
                </Typography>
                {sel?.status && (
                    <Chip
                        // label={sel.status}
                        label={
                            STATUS_LABEL[(sel.status || "").toLowerCase()] ?? sel.status ?? "—"
                        }
                        color={statusColor}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                    />
                )}
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                            Thông tin
                        </Typography>
                        <Typography variant="body2">
                            Email: {sel?.user?.email ?? sel?.email ?? "—"}
                        </Typography>
                        <Typography variant="body2">
                            Số điện thoại: {sel?.phone ?? "—"}
                        </Typography>
                        <Typography variant="body2">
                            Địa chỉ: {sel?.address ?? "—"}
                        </Typography>
                        {sel?.name && (
                            <Typography variant="body2">
                                Khách hàng: {sel.name}
                            </Typography>
                        )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                            Phương thức thanh toán: {sel?.payment_method ?? "—"}
                        </Typography>
                        {sel?.created_at && (
                            <Typography variant="body2">
                                Đơn được tạo:{" "}
                                {new Date(sel.created_at).toLocaleString(
                                    "vi-VN"
                                )}
                            </Typography>
                        )}
                        <Typography variant="body2" sx={{ mt: 1 }}>
  Giá gốc: <strong>{formatCurrency(subtotal)}</strong>
</Typography>

{discountCode && (
  <Typography variant="body2">
    Mã giảm giá: <strong>{discountCode}</strong>
  </Typography>
)}

{discountAmount > 0 && (
  <Typography variant="body2">
    Discount: <strong>-{formatCurrency(discountAmount)}</strong>
  </Typography>
)}
<Typography variant="body2" sx={{ mt: 0.5 }}>
  Tổng: <strong>{formatVND(getOrderTotal(sel))}</strong>
</Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Items
                </Typography>

                {items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Đơn hàng này không có dòng sản phẩm hoặc API chưa trả
                        về chi tiết.
                    </Typography>
                ) : (
                    <Table size="small">
  <TableHead>
    <TableRow>
      <TableCell>Sản phẩm</TableCell>
      <TableCell>Loại sản phẩm</TableCell>
      <TableCell align="right">Số lượng</TableCell>
      <TableCell align="right">Giá</TableCell>
      <TableCell align="right">Tổng</TableCell>
    </TableRow>
  </TableHead>

  <TableBody>
    {items.map((it, idx) => {
      const product = it.product ?? it.product_detail?.product ?? {};
      const name = product.name ?? it.name ?? it.title ?? "—";

      const colorName =
        it.color?.name ??
        it.product_detail?.color?.name ??
        it.color_name ??
        it.color ??
        null;

      const sizeName =
        it.size?.name ??
        it.product_detail?.size?.name ??
        it.size_name ??
        it.size ??
        null;

      const qty = it.quantity ?? it.qty ?? it.qty_order ?? 1;

      const finalUnit =
        it.final_price ??
        it.unit_price ??
        it.price ??
        0;

      const originalUnit =
        it.original_price ??
        it.original ??
        null;

      const lineTotal =
        it.total ??
        (finalUnit && qty ? Number(finalUnit) * Number(qty) : null);

      const originalLineTotal =
        originalUnit && qty ? Number(originalUnit) * Number(qty) : null;

      const thumb =
        it.product_detail?.image ??
        product.image ??
        product.thumbnail ??
        it.image_url ??
        null;

      return (
        <TableRow key={it.id ?? idx}>
          <TableCell>
            <Stack direction="row" spacing={1}>
              {thumb && (
                <Box
                  component="img"
                  src={thumb}
                  alt={name}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    objectFit: "cover",
                  }}
                />
              )}
              <Typography variant="body2">{name}</Typography>
            </Stack>
          </TableCell>

          <TableCell>
            <Typography variant="body2" color="text.secondary">
              {[
                colorName && `Màu sắc: ${colorName}`,
                sizeName && `Kích thước: ${sizeName}`,
              ]
                .filter(Boolean)
                .join(" • ") || "—"}
            </Typography>
          </TableCell>

          <TableCell align="right">{qty}</TableCell>

          <TableCell align="right">
            {originalUnit != null && Number(originalUnit) !== Number(finalUnit) ? (
              <>
                <Typography sx={{ fontSize: 12, textDecoration: "line-through", color: "#999" }}>
                  {formatCurrency(originalUnit)}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {formatCurrency(finalUnit)}
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontWeight: 700 }}>
                {formatCurrency(finalUnit)}
              </Typography>
            )}
          </TableCell>

          <TableCell align="right">
            {originalLineTotal != null && originalLineTotal !== lineTotal ? (
              <>
                <Typography sx={{ fontSize: 12, textDecoration: "line-through", color: "#999" }}>
                  {formatCurrency(originalLineTotal)}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {formatCurrency(lineTotal)}
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontWeight: 700 }}>
                {formatCurrency(lineTotal)}
              </Typography>
            )}
          </TableCell>
        </TableRow>
      );
    })}
  </TableBody>
</Table>

                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
