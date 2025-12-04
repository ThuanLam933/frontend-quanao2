import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    MenuItem,
    Paper,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    Stack,
    IconButton,
    Chip,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { API_BASE } from "../AdminPanel";

export default function VariantPage({ setSnack }) {
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState(null);

    const showSnack = setSnack;

    // ================= FETCH PRODUCTS =================
    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/products`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });

            const data = await res.json();
            setProducts(Array.isArray(data) ? data : data.data ?? []);
        } catch (e) {
            console.error(e);
            showSnack({
                severity: "error",
                message: "Không tải được danh sách sản phẩm",
            });
        }
    }, [showSnack]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // ================= FETCH VARIANTS =================
    const fetchVariants = useCallback(
        async () => {
            setLoading(true);

            try {
                const token = localStorage.getItem("access_token");

                const url = selectedProduct
                    ? `${API_BASE}/api/product-details?product_id=${selectedProduct}`
                    : `${API_BASE}/api/product-details`;

                const res = await fetch(url, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                const data = res.ok ? await res.json() : [];
                setVariants(Array.isArray(data) ? data : data.data ?? []);
            } catch (e) {
                console.error(e);
                showSnack({
                    severity: "error",
                    message: "Không tải được biến thể",
                });
            } finally {
                setLoading(false);
            }
        },
        [selectedProduct, showSnack]
    );

    useEffect(() => {
        fetchVariants();
    }, [selectedProduct]); // khi đổi sản phẩm hoặc để trống => fetch lại

    // ================= DELETE VARIANT =================
    const handleDeleteVariant = async (id) => {
        if (!window.confirm("Xóa biến thể này?")) return;

        try {
            const res = await fetch(`${API_BASE}/api/product-details/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });

            if (!res.ok) {
                showSnack({
                    severity: "error",
                    message: "Xóa biến thể thất bại",
                });
                return;
            }

            showSnack({
                severity: "success",
                message: "Đã xóa biến thể",
            });
            fetchVariants();
        } catch (e) {
            console.error(e);
            showSnack({
                severity: "error",
                message: "Lỗi khi xóa biến thể",
            });
        }
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
                Quản lý biến thể sản phẩm
            </Typography>

            {/* CHỌN SẢN PHẨM */}
            <TextField
                select
                label="Chọn sản phẩm"
                fullWidth
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
            >
                <MenuItem value="">-- Chọn sản phẩm --</MenuItem>
                {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                        {p.name}
                    </MenuItem>
                ))}
            </TextField>

            {/* NÚT THÊM BIẾN THỂ */}
            <Stack direction="row" sx={{ mt: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled={!selectedProduct}
                    onClick={() => {
                        setEditingVariant(null);
                        setDialogOpen(true);
                    }}
                >
                    Thêm biến thể
                </Button>
            </Stack>

            {/* BẢNG BIẾN THỂ */}
            <Paper sx={{ mt: 3 }}>
                {loading ? (
                    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Sản phẩm</TableCell>
                                    <TableCell>Ảnh</TableCell>
                                    <TableCell>Màu</TableCell>
                                    <TableCell>Kích cỡ</TableCell>
                                    <TableCell>Giá</TableCell>
                                    <TableCell>Số lượng</TableCell>
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {variants.length ? (
                                    variants.map((v) => (
                                        <TableRow key={v.id}>
                                            {/* TÊN SẢN PHẨM */}
                                            <TableCell>
                                                {v.product?.name ?? "—"}
                                            </TableCell>

                                            {/* ẢNH BIẾN THỂ (LẤY ẢNH ĐẦU TIÊN) */}
                                            <TableCell>
                                                {v.images && v.images.length > 0 ? (
                                                    <img
                                                        src={v.images[0].full_url || v.images[0].url_image}
                                                        alt=""
                                                        style={{
                                                            width: 50,
                                                            height: 50,
                                                            objectFit: "cover",
                                                            borderRadius: 4,
                                                        }}
                                                    />
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>

                                            {/* MÀU & SIZE */}
                                            <TableCell>{v.color?.name ?? "—"}</TableCell>
                                            <TableCell>{v.size?.name ?? "—"}</TableCell>

                                            {/* GIÁ & SỐ LƯỢNG */}
                                            <TableCell>
                                                {Number(v.price).toLocaleString("vi-VN")}₫
                                            </TableCell>
                                            <TableCell>{v.quantity}</TableCell>

                                            {/* TRẠNG THÁI */}
                                            <TableCell>
                                                {v.quantity > 0 ? (
                                                    <Chip
                                                        label="Còn hàng"
                                                        size="small"
                                                        color="success"
                                                    />
                                                ) : (
                                                    <Chip
                                                        label="Hết hàng"
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </TableCell>

                                            {/* ACTIONS */}
                                            <TableCell>
                                                <IconButton
                                                    onClick={() => {
                                                        setEditingVariant(v);
                                                        setDialogOpen(true);
                                                    }}
                                                >
                                                    <EditIcon />
                                                </IconButton>

                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDeleteVariant(v.id)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            Không có biến thể
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* DIALOG THÊM / SỬA BIẾN THỂ */}
            <AddVariantDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                productId={selectedProduct}
                variant={editingVariant}
                refresh={fetchVariants}
                showSnack={showSnack}
            />
        </Box>
    );
}

// =====================================================================
// ==================== ADD / EDIT VARIANT DIALOG =======================
// =====================================================================

function AddVariantDialog({
    open,
    onClose,
    productId,
    variant,
    refresh,
    showSnack,
}) {
    const isEdit = !!variant;

    const [form, setForm] = useState({
        price: "",
        quantity: "",
        color_id: "",
        size_id: "",
        images: null, // FileList | null
    });

    const [colors, setColors] = useState([]);
    const [sizes, setSizes] = useState([]);

    // Khi mở dialog edit → load data vào form
    useEffect(() => {
        if (isEdit && variant) {
            setForm({
                price: variant.price ?? "",
                quantity: variant.quantity ?? "",
                color_id: variant.color_id ?? "",
                size_id: variant.size_id ?? "",
                images: null,
            });
        } else {
            setForm({
                price: "",
                quantity: "",
                color_id: "",
                size_id: "",
                images: null,
            });
        }
    }, [variant, isEdit]);

    // Load danh sách màu + size
    useEffect(() => {
        const token = localStorage.getItem("access_token");

        Promise.all([
            fetch(`${API_BASE}/api/colors`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then((res) => res.json()),
            fetch(`${API_BASE}/api/sizes`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then((res) => res.json()),
        ])
            .then(([c, s]) => {
                setColors(Array.isArray(c) ? c : c.data ?? []);
                setSizes(Array.isArray(s) ? s : s.data ?? []);
            })
            .catch((e) => {
                console.error(e);
                showSnack({
                    severity: "error",
                    message: "Không tải được màu/kích cỡ",
                });
            });
    }, [showSnack]);

    const handleSave = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const fd = new FormData();
            fd.append("product_id", productId);
            fd.append("price", form.price ?? "");
            // tạo mới => luôn = 0; edit => giữ giá trị hiện tại
            fd.append("quantity", isEdit ? form.quantity : 0);
            fd.append("color_id", form.color_id ?? "");
            fd.append("size_id", form.size_id ?? "");

            const endpoint = isEdit
                ? `${API_BASE}/api/product-details/${variant.id}?_method=PUT`
                : `${API_BASE}/api/product-details`;

            const res = await fetch(endpoint, {
                method: "POST", // luôn POST, Laravel sẽ spoof thành PUT nếu có _method
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: fd,
            });

            if (!res.ok) {
                showSnack({
                    severity: "error",
                    message: isEdit ? "Cập nhật thất bại" : "Tạo biến thể thất bại",
                });
                return;
            }

            // Lấy variant trả về (khi tạo mới)
            let createdOrUpdated = null;
            try {
                createdOrUpdated = await res.json();
            } catch {
                // có thể backend trả về không phải JSON đầy đủ, bỏ qua
            }

            const variantId = isEdit
                ? variant.id
                : createdOrUpdated?.id ?? null;

            // Nếu có ảnh được chọn → upload từng ảnh
            if (variantId && form.images && form.images.length > 0) {
                for (let i = 0; i < form.images.length; i++) {
                    const imgFd = new FormData();
                    imgFd.append("product_detail_id", variantId);
                    imgFd.append("image", form.images[i]);

                    await fetch(`${API_BASE}/api/image-products`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        body: imgFd,
                    });
                }
            }

            showSnack({
                severity: "success",
                message: isEdit ? "Đã cập nhật" : "Đã tạo biến thể",
            });

            onClose();
            refresh();
        } catch (err) {
            console.error(err);
            showSnack({
                severity: "error",
                message: "Lỗi khi lưu biến thể",
            });
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? "Sửa biến thể" : "Thêm biến thể"}</DialogTitle>

            <DialogContent>
                {/* GIÁ */}
                <TextField
                    label="Giá"
                    fullWidth
                    sx={{ mt: 1 }}
                    value={form.price}
                    onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                    }
                />

                {/* SỐ LƯỢNG: chỉ hiện khi EDIT */}
                {isEdit && (
                    <TextField
                        label="Số lượng"
                        fullWidth
                        type="number"
                        sx={{ mt: 2 }}
                        value={form.quantity}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                quantity: e.target.value,
                            })
                        }
                    />
                )}

                {/* MÀU */}
                <TextField
                    label="Màu"
                    select
                    fullWidth
                    sx={{ mt: 2 }}
                    value={form.color_id}
                    onChange={(e) =>
                        setForm({ ...form, color_id: e.target.value })
                    }
                >
                    <MenuItem value="">-- none --</MenuItem>
                    {colors.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                            {c.name}
                        </MenuItem>
                    ))}
                </TextField>

                {/* KÍCH CỠ */}
                <TextField
                    label="Kích cỡ"
                    select
                    fullWidth
                    sx={{ mt: 2 }}
                    value={form.size_id}
                    onChange={(e) =>
                        setForm({ ...form, size_id: e.target.value })
                    }
                >
                    <MenuItem value="">-- none --</MenuItem>
                    {sizes.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                            {s.name}
                        </MenuItem>
                    ))}
                </TextField>

                {/* UPLOAD ẢNH */}
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Ảnh biến thể
                    </Typography>
                    <input
                        type="file"
                        multiple
                        onChange={(e) =>
                            setForm({
                                ...form,
                                images: e.target.files,
                            })
                        }
                    />
                    <Typography variant="caption" color="text.secondary">
                        Có thể chọn nhiều ảnh. Ảnh sẽ gắn riêng cho biến thể này.
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button variant="contained" onClick={handleSave}>
                    Lưu
                </Button>
            </DialogActions>
        </Dialog>
    );
}
