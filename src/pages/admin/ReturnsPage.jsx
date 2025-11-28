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
    MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";

// Dùng API_BASE cục bộ để tránh import vòng lặp với AdminPanel
const API_BASE = "http://127.0.0.1:8000";

export default function ReturnsPage({ setSnack }) {
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [openCreate, setOpenCreate] = React.useState(false);
    const [sel, setSel] = React.useState(null);
    const [creating, setCreating] = React.useState(false);
    const [updating, setUpdating] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [orders, setOrders] = React.useState([]);
    const [productDetails, setProductDetails] = React.useState([]);
    const [optsLoading, setOptsLoading] = React.useState(false);

    const PAGE_SIZE = 12;
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);

    const getStoredToken = () => {
        let token = localStorage.getItem("access_token") || localStorage.getItem("token") || null;
        if (!token) return null;
        try {
            const maybe = JSON.parse(token);
            if (typeof maybe === "string") token = maybe;
        } catch (e) { }
        return String(token).trim();
    };

    const extractErrorMessage = async (res) => {
        try {
            const j = await res.json();
            if (j && (j.message || j.error || j.errors)) {
                if (typeof j.message === "string") return j.message;
                if (typeof j.error === "string") return j.error;
                if (j.errors) {
                    if (typeof j.errors === "string") return j.errors;
                    if (typeof j.errors === "object") return JSON.stringify(j.errors);
                }
                return JSON.stringify(j);
            }
        } catch (e) { }
        try {
            const txt = await res.text();
            if (txt) return txt;
        } catch (e) { }
        return "Có lỗi xảy ra";
    };

    const fetchReturns = React.useCallback(async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/returns`, {
                headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!res.ok) throw new Error("fetch returns failed");
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
            setItems(arr);
            setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Không tải returns" });
            setItems([]);
        } finally { setLoading(false); }
    }, [setSnack]);

    const fetchOptions = React.useCallback(async () => {
        setOptsLoading(true);
        const token = getStoredToken();
        try {
            const [oRes, pdRes] = await Promise.all([
                fetch(`${API_BASE}/api/orders`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }),
                fetch(`${API_BASE}/api/product-details?with=product,color,size`),
            ]);
            const oData = oRes.ok ? await oRes.json().catch(() => []) : [];
            const pdData = pdRes.ok ? await pdRes.json().catch(() => []) : [];
            const normalize = d => Array.isArray(d) ? d : (d.data ?? d.items ?? []);
            setOrders(normalize(oData));
            setProductDetails(normalize(pdData));
        } catch (err) {
            console.error("fetchOptions returns", err);
            setSnack({ severity: "warning", message: "Không tải được orders hoặc product details" });
            setOrders([]); setProductDetails([]);
        } finally { setOptsLoading(false); }
    }, [setSnack]);

    React.useEffect(() => { fetchReturns(); fetchOptions(); }, [fetchReturns, fetchOptions]);

    const [form, setForm] = React.useState({
        order_id: "",
        product_detail_id: "",
        quantity: 1,
        reason: "",
        requested_by: "",
    });

    const resetForm = () => setForm({ order_id: "", product_detail_id: "", quantity: 1, reason: "", requested_by: "" });

    const handleCreate = async () => {
        if (!form.order_id) { setSnack({ severity: "error", message: "Chọn order" }); return; }
        if (!form.product_detail_id) { setSnack({ severity: "error", message: "Chọn product detail" }); return; }
        if (!form.quantity || Number(form.quantity) <= 0) { setSnack({ severity: "error", message: "Quantity phải > 0" }); return; }
        if (!form.reason || String(form.reason).trim() === "") { setSnack({ severity: "error", message: "Nhập lý do" }); return; }

        if (creating) return;
        setCreating(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/returns`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    order_id: form.order_id,
                    product_detail_id: form.product_detail_id,
                    quantity: Number(form.quantity),
                    reason: form.reason,
                    requested_by: form.requested_by || null,
                }),
            });
            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                setSnack({ severity: "error", message: msg || "Tạo phiếu thất bại" });
                return;
            }
            setSnack({ severity: "success", message: "Tạo phiếu thành công" });
            setOpenCreate(false);
            resetForm();
            await fetchReturns();
        } catch (err) {
            console.error("create return error", err);
            setSnack({ severity: "error", message: "Tạo phiếu lỗi" });
        } finally { setCreating(false); }
    };

    const handleUpdate = async (id, patch) => {
        if (updating) return;
        setUpdating(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/returns/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(patch),
            });
            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                setSnack({ severity: "error", message: msg || "Cập nhật thất bại" });
                return;
            }
            setSnack({ severity: "success", message: "Cập nhật thành công" });
            setSel(null);
            await fetchReturns();
        } catch (err) {
            console.error("update return", err);
            setSnack({ severity: "error", message: "Cập nhật lỗi" });
        } finally { setUpdating(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa phiếu đổi/trả?")) return;
        if (deleting) return;
        setDeleting(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/returns/${id}`, {
                method: "DELETE",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                setSnack({ severity: "error", message: msg || "Xóa thất bại" });
                return;
            }
            setSnack({ severity: "success", message: "Đã xóa phiếu" });
            await fetchReturns();
            setSel(null);
        } catch (err) {
            console.error("delete return", err);
            setSnack({ severity: "error", message: "Xóa thất bại" });
        } finally { setDeleting(false); }
    };

    const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Returns / Exchanges</Typography>
                <Stack direction="row" spacing={1}>
                    <Button onClick={fetchReturns}>Refresh</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setOpenCreate(true); }}>
                        Create return
                    </Button>
                </Stack>
            </Stack>

            <Paper>
                {loading ? (
                    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>#</TableCell>
                                    <TableCell>Order</TableCell>
                                    <TableCell>Product</TableCell>
                                    <TableCell>Qty</TableCell>
                                    <TableCell>Reason</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Requested by</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visible.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>Không có phiếu</TableCell>
                                    </TableRow>
                                ) : visible.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.id}</TableCell>
                                        <TableCell>{r.order_id ?? (r.order?.id ?? "—")}</TableCell>
                                        <TableCell>{r.product_detail?.product?.name ?? `#${r.product_detail_id}`}</TableCell>
                                        <TableCell>{r.quantity ?? "—"}</TableCell>
                                        <TableCell>{r.reason ?? "—"}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" component="span" color={r.status === "approved" ? "success.main" : r.status === "rejected" ? "error.main" : "text.secondary"}>
                                                {r.status ?? "pending"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{r.requested_by ?? r.user?.email ?? "—"}</TableCell>
                                        <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</TableCell>
                                        <TableCell>
                                            <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setSel(r)}>View</Button>
                                            <Button size="small" onClick={() => handleUpdate(r.id, { status: "approved" })}>Approve</Button>
                                            <Button size="small" color="error" onClick={() => handleUpdate(r.id, { status: "rejected" })}>Reject</Button>
                                            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(r.id)}>Delete</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} />
                        </Box>
                    </TableContainer>
                )}
            </Paper>

            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Return / Exchange</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            select
                            label="Order"
                            fullWidth
                            value={form.order_id}
                            onChange={(e) => setForm({ ...form, order_id: e.target.value })}
                            helperText={optsLoading ? "Loading orders..." : ""}
                        >
                            <MenuItem value="">-- select order --</MenuItem>
                            {orders.map(o => <MenuItem key={o.id} value={o.id}>#{o.id} — {o.name ?? o.user?.email ?? "—"}</MenuItem>)}
                        </TextField>

                        <TextField
                            select
                            label="Product detail"
                            fullWidth
                            value={form.product_detail_id}
                            onChange={(e) => setForm({ ...form, product_detail_id: e.target.value })}
                            helperText={optsLoading ? "Loading product details..." : ""}
                        >
                            <MenuItem value="">-- select --</MenuItem>
                            {productDetails.map(pd => (
                                <MenuItem key={pd.id} value={pd.id}>
                                    {pd.product?.name ?? `#${pd.product_id}`} — {pd.color?.name ?? "—"} — {pd.size?.name ?? "—"}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField label="Quantity" type="number" fullWidth value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                        <TextField label="Reason" fullWidth multiline minRows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                        <TextField label="Requested by (email/name)" fullWidth value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Return #{sel?.id}</DialogTitle>
                <DialogContent>
                    {sel ? (
                        <Stack spacing={1}>
                            <Typography><strong>Order:</strong> {sel.order_id ?? sel.order?.id ?? "—"}</Typography>
                            <Typography><strong>Product:</strong> {sel.product_detail?.product?.name ?? `#${sel.product_detail_id}`}</Typography>
                            <Typography><strong>Qty:</strong> {sel.quantity}</Typography>
                            <Typography><strong>Reason:</strong> {sel.reason}</Typography>
                            <Typography><strong>Requested by:</strong> {sel.requested_by ?? sel.user?.email ?? "—"}</Typography>
                            <TextField
                                select
                                label="Status"
                                value={sel.status ?? "pending"}
                                onChange={(e) => setSel({ ...sel, status: e.target.value })}
                                helperText="Change status then click Update"
                            >
                                <MenuItem value="pending">pending</MenuItem>
                                <MenuItem value="approved">approved</MenuItem>
                                <MenuItem value="rejected">rejected</MenuItem>
                                <MenuItem value="refunded">refunded</MenuItem>
                            </TextField>
                            <TextField
                                label="Admin note (optional)"
                                fullWidth
                                multiline
                                minRows={2}
                                value={sel.admin_note ?? ""}
                                onChange={(e) => setSel({ ...sel, admin_note: e.target.value })}
                            />
                        </Stack>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSel(null)} disabled={updating}>Close</Button>
                    <Button onClick={() => handleUpdate(sel.id, { status: sel.status, admin_note: sel.admin_note ?? null })} variant="contained" disabled={updating}>
                        {updating ? "Updating..." : "Update"}
                    </Button>
                    <Button color="error" onClick={() => handleDelete(sel.id)} disabled={deleting}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
