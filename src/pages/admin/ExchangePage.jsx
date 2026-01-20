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
  ListItemText,
  ListItemIcon,
  Tooltip,
  Divider,
  Pagination,
  Grid,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
const API_BASE = "http://127.0.0.1:8000";
const PAGE_SIZE = 12;

const EXCHANGE_STATUS_COLOR = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  in_transit: "info",
  completed: "success",
  cancelled: "error",
  canceled: "error", // phòng khi backend trả "canceled"
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
  
  // nếu backend dùng canceled thay vì cancelled thì thêm:
  // { value: "canceled", label: EXCHANGE_STATUS_LABEL.canceled },
];


const parseIso = (s) => {
  if (!s) return null;

  let str = String(s).trim();

  // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    str = str.replace(" ", "T");
  }

  // Cắt microseconds: .123456 -> .123
  str = str.replace(/\.(\d{3})\d+/, ".$1");

  // Nếu KHÔNG có timezone (không có Z hoặc ±HH:MM) thì coi như UTC => thêm Z
  const hasTZ = /([zZ]|[+\-]\d{2}:\d{2})$/.test(str);
  if (!hasTZ) str += "Z";

  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};



const formatDateTimeVN = (isoString) => {
  const d = parseIso(isoString);
  if (!d) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).format(d).replace(",", "");
};

const formatProductDetail = (pd) => {
  if (pd == null) return "—";

  // nếu chỉ là ID số (backend chưa embed object)
  if (typeof pd === "number" || /^\d+$/.test(String(pd))) {
    return `#${pd}`; // ít nhất hiển thị ID
  }

  // nếu backend trả nested object kiểu { product, color, size }
  const name =
    pd.product?.name ??
    pd.product_name ??
    pd.name ??
    "—";

  const color = pd.color?.name ?? pd.color ?? pd.color_name ?? "";
  const size = pd.size?.name ?? pd.size ?? pd.size_name ?? "";

  const attrs = [color, size].filter(Boolean).join(" / ");
  return attrs ? `${name} (${attrs})` : name;
};





