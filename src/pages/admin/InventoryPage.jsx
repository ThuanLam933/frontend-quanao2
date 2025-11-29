import React from "react";
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
    Pagination,
    Stack,
    Chip,
    MenuItem,
    Divider
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

const API_BASE = "http://127.0.0.1:8000";

// mapping màu theo type
const TYPE_COLOR = {
    receipt: "success",
    sale: "error",
    adjustment: "warning",
    revert_receipt: "info",
    import: "secondary",
    order: "primary",
    other: "default"
};

const TYPE_OPTIONS = [
    { value: "", label: "Tất cả" },
    { value: "receipt", label: "Receipt (nhập kho)" },
    { value: "sale", label: "Sale (bán ra)" },
    { value: "adjustment", label: "Adjustment (điều chỉnh)" },
    { value: "revert_receipt", label: "Revert receipt" },
    { value: "import", label: "Import" },
    { value: "order", label: "Order" },
    { value: "other", label: "Khác" }
];

export default function InventoryPage({ setSnack }) {
    const [logs, setLogs] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);

    const [filters, setFilters] = React.useState({
        type: "",
        productDetailId: "",
        dateFrom: "",
        dateTo: "",
        q: ""
    });

    const [adjustOpen, setAdjustOpen] = React.useState(false);
    const [logOnlyOpen, setLogOnlyOpen] = React.useState(false);
    const token = localStorage.getItem("access_token");

    const fetchLogs = React.useCallback(
        async (p = 1) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.append("page", p);

                if (filters.type) params.append("type", filters.type);
                if (filters.productDetailId) params.append("product_detail_id", filters.productDetailId);
                if (filters.dateFrom) params.append("date_from", filters.dateFrom);
                if (filters.dateTo) params.append("date_to", filters.dateTo);
                if (filters.q) params.append("q", filters.q);

                const url = `${API_BASE}/api/admin/inventory/logs?${params.toString()}`;
                const res = await fetch(url, {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });
                if (!res.ok) throw new Error(`Fetch logs failed: ${res.status}`);
                const data = await res.json();

                const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
                setLogs(arr);

                const lastPage =
                    (!Array.isArray(data) && (data.last_page || data.lastPage || data.meta?.last_page)) || 1;
                setTotalPages(Math.max(1, Number(lastPage) || 1));
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } catch (err) {
                console.error("fetchLogs error", err);
                setSnack({ severity: "error", message: "Không tải được lịch sử tồn kho." });
                setLogs([]);
            } finally {
                setLoading(false);
            }
        },
        [filters, token, setSnack]
    );

    React.useEffect(() => {
        fetchLogs(1);
    }, [fetchLogs]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const applyFilters = () => {
        fetchLogs(1);
    };

    const resetFilters = () => {
        setFilters({
            type: "",
            productDetailId: "",
            dateFrom: "",
            dateTo: "",
            q: ""
        });
        // gọi lại trang 1 với filter rỗng
        setTimeout(() => fetchLogs(1), 0);
    };

    const handleRevertReceipt = async (receiptId) => {
        if (!receiptId) {
            setSnack({ severity: "warning", message: "Không có receiptId để revert." });
            return;
        }
        if (!window.confirm(`Revert receipt #${receiptId}?`)) return;

        try {
            const endpoint = `${API_BASE}/api/admin/inventory/revert-receipt/${receiptId}`;
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({})
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                setSnack({ severity: "error", message: txt || `Revert receipt thất bại (${res.status})` });
                return;
            }
            setSnack({ severity: "success", message: "Đã revert receipt và cập nhật tồn kho." });
            fetchLogs(page);
        } catch (err) {
            console.error("handleRevertReceipt error", err);
            setSnack({ severity: "error", message: "Lỗi khi revert receipt." });
        }
    };

    const handleAdjustSubmit = async (payload) => {
        const endpoint = `${API_BASE}/api/admin/inventory/adjust`;
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                setSnack({ severity: "error", message: txt || `Điều chỉnh tồn kho thất bại (${res.status})` });
                return;
            }
            setSnack({ severity: "success", message: "Đã điều chỉnh tồn kho." });
            setAdjustOpen(false);
            fetchLogs(page);
        } catch (err) {
            console.error("handleAdjustSubmit error", err);
            setSnack({ severity: "error", message: "Lỗi khi điều chỉnh tồn kho." });
        }
    };

    const handleLogOnlySubmit = async (payload) => {
        const endpoint = `${API_BASE}/api/admin/inventory/logs`;
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                setSnack({ severity: "error", message: txt || `Tạo log tồn kho thất bại (${res.status})` });
                return;
            }
            setSnack({ severity: "success", message: "Đã tạo log tồn kho (không đổi số lượng)." });
            setLogOnlyOpen(false);
            fetchLogs(page);
        } catch (err) {
            console.error("handleLogOnlySubmit error", err);
            setSnack({ severity: "error", message: "Lỗi khi tạo log tồn kho." });
        }
    };

    return (
        <Box>
            {/* HEADER */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Inventory / Stock logs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Theo dõi mọi thay đổi tồn kho theo thời gian.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => fetchLogs(page)}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<HistoryIcon />}
                        onClick={() => setLogOnlyOpen(true)}
                    >
                        Log only
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setAdjustOpen(true)}
                    >
                        Create adjust
                    </Button>
                </Stack>
            </Stack>

            {/* FILTER BAR */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <FilterAltIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Bộ lọc
                    </Typography>
                </Stack>

                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    sx={{ mb: 1 }}
                >
                    <TextField
                        size="small"
                        label="Tìm kiếm (ID / tên SP / ghi chú...)"
                        fullWidth
                        value={filters.q}
                        onChange={(e) => handleFilterChange("q", e.target.value)}
                    />

                    <TextField
                        size="small"
                        label="Product detail ID"
                        sx={{ minWidth: 180 }}
                        value={filters.productDetailId}
                        onChange={(e) => handleFilterChange("productDetailId", e.target.value)}
                    />

                    <TextField
                        size="small"
                        select
                        label="Type"
                        sx={{ minWidth: 180 }}
                        value={filters.type}
                        onChange={(e) => handleFilterChange("type", e.target.value)}
                    >
                        {TYPE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>

                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={2}>
                        <TextField
                            size="small"
                            type="date"
                            label="Từ ngày"
                            InputLabelProps={{ shrink: true }}
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="Đến ngày"
                            InputLabelProps={{ shrink: true }}
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                        />
                    </Stack>

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={resetFilters}>
                            Reset
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={applyFilters}
                        >
                            Áp dụng
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {/* TABLE */}
            <Paper sx={{ position: "relative" }}>
                {loading && (
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            bgcolor: "rgba(255,255,255,0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width={60}>#</TableCell>
                                <TableCell>ProductDetail</TableCell>
                                <TableCell>Nguồn</TableCell>
                                <TableCell align="right">Cập nhật</TableCell>
                                <TableCell align="right">Số lượng ban đầu</TableCell>
                                <TableCell align="right">Số lượng sau</TableCell>
                                <TableCell align="right">Related</TableCell>
                                <TableCell>Người dùng</TableCell>
                                <TableCell width={120} align="center">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((row) => (
                                <TableRow hover key={row.id}>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {row.product_detail_id}
                                            {row.product_detail?.product?.name
                                                ? ` - ${row.product_detail.product.name}`
                                                : ""}
                                        </Typography>
                                        {row.note && (
                                            <Typography variant="caption" color="text.secondary">
                                                {row.note}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={row.type || "-"}
                                            color={TYPE_COLOR[row.type] || "default"}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 500,
                                                color:
                                                    Number(row.change) > 0
                                                        ? "success.main"
                                                        : Number(row.change) < 0
                                                            ? "error.main"
                                                            : "text.primary"
                                            }}
                                        >
                                            {Number(row.change) > 0 ? `+${row.change}` : row.change}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{row.quantity_before}</TableCell>
                                    <TableCell align="right">{row.quantity_after}</TableCell>
                                    <TableCell align="right">{row.related_id ?? "-"}</TableCell>
                                    <TableCell>
                                        {row.user?.name ?? row.user_id ?? "-"}
                                    </TableCell>
                                    <TableCell align="center">
                                        {row.type === "receipt" && row.related_id ? (
                                            <Button
                                                size="small"
                                                color="warning"
                                                onClick={() => handleRevertReceipt(row.related_id)}
                                            >
                                                Revert
                                            </Button>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                -
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {logs.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">
                                        <Box sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Không có dữ liệu.
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider />
                <Box sx={{ display: "flex", justifyContent: "center", p: 1.5 }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, v) => fetchLogs(v)}
                        size="small"
                    />
                </Box>
            </Paper>

            {/* DIALOGS */}
            <InventoryAdjustDialog
                open={adjustOpen}
                onClose={() => setAdjustOpen(false)}
                onSubmit={handleAdjustSubmit}
            />

            <InventoryLogOnlyDialog
                open={logOnlyOpen}
                onClose={() => setLogOnlyOpen(false)}
                onSubmit={handleLogOnlySubmit}
            />
        </Box>
    );
}

// =================== DIALOG: MANUAL ADJUST ===================
function InventoryAdjustDialog({ open, onClose, onSubmit }) {
    const [form, setForm] = React.useState({
        product_detail_id: "",
        change: 0,
        type: "adjustment",
        note: ""
    });
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setForm({ product_detail_id: "", change: 0, type: "adjustment", note: "" });
        }
    }, [open]);

    const handleSaveClick = async () => {
        if (!form.product_detail_id) {
            alert("product_detail_id không được để trống");
            return;
        }
        if (!form.change || Number(form.change) === 0 || Number.isNaN(Number(form.change))) {
            alert("Change phải là số khác 0");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                product_detail_id: form.product_detail_id,
                change: Number(form.change),
                type: form.type || "adjustment",
                note: form.note || ""
            };
            await onSubmit(payload);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Manual stock adjust</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Product detail ID"
                        fullWidth
                        value={form.product_detail_id}
                        onChange={(e) =>
                            setForm({ ...form, product_detail_id: e.target.value })
                        }
                    />
                    <TextField
                        label="Change (+ tăng, - giảm)"
                        type="number"
                        fullWidth
                        value={form.change}
                        onChange={(e) => setForm({ ...form, change: e.target.value })}
                    />
                    <TextField
                        select
                        label="Type"
                        fullWidth
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                        <MenuItem value="adjustment">Adjustment</MenuItem>
                        <MenuItem value="receipt">Receipt</MenuItem>
                        <MenuItem value="sale">Sale</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                    </TextField>
                    <TextField
                        label="Note"
                        fullWidth
                        multiline
                        minRows={2}
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button onClick={handleSaveClick} variant="contained" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// =================== DIALOG: LOG ONLY ===================
function InventoryLogOnlyDialog({ open, onClose, onSubmit }) {
    const [form, setForm] = React.useState({
        product_detail_id: "",
        change: 0,
        type: "import",
        related_id: "",
        note: ""
    });
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setForm({ product_detail_id: "", change: 0, type: "import", related_id: "", note: "" });
        }
    }, [open]);

    const handleSaveClick = async () => {
        if (!form.product_detail_id) {
            alert("product_detail_id không được để trống");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                product_detail_id: form.product_detail_id,
                change: form.change ? Number(form.change) : 0,
                type: form.type || "import",
                related_id: form.related_id || null,
                note: form.note || ""
            };
            await onSubmit(payload);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create inventory log (only)</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Product detail ID"
                        fullWidth
                        value={form.product_detail_id}
                        onChange={(e) =>
                            setForm({ ...form, product_detail_id: e.target.value })
                        }
                    />
                    <TextField
                        label="Change (optional, không đổi quantity)"
                        type="number"
                        fullWidth
                        value={form.change}
                        onChange={(e) => setForm({ ...form, change: e.target.value })}
                        helperText="Có thể 0 nếu chỉ lưu note."
                    />
                    <TextField
                        label="Type"
                        fullWidth
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                    />
                    <TextField
                        label="Related ID (optional)"
                        fullWidth
                        value={form.related_id}
                        onChange={(e) => setForm({ ...form, related_id: e.target.value })}
                        helperText="Ví dụ: id phiếu nhập cũ, chứng từ, v.v."
                    />
                    <TextField
                        label="Note"
                        fullWidth
                        multiline
                        minRows={2}
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button onClick={handleSaveClick} variant="contained" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
