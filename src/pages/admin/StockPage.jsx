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

// Dùng API_BASE cục bộ để tránh circular import với AdminPanel
const API_BASE = "http://127.0.0.1:8000";

export default function StockPage({ setSnack }) {
    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [openCreate, setOpenCreate] = React.useState(false);

    const [suppliers, setSuppliers] = React.useState([]);
    const [productDetails, setProductDetails] = React.useState([]);
    const [optsLoading, setOptsLoading] = React.useState(false);

    const [openSupplierModal, setOpenSupplierModal] = React.useState(false);
    const [supplierForm, setSupplierForm] = React.useState({ name: "", email: "", phone: "", address: "" });
    const [supplierCreating, setSupplierCreating] = React.useState(false);

    const [form, setForm] = React.useState({
        suppliers_id: "",
        supplier_manual: { name: "", email: "", address: "", phone: "" },
        note: "",
        import_date: new Date().toISOString().slice(0, 10),
        items: [{ product_detail_id: "", qty: 1, price: 0 }],
    });

    const [viewReceipt, setViewReceipt] = React.useState(null);

    const getStoredToken = () => {
        let token = localStorage.getItem("access_token") || localStorage.getItem("token") || null;
        if (!token) return null;
        try { const maybe = JSON.parse(token); if (typeof maybe === "string") token = maybe; } catch (e) { }
        return String(token).trim();
    };

    const fetchStock = React.useCallback(async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/admin/receipts`, {
                method: "GET",
                headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!res.ok) throw new Error("fetch receipts failed");
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
            setEntries(arr);
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Không tải stock entries" });
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
                fetch(`${API_BASE}/api/admin/suppliers`, { headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }),
                fetch(`${API_BASE}/api/product-details?with=color,size,product`, { headers: { Accept: "application/json" } }),
            ]);
            const sData = sRes.ok ? await sRes.json().catch(() => []) : [];
            const pdData = pdRes.ok ? await pdRes.json().catch(() => []) : [];
            const normalize = (d) => (Array.isArray(d) ? d : (d.data ?? d.items ?? []));
            setSuppliers(normalize(sData));
            setProductDetails(normalize(pdData));
        } catch (err) {
            console.error("fetchOptions", err);
            setSnack({ severity: "warning", message: "Không tải được suppliers hoặc product details" });
            setSuppliers([]); setProductDetails([]);
        } finally { setOptsLoading(false); }
    }, [setSnack]);

    React.useEffect(() => { fetchStock(); fetchOptions(); }, [fetchStock, fetchOptions]);

    const addItemRow = React.useCallback(() => {
        setForm(f => ({ ...f, items: [...f.items, { product_detail_id: "", qty: 1, price: 0 }] }));
    }, []);
    const removeItemRow = React.useCallback((idx) => {
        setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    }, []);
    const updateItem = React.useCallback((idx, field, value) => {
        setForm(f => {
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

    const findDetail = React.useCallback((id) => {
        if (!id) return null;
        return productDetails.find(d => String(d.id) === String(id)) || null;
    }, [productDetails]);

    const formatCurrency = (v) => (Number(v) || 0).toLocaleString("vi-VN") + "₫";
    const computeLineTotal = (item) => (Number(item.qty) || 0) * (Number(item.price) || 0);
    const computeGrandTotal = React.useMemo(() => form.items.reduce((acc, it) => acc + computeLineTotal(it), 0), [form.items]);

    const extractErrorMessage = async (res) => {
        try {
            const j = await res.json();
            if (j && (j.message || j.error || j.errors)) {
                if (typeof j.message === "string") return j.message;
                if (typeof j.error === "string") return j.error;
                if (j.errors) return typeof j.errors === "object" ? JSON.stringify(j.errors) : String(j.errors);
                return JSON.stringify(j);
            }
        } catch (e) { }
        try { const txt = await res.text(); if (txt) return txt; } catch (e) { }
        return "Có lỗi xảy ra";
    };

    const [creatingReceipt, setCreatingReceipt] = React.useState(false);
    const handleCreate = React.useCallback(async () => {
        if (!form.suppliers_id) {
            setSnack({ severity: "error", message: "Vui lòng chọn supplier (hoặc tạo supplier bằng nút 'Tạo supplier') trước khi tạo phiếu." });
            return;
        }
        if (!Array.isArray(form.items) || form.items.length === 0) {
            setSnack({ severity: "error", message: "Thêm ít nhất 1 item" }); return;
        }
        for (const it of form.items) {
            if (!it.product_detail_id) { setSnack({ severity: "error", message: "Chọn product detail cho tất cả item" }); return; }
            if (!it.qty || Number(it.qty) <= 0) { setSnack({ severity: "error", message: "Quantity phải lớn hơn 0" }); return; }
            if (it.price === "" || Number(it.price) < 0) { setSnack({ severity: "error", message: "Price không hợp lệ" }); return; }
        }

        if (creatingReceipt) return;
        setCreatingReceipt(true);
        try {
            const token = getStoredToken();
            const payload = {
                suppliers_id: form.suppliers_id,
                note: form.note || "",
                import_date: form.import_date || new Date().toISOString().slice(0, 10),
                items: form.items.map(it => ({
                    product_detail_id: it.product_detail_id,
                    quantity: Number(it.qty),
                    price: Number(it.price),
                })),
            };
            const res = await fetch(`${API_BASE}/api/admin/receipts`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                setSnack({ severity: "error", message: msg || "Tạo phiếu nhập thất bại" });
                return;
            }
            await res.json();
            setSnack({ severity: "success", message: "Tạo phiếu nhập thành công" });
            setOpenCreate(false);
            setForm({
                suppliers_id: "",
                supplier_manual: { name: "", email: "", address: "", phone: "" },
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
            setSnack({ severity: "error", message: "Tên supplier là bắt buộc" });
            return;
        }
        setSupplierCreating(true);
        try {
            const token = getStoredToken();
            const res = await fetch(`${API_BASE}/api/admin/suppliers`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(supplierForm),
            });
            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                setSnack({ severity: "error", message: msg || "Tạo supplier thất bại" });
                return;
            }
            const created = await res.json();
            setSnack({ severity: "success", message: "Tạo supplier thành công" });
            await fetchOptions();
            setForm(f => ({ ...f, suppliers_id: created.id ?? created.ID ?? created.data?.id ?? created.id }));
            setOpenSupplierModal(false);
        } catch (err) {
            console.error("create supplier error", err);
            setSnack({ severity: "error", message: "Tạo supplier thất bại" });
        } finally {
            setSupplierCreating(false);
        }
    };

    const ProductDetailPreview = ({ detail }) => {
        if (!detail) return React.createElement("div", { style: { color: "#6b7280" } }, "Chưa chọn sản phẩm");
        return React.createElement("div", null,
            React.createElement("div", { style: { fontWeight: 600 } }, detail.product?.name ?? `#${detail.id}`),
            React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Màu: ${detail.color?.name ?? "—"}`),
            React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Size: ${detail.size?.name ?? "—"}`),
            React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Giá bán (site): ${detail.price ? formatCurrency(detail.price) : "—"}`),
            React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Tồn kho: ${detail.quantity ?? "—"}`)
        );
    };

    return (
        React.createElement(Box, null,
            React.createElement(Stack, { direction: "row", justifyContent: "space-between", sx: { mb: 2 } },
                React.createElement(Typography, { variant: "h6" }, "Stock Entries (Receipts)"),
                React.createElement(Stack, { direction: "row", spacing: 1 },
                    React.createElement(Button, { variant: "outlined", onClick: openSupplierCreate }, "Tạo supplier"),
                    React.createElement(Button, { onClick: () => setOpenCreate(true), variant: "contained" }, "Create Receipt")
                )
            ),

            React.createElement(Paper, null,
                loading ? React.createElement(Box, { sx: { p: 3, display: "flex", justifyContent: "center" } }, React.createElement(CircularProgress, null))
                    : React.createElement(TableContainer, null,
                        React.createElement(Table, null,
                            React.createElement(TableHead, null,
                                React.createElement(TableRow, null,
                                    React.createElement(TableCell, null, "#"),
                                    React.createElement(TableCell, null, "Supplier"),
                                    React.createElement(TableCell, null, "Import date"),
                                    React.createElement(TableCell, null, "Total"),
                                    React.createElement(TableCell, null, "Actions")
                                )
                            ),
                            React.createElement(TableBody, null,
                                entries.length === 0 ? React.createElement(TableRow, null,
                                    React.createElement(TableCell, { colSpan: 5, align: "center", sx: { py: 6 } }, "Không có phiếu nhập")
                                ) : entries.map(e => React.createElement(TableRow, { key: e.id },
                                    React.createElement(TableCell, null, e.id),
                                    React.createElement(TableCell, null, e.supplier?.name ?? (e.suppliers_id ?? "—")),
                                    React.createElement(TableCell, null, e.import_date ?? e.created_at ?? "—"),
                                    React.createElement(TableCell, null, e.total_price ? Number(e.total_price).toLocaleString("vi-VN") + "₫" : "—"),
                                    React.createElement(TableCell, null,
                                        React.createElement(Button, { size: "small", onClick: () => setViewReceipt(e) }, "View"),
                                        React.createElement(Button, {
                                            size: "small", color: "error", onClick: async () => {
                                                if (!window.confirm("Xóa phiếu nhập? Hành động có thể không rollback tồn kho.")) return;
                                                try {
                                                    const token = getStoredToken();
                                                    const res = await fetch(`${API_BASE}/api/admin/receipts/${e.id}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                                                    if (!res.ok) throw new Error("Delete failed");
                                                    setSnack({ severity: "success", message: "Đã xóa phiếu" });
                                                    fetchStock();
                                                    await fetchOptions();
                                                } catch (err) {
                                                    console.error(err);
                                                    setSnack({ severity: "error", message: "Xóa thất bại" });
                                                }
                                            }
                                        }, "Delete")
                                    )
                                ))
                            )
                        )
                    )
            ),

            React.createElement(Dialog, { open: openCreate, onClose: () => setOpenCreate(false), maxWidth: "md", fullWidth: true },
                React.createElement(DialogTitle, null, "Create receipt"),
                React.createElement(DialogContent, null,
                    React.createElement(Stack, { spacing: 2, sx: { mt: 1 } },

                        React.createElement(TextField, {
                            select: true,
                            label: "Select existing supplier (required)",
                            fullWidth: true,
                            value: form.suppliers_id,
                            onChange: (e) => setForm({ ...form, suppliers_id: e.target.value }),
                            helperText: optsLoading ? "Loading suppliers..." : "Chọn supplier có sẵn hoặc tạo mới bằng nút 'Tạo supplier'"
                        },
                            React.createElement(MenuItem, { value: "" }, "-- none --"),
                            suppliers.map(s => React.createElement(MenuItem, { key: s.id, value: s.id }, s.name))
                        ),

                        React.createElement(TextField, {
                            label: "Supplier (manual note, won't auto-create)",
                            fullWidth: true,
                            value: form.supplier_manual.name,
                            onChange: (e) => setForm({ ...form, supplier_manual: { ...form.supplier_manual, name: e.target.value } }),
                            helperText: "Bạn có thể nhập tạm tên supplier nhưng cần tạo supplier qua nút 'Tạo supplier' nếu muốn lưu chính thức."
                        }),

                        React.createElement(TextField, {
                            label: "Import date",
                            type: "date",
                            fullWidth: true,
                            value: form.import_date,
                            onChange: (e) => setForm({ ...form, import_date: e.target.value }),
                            InputLabelProps: { shrink: true }
                        }),

                        React.createElement(TextField, {
                            label: "Note",
                            fullWidth: true,
                            multiline: true,
                            minRows: 2,
                            value: form.note,
                            onChange: (e) => setForm({ ...form, note: e.target.value })
                        }),

                        React.createElement(Box, null,
                            React.createElement(Typography, { variant: "subtitle2", sx: { mb: 1 } }, "Items"),
                            React.createElement(Stack, { spacing: 1 },
                                form.items.map((it, idx) => {
                                    const detail = findDetail(it.product_detail_id);
                                    return React.createElement(Paper, { key: idx, sx: { p: 1 } },
                                        React.createElement(Stack, { spacing: 1 },
                                            React.createElement(TextField, {
                                                select: true,
                                                label: "Product Detail",
                                                value: it.product_detail_id,
                                                onChange: (e) => {
                                                    const id = e.target.value;
                                                    updateItem(idx, "product_detail_id", id);
                                                    const d = findDetail(id);
                                                    if (d && (!it.price || it.price === 0)) updateItem(idx, "price", Number(d.price || 0));
                                                }
                                            },
                                                React.createElement(MenuItem, { value: "" }, "-- chọn --"),
                                                productDetails.map(pd => React.createElement(MenuItem, { key: pd.id, value: pd.id },
                                                    `${pd.product?.name ?? `#${pd.id}`} — ${pd.color?.name ?? "—"} — ${pd.size?.name ?? "—"} — ${Number(pd.price || 0).toLocaleString("vi-VN")}₫`
                                                ))
                                            ),

                                            React.createElement(Box, { sx: { p: 1, border: "1px solid #eee", borderRadius: 1 } },
                                                React.createElement(ProductDetailPreview, { detail })
                                            ),

                                            React.createElement(Stack, { direction: "row", spacing: 2, alignItems: "center" },
                                                React.createElement(TextField, {
                                                    label: "Qty",
                                                    type: "number",
                                                    value: it.qty,
                                                    onChange: (e) => updateItem(idx, "qty", e.target.value),
                                                    sx: { width: 120 }
                                                }),
                                                React.createElement(TextField, {
                                                    label: "Purchase price (VNĐ)",
                                                    type: "number",
                                                    value: it.price,
                                                    onChange: (e) => updateItem(idx, "price", e.target.value),
                                                    sx: { width: 180 },
                                                    helperText: "Giá nhập lưu trong phiếu (không cập nhật giá bán)"
                                                }),
                                                React.createElement("div", null,
                                                    React.createElement(Typography, { variant: "body2" }, "Thành tiền"),
                                                    React.createElement(Typography, { variant: "subtitle2" }, formatCurrency(computeLineTotal(it)))
                                                ),
                                                React.createElement(Box, { sx: { ml: "auto" } },
                                                    React.createElement(Button, { size: "small", color: "error", onClick: () => removeItemRow(idx), disabled: form.items.length === 1 }, "Remove")
                                                )
                                            )
                                        )
                                    );
                                })
                            ),
                            React.createElement(Box, { sx: { mt: 1 } },
                                React.createElement(Button, { onClick: addItemRow }, "Add item")
                            ),
                            React.createElement(Box, { sx: { mt: 2, textAlign: "right" } },
                                React.createElement(Typography, { variant: "subtitle2" }, "Tổng tạm tính: " + formatCurrency(computeGrandTotal))
                            )
                        )
                    )
                ),
                React.createElement(DialogActions, null,
                    React.createElement(Button, { onClick: () => setOpenCreate(false) }, "Cancel"),
                    React.createElement(Button, { variant: "contained", onClick: handleCreate, disabled: creatingReceipt },
                        creatingReceipt ? "Đang tạo..." : "Create"
                    )
                )
            ),

            React.createElement(Dialog, { open: !!viewReceipt, onClose: () => setViewReceipt(null), maxWidth: "md", fullWidth: true },
                React.createElement(DialogTitle, null, viewReceipt ? `Receipt #${viewReceipt.id}` : "Receipt"),
                React.createElement(DialogContent, null,
                    viewReceipt ? React.createElement(Box, null,
                        React.createElement(Typography, null, `Supplier: ${viewReceipt.supplier?.name ?? viewReceipt.suppliers_id ?? "-"}`),
                        React.createElement(Typography, null, `Import date: ${viewReceipt.import_date ?? viewReceipt.created_at ?? "-"}`),
                        React.createElement(Box, { sx: { mt: 2 } },
                            React.createElement(TableContainer, null,
                                React.createElement(Table, null,
                                    React.createElement(TableHead, null,
                                        React.createElement(TableRow, null,
                                            React.createElement(TableCell, null, "Product"),
                                            React.createElement(TableCell, null, "Color"),
                                            React.createElement(TableCell, null, "Size"),
                                            React.createElement(TableCell, null, "Qty"),
                                            React.createElement(TableCell, null, "Purchase price"),
                                            React.createElement(TableCell, null, "Subtotal")
                                        )
                                    ),
                                    React.createElement(TableBody, null,
                                        (viewReceipt.details || []).map(d => React.createElement(TableRow, { key: d.id || `${d.product_detail_id}_${Math.random()}` },
                                            React.createElement(TableCell, null, d.product_detail?.product?.name ?? `#${d.product_detail_id}`),
                                            React.createElement(TableCell, null, d.product_detail?.color?.name ?? "—"),
                                            React.createElement(TableCell, null, d.product_detail?.size?.name ?? "—"),
                                            React.createElement(TableCell, null, d.quantity),
                                            React.createElement(TableCell, null, d.price ? Number(d.price).toLocaleString("vi-VN") + "₫" : "—"),
                                            React.createElement(TableCell, null, d.subtotal ? Number(d.subtotal).toLocaleString("vi-VN") + "₫" : (d.quantity && d.price ? Number(d.quantity * d.price).toLocaleString("vi-VN") + "₫" : "—"))
                                        ))
                                    )
                                )
                            )
                        )
                    ) : null
                ),
                React.createElement(DialogActions, null,
                    React.createElement(Button, { onClick: () => setViewReceipt(null) }, "Close")
                )
            ),

            React.createElement(Dialog, { open: openSupplierModal, onClose: () => setOpenSupplierModal(false), maxWidth: "sm", fullWidth: true },
                React.createElement(DialogTitle, null, "Create Supplier (Quick)"),
                React.createElement(DialogContent, null,
                    React.createElement(Stack, { spacing: 2, sx: { mt: 1 } },
                        React.createElement(TextField, {
                            label: "Name",
                            fullWidth: true,
                            value: supplierForm.name,
                            onChange: (e) => setSupplierForm({ ...supplierForm, name: e.target.value })
                        }),
                        React.createElement(TextField, {
                            label: "Phone",
                            fullWidth: true,
                            value: supplierForm.phone,
                            inputProps: { maxLength: 10 },
                            onChange: (e) => {
                                const v = e.target.value;
                                if (!/^\d*$/.test(v)) return;
                                setSupplierForm({ ...supplierForm, phone: v });
                            },
                            error: supplierForm.phone.length > 0 && supplierForm.phone.length !== 10,
                            helperText: supplierForm.phone.length > 0 && supplierForm.phone.length !== 10 ? "Số điện thoại phải đúng 10 số" : ""
                        }),
                        React.createElement(TextField, {
                            label: "Email",
                            fullWidth: true,
                            value: supplierForm.email,
                            onChange: (e) => setSupplierForm({ ...supplierForm, email: e.target.value })
                        }),
                        React.createElement(TextField, {
                            label: "Address",
                            fullWidth: true,
                            value: supplierForm.address,
                            onChange: (e) => setSupplierForm({ ...supplierForm, address: e.target.value })
                        }),
                        React.createElement(Typography, { variant: "caption", color: "text.secondary" }, "Supplier sẽ được tạo và tự động chọn cho form tạo phiếu.")
                    )
                ),
                React.createElement(DialogActions, null,
                    React.createElement(Button, { onClick: () => setOpenSupplierModal(false) }, "Cancel"),
                    React.createElement(Button, { variant: "contained", onClick: handleCreateSupplier, disabled: supplierCreating },
                        supplierCreating ? "Đang tạo..." : "Create supplier"
                    )
                )
            )
        )
    );
}
