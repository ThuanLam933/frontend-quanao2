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
    IconButton,
    Tooltip,
    Divider,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

// Dùng API_BASE cục bộ để tránh circular import với AdminPanel
const API_BASE = "http://127.0.0.1:8000";
const PAGE_SIZE = 12;

export default function StockPage({ setSnack }) {
    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    const [openCreate, setOpenCreate] = React.useState(false);

    const [suppliers, setSuppliers] = React.useState([]);
    const [productDetails, setProductDetails] = React.useState([]);
    const [optsLoading, setOptsLoading] = React.useState(false);

    const [openSupplierModal, setOpenSupplierModal] = React.useState(false);
    const [supplierForm, setSupplierForm] = React.useState({
        name: "",
        email: "",
        phone: "",
        address: "",
    });
    const [supplierCreating, setSupplierCreating] = React.useState(false);

    const [form, setForm] = React.useState({
        suppliers_id: "",
        supplier_manual: { name: "", email: "", address: "", phone: "" },
        note: "",
        import_date: new Date().toISOString().slice(0, 10),
        items: [{ product_detail_id: "", qty: 1, price: 0 }],
    });

    const [viewReceipt, setViewReceipt] = React.useState(null);

    const [search, setSearch] = React.useState("");
    const [page, setPage] = React.useState(1);

    const getStoredToken = () => {
        let token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token") ||
            null;
        if (!token) return null;
        try {
            const maybe = JSON.parse(token);
            if (typeof maybe === "string") token = maybe;
        } catch (e) {}
        return String(token).trim();
    };

    const fetchStock = React.useCallback(async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/admin/receipts`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) throw new Error("fetch receipts failed");
            const data = await res.json();
            const arr = Array.isArray(data)
                ? data
                : data.data ?? data.items ?? [];
            setEntries(arr);
        } catch (err) {
            console.error(err);
            setSnack({
                severity: "error",
                message: "Không tải stock entries",
            });
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    const fetchOptions = React.useCallback(async () => {
        setOptsLoading(true);
        try {
            const token = getStoredToken();
            const [sRes, pdRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/suppliers`, {
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }),
                fetch(
                    `${API_BASE}/api/product-details?with=color,size,product`,
                    { headers: { Accept: "application/json" } }
                ),
            ]);

            const normalize = (d) =>
                Array.isArray(d) ? d : d.data ?? d.items ?? [];

            const sData = sRes.ok ? await sRes.json().catch(() => []) : [];
            const pdData = pdRes.ok ? await pdRes.json().catch(() => []) : [];

            setSuppliers(normalize(sData));
            setProductDetails(normalize(pdData));
        } catch (err) {
            console.error("fetchOptions", err);
            setSnack({
                severity: "warning",
                message: "Không tải được suppliers hoặc product details",
            });
            setSuppliers([]);
            setProductDetails([]);
        } finally {
            setOptsLoading(false);
        }
    }, [setSnack]);

    React.useEffect(() => {
        fetchStock();
        fetchOptions();
    }, [fetchStock, fetchOptions]);

    const addItemRow = React.useCallback(() => {
        setForm((f) => ({
            ...f,
            items: [...f.items, { product_detail_id: "", qty: 1, price: 0 }],
        }));
    }, []);

    const removeItemRow = React.useCallback((idx) => {
        setForm((f) => ({
            ...f,
            items: f.items.filter((_, i) => i !== idx),
        }));
    }, []);

    const updateItem = React.useCallback((idx, field, value) => {
        setForm((f) => {
            const items = f.items.map((it, i) => {
                if (i !== idx) return it;
                if (field === "qty") {
                    const n = Number(value);
                    return { ...it, qty: Number.isNaN(n) ? 0 : n };
                }
                if (field === "price") {
                    const n = Number(value);
                    return { ...it, price: Number.isNaN(n) ? 0 : n };
                }
                return { ...it, [field]: value };
            });
            return { ...f, items };
        });
    }, []);

    const findDetail = React.useCallback(
        (id) => {
            if (!id) return null;
            return (
                productDetails.find((d) => String(d.id) === String(id)) ?? null
            );
        },
        [productDetails]
    );

    const formatCurrency = (v) =>
        (Number(v) || 0).toLocaleString("vi-VN") + "₫";

    const computeLineTotal = (item) =>
        (Number(item.qty) || 0) * (Number(item.price) || 0);

    const computeGrandTotal = React.useMemo(
        () =>
            form.items.reduce((acc, it) => acc + computeLineTotal(it), 0),
        [form.items]
    );

    const extractErrorMessage = async (res) => {
        try {
            const j = await res.json();
            if (j && (j.message || j.error || j.errors)) {
                if (typeof j.message === "string") return j.message;
                if (typeof j.error === "string") return j.error;
                if (j.errors) {
                    return typeof j.errors === "object"
                        ? JSON.stringify(j.errors)
                        : String(j.errors);
                }
                return JSON.stringify(j);
            }
        } catch (e) {}
        try {
            const txt = await res.text();
            if (txt) return txt;
        } catch (e) {}
        return "Có lỗi xảy ra";
    };

    const [creatingReceipt, setCreatingReceipt] = React.useState(false);
    const handleCreate = React.useCallback(async () => {
        if (!form.suppliers_id) {
            setSnack({
                severity: "error",
                message:
                    "Vui lòng chọn supplier (hoặc tạo supplier bằng nút 'Tạo supplier') trước khi tạo phiếu.",
            });
            return;
        }
        if (!Array.isArray(form.items) || form.items.length === 0) {
            setSnack({ severity: "error", message: "Thêm ít nhất 1 item" });
            return;
        }
        for (const it of form.items) {
            if (!it.product_detail_id) {
                setSnack({
                    severity: "error",
                    message:
                        "Chọn product detail cho tất cả item trong phiếu nhập.",
                });
                return;
            }
            if (!it.qty || Number(it.qty) <= 0) {
                setSnack({
                    severity: "error",
                    message: "Quantity phải lớn hơn 0",
                });
                return;
            }
            if (it.price === "" || Number(it.price) < 0) {
                setSnack({
                    severity: "error",
                    message: "Price không hợp lệ",
                });
                return;
            }
        }

        if (creatingReceipt) return;
        setCreatingReceipt(true);
        try {
            const token = getStoredToken();
            const payload = {
                suppliers_id: form.suppliers_id,
                note: form.note || "",
                import_date:
                    form.import_date ||
                    new Date().toISOString().slice(0, 10),
                items: form.items.map((it) => ({
                    product_detail_id: it.product_detail_id,
                    quantity: Number(it.qty),
                    price: Number(it.price),
                })),
            };
            const res = await fetch(`${API_BASE}/api/admin/receipts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                setSnack({
                    severity: "error",
                    message: msg || "Tạo phiếu nhập thất bại",
                });
                return;
            }
            await res.json();
            setSnack({
                severity: "success",
                message: "Tạo phiếu nhập thành công",
            });
            setOpenCreate(false);
            setForm({
                suppliers_id: "",
                supplier_manual: {
                    name: "",
                    email: "",
                    address: "",
                    phone: "",
                },
                note: "",
                import_date: new Date().toISOString().slice(0, 10),
                items: [{ product_detail_id: "", qty: 1, price: 0 }],
            });
            await fetchStock();
            await fetchOptions();
        } catch (err) {
            console.error("handleCreate error", err);
            setSnack({ severity: "error", message: "Tạo thất bại" });
        } finally {
            setCreatingReceipt(false);
        }
    }, [form, creatingReceipt, fetchStock, fetchOptions, setSnack]);

    const openSupplierCreate = () => {
        setSupplierForm({ name: "", email: "", phone: "", address: "" });
        setOpenSupplierModal(true);
    };

    const handleCreateSupplier = async () => {
        if (!supplierForm.name || supplierForm.name.trim() === "") {
            setSnack({
                severity: "error",
                message: "Tên supplier là bắt buộc",
            });
            return;
        }
        setSupplierCreating(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/admin/suppliers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(supplierForm),
            });
            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                setSnack({
                    severity: "error",
                    message: msg || "Tạo supplier thất bại",
                });
                return;
            }
            const created = await res.json();
            setSnack({
                severity: "success",
                message: "Tạo supplier thành công",
            });
            await fetchOptions();
            setForm((f) => ({
                ...f,
                suppliers_id:
                    created.id ??
                    created.ID ??
                    created.data?.id ??
                    created.id,
            }));
            setOpenSupplierModal(false);
        } catch (err) {
            console.error("create supplier error", err);
            setSnack({
                severity: "error",
                message: "Tạo supplier thất bại",
            });
        } finally {
            setSupplierCreating(false);
        }
    };

    const handleDeleteReceipt = async (e) => {
        if (
            !window.confirm(
                "Xóa phiếu nhập? Hành động có thể không rollback tồn kho."
            )
        )
            return;
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/admin/receipts/${e.id}`, {
                method: "DELETE",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) throw new Error("Delete failed");
            setSnack({ severity: "success", message: "Đã xóa phiếu" });
            fetchStock();
            await fetchOptions();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Xóa thất bại" });
        }
    };

    const ProductDetailPreview = ({ detail }) => {
        if (!detail)
            return (
                <Typography variant="body2" color="text.secondary">
                    Chưa chọn sản phẩm
                </Typography>
            );

        return (
            <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {detail.product?.name ?? `#${detail.id}`}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                >
                    Màu: {detail.color?.name ?? "—"}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                >
                    Size: {detail.size?.name ?? "—"}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                >
                    Giá bán (site):{" "}
                    {detail.price ? formatCurrency(detail.price) : "—"}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                >
                    Tồn kho: {detail.quantity ?? "—"}
                </Typography>
            </Box>
        );
    };

    // ----- FILTER & PAGINATION -----
    const filteredEntries = entries.filter((e) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const supplierName = e.supplier?.name?.toLowerCase() ?? "";
        const supplierNote = String(e.suppliers_id ?? "")
            .toLowerCase()
            .trim();
        const idStr = String(e.id ?? "");
        return (
            supplierName.includes(q) ||
            supplierNote.includes(q) ||
            idStr.includes(q)
        );
    });

    const totalPages = Math.max(
        1,
        Math.ceil(filteredEntries.length / PAGE_SIZE)
    );
    const currentPage = Math.min(page, totalPages);
    const visibleEntries = filteredEntries.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    return (
        <Box>
            {/* HEADER */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Stock Entries (Receipts)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý phiếu nhập kho và nhà cung cấp.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<LocalShippingIcon />}
                        onClick={openSupplierCreate}
                    >
                        Tạo supplier
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenCreate(true)}
                    >
                        Create receipt
                    </Button>
                </Stack>
            </Stack>

            {/* SEARCH BAR */}
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
                            placeholder="Tìm theo ID hoặc tên supplier..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Tổng: {entries.length} phiếu
                    </Typography>
                </Stack>
            </Paper>

            {/* TABLE LIST */}
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
                            zIndex: 1,
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
                                <TableCell>Supplier</TableCell>
                                <TableCell>Import date</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell
                                    align="right"
                                    sx={{ width: 130 }}
                                >
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        align="center"
                                        sx={{ py: 6 }}
                                    >
                                        Không có phiếu nhập
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleEntries.map((e) => (
                                    <TableRow hover key={e.id}>
                                        <TableCell align="right">
                                            {e.id}
                                        </TableCell>
                                        <TableCell>
                                            {e.supplier?.name ??
                                                e.suppliers_id ??
                                                "—"}
                                        </TableCell>
                                        <TableCell>
                                            {e.import_date
                                                ? new Date(
                                                      e.import_date
                                                  ).toLocaleString("vi-VN")
                                                : e.created_at
                                                ? new Date(
                                                      e.created_at
                                                  ).toLocaleString("vi-VN")
                                                : "—"}
                                        </TableCell>
                                        <TableCell align="right">
                                            {e.total_price
                                                ? formatCurrency(
                                                      e.total_price
                                                  )
                                                : "—"}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                justifyContent="flex-end"
                                            >
                                                <Tooltip title="Xem chi tiết">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            setViewReceipt(e)
                                                        }
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xóa phiếu">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() =>
                                                            handleDeleteReceipt(
                                                                e
                                                            )
                                                        }
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
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

            {/* DIALOG CREATE RECEIPT – UI MỚI */}
            <Dialog
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                maxWidth="md"
                fullWidth
                scroll="paper"
                PaperProps={{
                    sx: {
                        mt: { xs: 6, sm: 8 }, // Đẩy dialog xuống dưới AppBar
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
                    Tạo phiếu nhập kho
                </DialogTitle>

                <DialogContent dividers sx={{ pt: 2 }}>
                    <Stack spacing={3}>
                        {/* SUPPLIER INFO */}
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600, mb: 1 }}
                            >
                                Thông tin nhà cung cấp
                            </Typography>

                            <Stack spacing={2}>
                                <TextField
                                    select
                                    label="Supplier (bắt buộc)"
                                    value={form.suppliers_id}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            suppliers_id: e.target.value,
                                        })
                                    }
                                    helperText={
                                        optsLoading
                                            ? "Loading suppliers..."
                                            : "Chọn supplier có sẵn. Nếu chưa có hãy bấm 'Tạo supplier'."
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="">-- chọn --</MenuItem>
                                    {suppliers.map((s) => (
                                        <MenuItem key={s.id} value={s.id}>
                                            {s.name}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    label="Ghi chú supplier (tuỳ chọn)"
                                    placeholder="vd: supplier tạm thời..."
                                    value={form.supplier_manual.name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            supplier_manual: {
                                                ...form.supplier_manual,
                                                name: e.target.value,
                                            },
                                        })
                                    }
                                    fullWidth
                                />
                            </Stack>
                        </Paper>

                        {/* RECEIPT META */}
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600, mb: 1 }}
                            >
                                Thông tin phiếu nhập
                            </Typography>

                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                            >
                                <TextField
                                    label="Ngày nhập"
                                    type="date"
                                    value={form.import_date}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            import_date: e.target.value,
                                        })
                                    }
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />

                                <TextField
                                    label="Ghi chú"
                                    value={form.note}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            note: e.target.value,
                                        })
                                    }
                                    fullWidth
                                />
                            </Stack>
                        </Paper>

                        {/* ITEM LIST */}
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: 600 }}
                                >
                                    Danh sách sản phẩm
                                </Typography>

                                <Button
                                    size="small"
                                    onClick={addItemRow}
                                    startIcon={<AddIcon />}
                                >
                                    Thêm sản phẩm
                                </Button>
                            </Stack>

                            <Stack spacing={2}>
                                {form.items.map((it, idx) => {
                                    const detail = findDetail(
                                        it.product_detail_id
                                    );
                                    return (
                                        <Paper
                                            key={idx}
                                            sx={{
                                                p: 2,
                                                border: "1px solid #e5e7eb",
                                            }}
                                        >
                                            <Stack spacing={2}>
                                                {/* CHỌN PRODUCT DETAIL */}
                                                <TextField
                                                    select
                                                    label="Chọn sản phẩm"
                                                    value={it.product_detail_id}
                                                    onChange={(e) => {
                                                        const id =
                                                            e.target.value;
                                                        updateItem(
                                                            idx,
                                                            "product_detail_id",
                                                            id
                                                        );
                                                        const d =
                                                            findDetail(id);
                                                        if (
                                                            d &&
                                                            (!it.price ||
                                                                it.price === 0)
                                                        ) {
                                                            updateItem(
                                                                idx,
                                                                "price",
                                                                Number(
                                                                    d.price || 0
                                                                )
                                                            );
                                                        }
                                                    }}
                                                    fullWidth
                                                >
                                                    <MenuItem value="">
                                                        -- chọn sản phẩm --
                                                    </MenuItem>
                                                    {productDetails.map(
                                                        (pd) => (
                                                            <MenuItem
                                                                key={pd.id}
                                                                value={pd.id}
                                                            >
                                                                {`${
                                                                    pd.product
                                                                        ?.name ??
                                                                    `#${pd.id}`
                                                                } — ${
                                                                    pd.color
                                                                        ?.name ??
                                                                    "—"
                                                                } — ${
                                                                    pd.size
                                                                        ?.name ??
                                                                    "—"
                                                                }`}
                                                            </MenuItem>
                                                        )
                                                    )}
                                                </TextField>

                                                {/* PREVIEW */}
                                                <Box
                                                    sx={{
                                                        p: 1.5,
                                                        border: "1px solid #e5e7eb",
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    <ProductDetailPreview
                                                        detail={detail}
                                                    />
                                                </Box>

                                                {/* QTY + PRICE + SUBTOTAL */}
                                                <Stack
                                                    direction={{
                                                        xs: "column",
                                                        sm: "row",
                                                    }}
                                                    spacing={2}
                                                    alignItems="center"
                                                >
                                                    <TextField
                                                        label="Số lượng"
                                                        type="number"
                                                        value={it.qty}
                                                        onChange={(e) =>
                                                            updateItem(
                                                                idx,
                                                                "qty",
                                                                e.target.value
                                                            )
                                                        }
                                                        sx={{ width: 140 }}
                                                    />

                                                    <TextField
                                                        label="Giá nhập (VNĐ)"
                                                        type="number"
                                                        value={it.price}
                                                        onChange={(e) =>
                                                            updateItem(
                                                                idx,
                                                                "price",
                                                                e.target.value
                                                            )
                                                        }
                                                        sx={{ width: 200 }}
                                                    />

                                                    <Box sx={{ ml: "auto" }}>
                                                        <Typography variant="body2">
                                                            Thành tiền
                                                        </Typography>
                                                        <Typography
                                                            variant="h6"
                                                            sx={{
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                computeLineTotal(
                                                                    it
                                                                )
                                                            )}
                                                        </Typography>
                                                    </Box>

                                                    <Button
                                                        color="error"
                                                        onClick={() =>
                                                            removeItemRow(idx)
                                                        }
                                                        disabled={
                                                            form.items.length ===
                                                            1
                                                        }
                                                    >
                                                        Xoá
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                            </Stack>

                            <Box sx={{ textAlign: "right", mt: 2 }}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Tổng cộng:{" "}
                                    {formatCurrency(computeGrandTotal)}
                                </Typography>
                            </Box>
                        </Paper>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creatingReceipt}
                    >
                        {creatingReceipt ? "Đang tạo..." : "Tạo phiếu"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG VIEW RECEIPT */}
            <Dialog
                open={!!viewReceipt}
                onClose={() => setViewReceipt(null)}
                maxWidth="md"
                fullWidth
                scroll="paper"
                PaperProps={{
                    sx: {
                        mt: { xs: 6, sm: 8 },
                    },
                }}
            >
                <DialogTitle>
                    {viewReceipt ? `Receipt #${viewReceipt.id}` : "Receipt"}
                </DialogTitle>
                <DialogContent dividers>
                    {viewReceipt && (
                        <Box>
                            <Typography variant="body2">
                                Supplier:{" "}
                                {viewReceipt.supplier?.name ??
                                    viewReceipt.suppliers_id ??
                                    "—"}
                            </Typography>
                            <Typography variant="body2">
                                Import date:{" "}
                                {viewReceipt.import_date
                                    ? new Date(
                                          viewReceipt.import_date
                                      ).toLocaleString("vi-VN")
                                    : viewReceipt.created_at
                                    ? new Date(
                                          viewReceipt.created_at
                                      ).toLocaleString("vi-VN")
                                    : "—"}
                            </Typography>

                            <Box sx={{ mt: 2 }}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Product</TableCell>
                                                <TableCell>Color</TableCell>
                                                <TableCell>Size</TableCell>
                                                <TableCell align="right">
                                                    Qty
                                                </TableCell>
                                                <TableCell align="right">
                                                    Purchase price
                                                </TableCell>
                                                <TableCell align="right">
                                                    Subtotal
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(viewReceipt.details || []).map(
                                                (d) => (
                                                    <TableRow
                                                        key={
                                                            d.id ??
                                                            `${d.product_detail_id}_${Math.random()}`
                                                        }
                                                    >
                                                        <TableCell>
                                                            {d.product_detail
                                                                ?.product
                                                                ?.name ??
                                                                `#${d.product_detail_id}`}
                                                        </TableCell>
                                                        <TableCell>
                                                            {d.product_detail
                                                                ?.color?.name ??
                                                                "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {d.product_detail
                                                                ?.size?.name ??
                                                                "—"}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {d.quantity}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {d.price
                                                                ? formatCurrency(
                                                                      d.price
                                                                  )
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {d.subtotal
                                                                ? formatCurrency(
                                                                      d.subtotal
                                                                  )
                                                                : d.quantity &&
                                                                  d.price
                                                                ? formatCurrency(
                                                                      d.quantity *
                                                                          d.price
                                                                  )
                                                                : "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewReceipt(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG CREATE SUPPLIER QUICK */}
            <Dialog
                open={openSupplierModal}
                onClose={() => setOpenSupplierModal(false)}
                maxWidth="sm"
                fullWidth
                scroll="paper"
                PaperProps={{
                    sx: {
                        mt: { xs: 6, sm: 8 },
                    },
                }}
            >
                <DialogTitle>Create Supplier (Quick)</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            fullWidth
                            value={supplierForm.name}
                            onChange={(e) =>
                                setSupplierForm({
                                    ...supplierForm,
                                    name: e.target.value,
                                })
                            }
                        />
                        <TextField
                            label="Phone"
                            fullWidth
                            value={supplierForm.phone}
                            inputProps={{ maxLength: 10 }}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!/^\d*$/.test(v)) return;
                                setSupplierForm({
                                    ...supplierForm,
                                    phone: v,
                                });
                            }}
                            error={
                                supplierForm.phone.length > 0 &&
                                supplierForm.phone.length !== 10
                            }
                            helperText={
                                supplierForm.phone.length > 0 &&
                                supplierForm.phone.length !== 10
                                    ? "Số điện thoại phải đúng 10 số"
                                    : ""
                            }
                        />
                        <TextField
                            label="Email"
                            fullWidth
                            value={supplierForm.email}
                            onChange={(e) =>
                                setSupplierForm({
                                    ...supplierForm,
                                    email: e.target.value,
                                })
                            }
                        />
                        <TextField
                            label="Address"
                            fullWidth
                            value={supplierForm.address}
                            onChange={(e) =>
                                setSupplierForm({
                                    ...supplierForm,
                                    address: e.target.value,
                                })
                            }
                        />
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            Supplier sẽ được tạo và tự động chọn cho form tạo
                            phiếu.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSupplierModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateSupplier}
                        disabled={supplierCreating}
                    >
                        {supplierCreating ? "Đang tạo..." : "Create supplier"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
