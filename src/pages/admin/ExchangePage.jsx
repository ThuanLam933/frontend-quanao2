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
  Tooltip,
  Divider,
  Pagination,
  Grid,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

const API_BASE = "http://127.0.0.1:8000";
const PAGE_SIZE = 12;

const EXCHANGE_STATUS_COLOR = {
  pending: "warning",
  confirmed: "success",
  cancelled: "error",
  canceled: "error",
  completed: "success",
};

const EXCHANGE_STATUS_LABEL = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
  completed: "Hoàn thành",
};

const parseIso = (s) => {
  if (!s) return null;
  const normalized = String(s).replace(/\.(\d{3})\d*(Z)$/, ".$1$2");
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

  return `${HH}:${MI} ${dd}/${mm}/${yyyy}`;
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
                  Order
                </TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  User
                </TableCell>
                <TableCell>Ghi chú</TableCell>
                <TableCell align="center" sx={{ width: 140 }}>
                  Trạng thái
                </TableCell>
                <TableCell sx={{ width: 180 }}>Ngày tạo</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  Số dòng SP
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
                const created =
                  x.create_exchange ?? x.created_at ?? x.createdAt ?? null;

                return (
                  <TableRow hover key={x.id}>
                    <TableCell align="right">{x.id}</TableCell>
                    <TableCell align="right">{x.order_id ?? "—"}</TableCell>
                    <TableCell align="right">{x.user_id ?? "—"}</TableCell>

                    <TableCell>
                      <Typography variant="body2" noWrap title={x.note ?? ""}>
                        {x.note ? x.note : "—"}
                      </Typography>
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
                      <Tooltip title="Xem chi tiết">
                        <IconButton size="small" onClick={() => handleView(x)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
    </Box>
  );
}

function ExchangeDetailDialog({ sel, loading, onClose }) {
  const open = !!sel || loading;

  const exchange = sel ?? {};
  const st = String(exchange.status ?? "").toLowerCase();

  const details =
    exchange.exchangeDetails ??
    exchange.exchange_details ??
    exchange.details ??
    [];

  const created =
    exchange.create_exchange ?? exchange.created_at ?? exchange.createdAt ?? null;

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
                  {exchange?.note ? exchange.note : "—"}
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
                      Sản phẩm cũ
                    </TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>
                      Sản phẩm mới
                    </TableCell>
                    <TableCell>Lý do</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {details.map((d, idx) => (
                    <TableRow key={d.id ?? idx} hover>
                      <TableCell align="right">{d.id ?? idx + 1}</TableCell>
                      <TableCell align="right">
                        {d.product_detail_id ?? "—"}
                      </TableCell>
                      <TableCell align="right">{d.quantity ?? "—"}</TableCell>
                      <TableCell align="right">{d.product_old_id ?? "—"}</TableCell>
                      <TableCell align="right">{d.product_new_id ?? "—"}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {d.reason ? d.reason : "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
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
