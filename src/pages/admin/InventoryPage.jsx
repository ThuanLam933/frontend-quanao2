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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";

const API_BASE = "http://127.0.0.1:8000";

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
            {/* Header giống ColorsPage: title + nút Create */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Inventory / Stock logs</Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchLogs(page)}>
                        Refresh
                    </Button>
                    <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => setLogOnlyOpen(true)}>
                        Log only
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdjustOpen(true)}>
                        Create adjust
                    </Button>
                </Stack>
            </Stack>

            {/* Bảng đơn giản như ColorsPage */}
            <Paper>
                {loading ? (
                    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>#</TableCell>
                                    <TableCell>ProductDetail</TableCell>
                                    <TableCell>Nguồn</TableCell>
                                    <TableCell>Cập Nhật</TableCell>
                                    <TableCell>Số lượng ban đầu</TableCell>
                                    <TableCell>Số lượng sau</TableCell>
                                    <TableCell>Related</TableCell>
                                    <TableCell>Người dùng</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.id}</TableCell>
                                        <TableCell>
                                            {row.product_detail_id}
                                            {row.product_detail?.product?.name ? ` - ${row.product_detail.product.name}` : ""}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={row.type || "-"}
                                                color={
                                                    row.type === "receipt" ? "success"
                                                        : row.type === "sale" ? "error"
                                                            : row.type === "adjustment" ? "warning"
                                                                : "default"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                color={
                                                    Number(row.change) > 0 ? "success.main"
                                                        : Number(row.change) < 0 ? "error.main"
                                                            : "text.primary"
                                                }
                                            >
                                                {Number(row.change) > 0 ? `+${row.change}` : row.change}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{row.quantity_before}</TableCell>
                                        <TableCell>{row.quantity_after}</TableCell>
                                        <TableCell>{row.related_id ?? "-"}</TableCell>
                                        <TableCell>{row.user?.name ?? row.user_id ?? "-"}</TableCell>
                                        <TableCell>
                                            {row.type === "receipt" && row.related_id ? (
                                                <Button size="small" color="warning" onClick={() => handleRevertReceipt(row.related_id)}>
                                                    Revert
                                                </Button>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {logs.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                Không có dữ liệu.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                            <Pagination count={totalPages} page={page} onChange={(_, v) => fetchLogs(v)} />
                        </Box>
                    </TableContainer>
                )}
            </Paper>

            {/* Dialog tạo adjust giống edit dialog ở ColorsPage */}
            <InventoryAdjustDialog
                open={adjustOpen}
                onClose={() => setAdjustOpen(false)}
                onSubmit={handleAdjustSubmit}
            />

            {/* Dialog log-only */}
            <InventoryLogOnlyDialog
                open={logOnlyOpen}
                onClose={() => setLogOnlyOpen(false)}
                onSubmit={handleLogOnlySubmit}
            />
        </Box>
    );
}

// Giữ dialog như cũ (đóng vai trò "edit/create" tương tự ColorsPage)
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
        if (!form.product_detail_id) { alert("product_detail_id không được để trống"); return; }
        if (!form.change || Number(form.change) === 0) { alert("Change phải khác 0"); return; }
        setSaving(true);
        try {
            const payload = {
                product_detail_id: form.product_detail_id,
                change: Number(form.change),
                type: form.type || "adjustment",
                note: form.note || ""
            };
            await onSubmit(payload);
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Manual stock adjust</DialogTitle>
            <DialogContent>
                <TextField label="Product detail ID" fullWidth sx={{ mt: 1 }} value={form.product_detail_id}
                    onChange={(e) => setForm({ ...form, product_detail_id: e.target.value })} />
                <TextField label="Change (+ tăng, - giảm)" type="number" fullWidth sx={{ mt: 1 }} value={form.change}
                    onChange={(e) => setForm({ ...form, change: e.target.value })} />
                <TextField select label="Type" fullWidth sx={{ mt: 1 }} value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <MenuItem value="adjustment">Adjustment</MenuItem>
                    <MenuItem value="receipt">Receipt</MenuItem>
                    <MenuItem value="sale">Sale</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                </TextField>
                <TextField label="Note" fullWidth multiline minRows={2} sx={{ mt: 1 }}
                    value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button onClick={handleSaveClick} variant="contained" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

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
        if (!form.product_detail_id) { alert("product_detail_id không được để trống"); return; }
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
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create inventory log (only)</DialogTitle>
            <DialogContent>
                <TextField label="Product detail ID" fullWidth sx={{ mt: 1 }} value={form.product_detail_id}
                    onChange={(e) => setForm({ ...form, product_detail_id: e.target.value })} />
                <TextField label="Change (optional, không đổi quantity)" type="number" fullWidth sx={{ mt: 1 }}
                    value={form.change} onChange={(e) => setForm({ ...form, change: e.target.value })}
                    helperText="Có thể 0 nếu chỉ lưu note." />
                <TextField label="Type" fullWidth sx={{ mt: 1 }} value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })} />
                <TextField label="Related ID (optional)" fullWidth sx={{ mt: 1 }} value={form.related_id}
                    onChange={(e) => setForm({ ...form, related_id: e.target.value })}
                    helperText="Ví dụ: id phiếu nhập cũ, chứng từ, v.v." />
                <TextField label="Note" fullWidth multiline minRows={2} sx={{ mt: 1 }} value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button onClick={handleSaveClick} variant="contained" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