export default function ExchangePage({ setSnack }) {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sel, setSel] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchExchanges = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/exchanges`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Exchanges fetch failed");

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.data ?? [];
      setExchanges(arr);
    } catch (err) {
      console.error(err);
      setSnack?.({
        severity: "error",
        message: "Không tải danh sách đổi/trả!",
      });
      setExchanges([]);
    } finally {
      setLoading(false);
    }
  }, [setSnack]);

  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  const fetchExchangeDetail = useCallback(
    async (id) => {
      setDetailLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE}/api/exchanges/${id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Exchange detail fetch failed");

        const data = await res.json();
        setSel(data);
      } catch (err) {
        console.error(err);
        setSnack?.({
          severity: "error",
          message: "Không tải chi tiết đổi/trả!",
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [setSnack]
  );

  const handleView = (ex) => {
    // Nếu list đã có exchangeDetails thì có thể set trực tiếp.
    // Nhưng để chắc chắn luôn mới nhất, gọi show(id).
    fetchExchangeDetail(ex.id);
  };

  const filtered = exchanges.filter((x) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    const status = String(x.status ?? "").toLowerCase();
    const note = String(x.note ?? "").toLowerCase();

    return (
      String(x.id).includes(q) ||
      String(x.order_id ?? "").includes(q) ||
      String(x.user_id ?? "").includes(q) ||
      status.includes(q) ||
      note.includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const [statusMenu, setStatusMenu] = useState({ anchorEl: null, exchange: null });

const openStatusMenu = (e, exchange) => {
  setStatusMenu({ anchorEl: e.currentTarget, exchange });
};

const closeStatusMenu = () => {
  setStatusMenu({ anchorEl: null, exchange: null });
};

const changeExchangeStatus = async (exchangeId, status) => {
  const token = localStorage.getItem("access_token");
  try {
    const res = await fetch(`${API_BASE}/api/admin/exchanges/${exchangeId}`, {
      method: "PUT", // nếu backend dùng PATCH thì đổi thành "PATCH"
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) throw new Error("Exchange status update failed");

    setSnack?.({ severity: "success", message: "Cập nhật trạng thái thành công!" });

    // refresh list
    await fetchExchanges();

    // nếu đang mở dialog chi tiết đúng exchange đó thì refresh detail luôn
    if (sel?.id === exchangeId) {
      await fetchExchangeDetail(exchangeId);
    }
  } catch (err) {
    console.error(err);
    setSnack?.({ severity: "error", message: "Cập nhật trạng thái thất bại!" });
  }
};

const handlePickExchangeStatus = async (status) => {
  const exchange = statusMenu.exchange;
  if (!exchange) return;

  closeStatusMenu();

  const current = String(exchange.status || "").toLowerCase();
  if (current === String(status).toLowerCase()) return;

  await changeExchangeStatus(exchange.id, status);
};


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
            Quản lý đổi/trả
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý các báo cáo đổi/trả sản phẩm theo đơn hàng.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={fetchExchanges}
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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
            <SearchIcon fontSize="small" />
            <TextField
              size="small"
              fullWidth
              placeholder="Tìm theo Exchange ID, Order ID, User ID, trạng thái, ghi chú..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Tổng: {exchanges.length} phiếu đổi/trả
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
                <TableCell align="right" sx={{ width: 70 }}>
                  #
                </TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  Mã đơn hàng
                </TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  User
                </TableCell>
                <TableCell sx={{ width:360 }}>Ghi chú</TableCell>
                <TableCell align="center" sx={{ width: 140 }}>
                  Trạng thái
                </TableCell>
                <TableCell sx={{ width: 180 }}>Ngày tạo</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  Số lượng sản phẩm
                </TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visible.map((x) => {
                const st = String(x.status ?? "").toLowerCase();
                const details = Array.isArray(x.exchangeDetails)
                  ? x.exchangeDetails
                  : Array.isArray(x.exchange_details)
                  ? x.exchange_details
                  : [];
                const created = x.created_at ?? x.create_exchange ?? x.createdAt ?? null;


                return (
                  <TableRow hover key={x.id}>
                    <TableCell align="right">{x.id}</TableCell>
                    <TableCell align="right">{x.order_id ?? "—"}</TableCell>
                    <TableCell align="right">{x.user?.name ?? "—"}</TableCell>

                     <TableCell sx={{ width: 360, maxWidth: 360 }}>
                        <Tooltip title={x.note ?? ""} placement="top" arrow>
                          <Typography
                            variant="body2"
                            sx={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,        // hiển thị tối đa 2 dòng
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              overflowWrap: "anywhere",  // xử lý chuỗi dài không có khoảng trắng
                            }}
                          >
                            {x.note ? x.note : "Không có ghi chú."}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={EXCHANGE_STATUS_LABEL[st] ?? x.status ?? "—"}
                        color={EXCHANGE_STATUS_COLOR[st] || "default"}
                      />
                    </TableCell>

                    <TableCell>{formatDateTimeVN(created)}</TableCell>

                    <TableCell align="right">{details.length}</TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Xem chi tiết">
                          <IconButton size="small" onClick={() => handleView(x)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Đổi trạng thái">
                          <IconButton size="small" onClick={(e) => openStatusMenu(e, x)}>
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>

                  </TableRow>
                );
              })}

              {!loading && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Không có phiếu đổi/trả nào.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1.5 }}>
          <Pagination
            size="small"
            count={totalPages}
            page={currentPage}
            onChange={(_, v) => setPage(v)}
          />
        </Box>
      </Paper>

      <ExchangeDetailDialog
        sel={sel}
        loading={detailLoading}
        onClose={() => setSel(null)}
      />
      <Menu
  anchorEl={statusMenu.anchorEl}
  open={Boolean(statusMenu.anchorEl)}
  onClose={closeStatusMenu}
  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
  transformOrigin={{ vertical: "top", horizontal: "right" }}
>
  {EXCHANGE_STATUS_OPTIONS.map((opt) => {
    const current = String(statusMenu.exchange?.status || "").toLowerCase();
    const isSelected = current === opt.value;

    const blockedBack =
    (current === "approved" && ["pending", "rejected", "cancelled"].includes(opt.value)) ||
    (current === "in_transit" && ["pending", "approved", "rejected", "cancelled"].includes(opt.value)) ||
    (current === "completed" && opt.value !== "completed");
    return (
      <MenuItem
        key={opt.value}
        selected={isSelected}
        disabled={isSelected || blockedBack}
        onClick={() => handlePickExchangeStatus(opt.value)}
      >
        <ListItemIcon>
          {opt.value === "approved" || opt.value === "completed" ? (
            <CheckCircleIcon fontSize="small" color="success" />
          ) : opt.value === "rejected" || opt.value === "cancelled" ? (
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

    </Box>
  );
}

function ExchangeDetailDialog({ sel, loading, onClose }) {
   const open = !!sel || loading;

  const exchange = sel ?? {};
  const st = String(exchange.status ?? "").toLowerCase();

  const details =
    exchange.exchange_details ??
    exchange.exchangeDetails ??
    exchange.details ??
    [];

  const created =
    exchange.created_at ?? exchange.create_exchange ?? exchange.createdAt ?? null;


  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Phiếu đổi/trả #{exchange?.id ?? "—"}
        </Typography>

        {loading ? (
          <Chip size="small" label="Đang tải..." />
        ) : (
          <Chip
            size="small"
            label={EXCHANGE_STATUS_LABEL[st] ?? exchange.status ?? "—"}
            color={EXCHANGE_STATUS_COLOR[st] || "default"}
            sx={{ textTransform: "capitalize" }}
          />
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Thông tin chung
                </Typography>
                <Typography variant="body2">
                  Order ID: {exchange?.order_id ?? "—"}
                </Typography>
                <Typography variant="body2">
                  User ID: {exchange?.user_id ?? "—"}
                </Typography>
                <Typography variant="body2">
                  Ngày tạo: {formatDateTimeVN(created)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Ghi chú
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {exchange?.note ? exchange.note : "Không có ghi chú."}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Chi tiết đổi/trả
            </Typography>

            {!Array.isArray(details) || details.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Phiếu đổi/trả này không có dòng chi tiết hoặc API chưa trả về.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right" sx={{ width: 70 }}>
                      #
                    </TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>
                      Mã chi tiết sản phẩm cũ
                    </TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>
                      Số lượng
                    </TableCell>
                    
                    <TableCell align="right" sx={{ width: 140 }}>
                      Sản phẩm mới
                    </TableCell>
                    <TableCell sx={{ width:260 }}>Lý do</TableCell>
                  </TableRow>
                </TableHead>

               <TableBody>
              {details.map((d, idx) => {
                // backend trả snake_case
                const currentDetail = d.product_detail ?? d.productDetail ?? null;

                // hiện tại backend chỉ trả ID số cho old/new
                
                const newVal = d.product_new_detail ?? d.productNewDetail ?? d.product_new_id ?? d.product_new ?? null;

                return (
                  <TableRow key={d.id ?? idx} hover>
                    <TableCell align="right">{d.id ?? idx + 1}</TableCell>

                    <TableCell>{formatProductDetail(currentDetail)}</TableCell>

                    <TableCell align="right">{d.quantity ?? "—"}</TableCell>

                    

                    <TableCell>{formatProductDetail(newVal)}</TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {d.reason ? d.reason : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
              </Table>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
