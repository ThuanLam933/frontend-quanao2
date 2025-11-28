// src/pages/admin/ProductsPage.jsx
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
    Pagination,
    Stack,
    IconButton,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Tooltip,
    Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Popover from "@mui/material/Popover";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { API_BASE } from "../AdminPanel";

// Cấu hình cột cho table + popup filter
const BASE_COLUMNS = [
    { id: "id", label: "ID" },
    { id: "image", label: "Hình ảnh" },
    { id: "name", label: "Tên" },
    { id: "price", label: "Giá" },
    { id: "quantity", label: "Số lượng" },
    { id: "slug", label: "Slug" },
    { id: "description", label: "Mô tả" },
    { id: "status", label: "Trạng thái" },
    { id: "category", label: "Loại" },
    { id: "color", label: "Màu" },
    { id: "size", label: "Kích cỡ" },
    { id: "actions", label: "Actions" },
];

// Các cột hiển thị mặc định (tinh gọn)
const DEFAULT_VISIBLE_COLS = [
    "id",
    "image",
    "name",
    "price",
    "quantity",
    "status",
    "category",
    "actions",
];

const PAGE_SIZE = 12;

export default function ProductsPage({ setSnack }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [page, setPage] = useState(1);

    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [optsLoading, setOptsLoading] = useState(false);

    // --- state search ---
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // --- state filter cột ---
    const [visibleCols, setVisibleCols] = useState(() => DEFAULT_VISIBLE_COLS);
    const [columnAnchorEl, setColumnAnchorEl] = useState(null);
    const [columnSearch, setColumnSearch] = useState("");

    // ----------------- FETCH DATA -----------------
    const fetchProducts = useCallback(
        async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/products`);
                if (!res.ok) throw new Error("Products fetch failed");
                const data = await res.json();
                const arr = Array.isArray(data)
                    ? data
                    : data.data ?? data.items ?? [];
                setItems(arr);
            } catch (err) {
                console.error("fetchProducts", err);
                setSnack({
                    severity: "error",
                    message: "Không tải được products.",
                });
                setItems([]);
            } finally {
                setLoading(false);
            }
        },
        [setSnack]
    );

    const fetchOptions = useCallback(
        async () => {
            setOptsLoading(true);
            try {
                const [cRes, colRes, sRes] = await Promise.all([
                    fetch(`${API_BASE}/api/categories`),
                    fetch(`${API_BASE}/api/colors`),
                    fetch(`${API_BASE}/api/sizes`),
                ]);

                const [cData, colData, sData] = await Promise.all([
                    cRes.ok ? cRes.json().catch(() => []) : [],
                    colRes.ok ? colRes.json().catch(() => []) : [],
                    sRes.ok ? sRes.json().catch(() => []) : [],
                ]);

                const normalize = (d) =>
                    Array.isArray(d) ? d : d.data ?? d.items ?? [];
                setCategories(normalize(cData));
                setColors(normalize(colData));
                setSizes(normalize(sData));
            } catch (err) {
                console.error("fetchOptions", err);
                setSnack({
                    severity: "warning",
                    message:
                        "Không tải được options (categories/colors/sizes).",
                });
                setCategories([]);
                setColors([]);
                setSizes([]);
            } finally {
                setOptsLoading(false);
            }
        },
        [setSnack]
    );

    useEffect(() => {
        fetchProducts();
        fetchOptions();
    }, [fetchProducts, fetchOptions]);

    // mỗi lần đổi searchTerm thì về trang 1
    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    // ----------------- HANDLERS EDIT/CREATE -----------------
    const onEdit = (item) => {
        const qty = item.first_detail?.quantity ?? item.quantity ?? 0;
        setEditing({
            ...item,
            image_url: item.image_url ?? item.image ?? null,
            images: item.images ?? [],
            price: item.first_detail?.price ?? item.price ?? "",
            colors_id:
                item.first_detail?.color?.id ??
                item.colors_id ??
                item.color_id ??
                "",
            sizes_id:
                item.first_detail?.size?.id ??
                item.sizes_id ??
                item.size_id ??
                "",
            categories_id:
                item.categories_id ??
                item.category_id ??
                item.category?.id ??
                "",
            quantity: Number(qty),
            status: Number(qty) > 0 ? 1 : 0,
        });
        setEditOpen(true);
    };

    const onCreate = () => {
        setEditing({
            name: "",
            description: "",
            price: "",
            status: 1,
            categories_id: "",
            colors_id: "",
            sizes_id: "",
            images: [],
            image_url: "",
            quantity: "",
        });
        setEditOpen(true);
    };

    const handleSave = async (obj, files = []) => {
        const token = localStorage.getItem("access_token");
        if (!obj || !obj.name || String(obj.name).trim() === "") {
            setSnack({
                severity: "error",
                message: "Tên sản phẩm không được để trống",
            });
            return;
        }

        setLoading(true);
        try {
            const isUpdate = !!obj.id;
            const endpoint = isUpdate
                ? `${API_BASE}/api/products/${obj.id}`
                : `${API_BASE}/api/products`;

            const fd = new FormData();

            const payload = { ...obj };
            if (
                payload.description === undefined ||
                payload.description === null
            )
                payload.description = "";
            if (
                payload.status === true ||
                payload.status === "true" ||
                payload.status === "1" ||
                payload.status === 1
            )
                payload.status = 1;
            else payload.status = 0;

            const details = [];
            if (
                payload.price !== undefined ||
                payload.colors_id !== undefined ||
                payload.sizes_id !== undefined ||
                payload.quantity !== undefined
            ) {
                details.push({
                    price:
                        payload.price !== undefined && payload.price !== ""
                            ? payload.price
                            : null,
                    color_id: payload.colors_id || null,
                    size_id: payload.sizes_id || null,
                    quantity:
                        payload.quantity !== undefined &&
                        payload.quantity !== null
                            ? Number(payload.quantity)
                            : 0,
                    status:
                        payload.detail_status !== undefined
                            ? payload.detail_status
                            : 1,
                });
            }

            delete payload.price;
            delete payload.colors_id;
            delete payload.sizes_id;
            delete payload.quantity;
            delete payload.detail_status;

            Object.keys(payload).forEach((k) => {
                const v = payload[k];
                if (v !== undefined && v !== null) fd.append(k, v);
            });

            if (details.length) fd.append("details", JSON.stringify(details));

            if (files && files.length) {
                for (let i = 0; i < files.length; i++) {
                    fd.append("images[]", files[i], files[i].name);
                }
            }

            // luôn dùng POST cho đúng route backend
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: fd,
            });

            if (res.ok) {
                setSnack({ severity: "success", message: "Lưu thành công" });
                setEditOpen(false);
                await fetchProducts();
                return;
            } else {
                const txt = await res.text().catch(() => "");
                console.error(
                    "save product failed:",
                    endpoint,
                    res.status,
                    txt
                );
                try {
                    const j = JSON.parse(txt || "{}");
                    const errMsg =
                        j.message || txt || `Lưu thất bại (${res.status})`;
                    setSnack({ severity: "error", message: errMsg });
                } catch {
                    setSnack({
                        severity: "error",
                        message: `Lưu thất bại (${res.status}). Xem console.`,
                    });
                }
            }
        } catch (err) {
            console.error("save product error", err);
            setSnack({
                severity: "error",
                message: "Lỗi khi lưu sản phẩm",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem("access_token");
        if (!window.confirm("Xóa sản phẩm?")) return;
        try {
            const endpoint = `${API_BASE}/api/products/${id}`;
            const res = await fetch(endpoint, {
                method: "DELETE",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error(
                    "delete product failed:",
                    endpoint,
                    res.status,
                    txt
                );
                const msg = txt || `Delete failed (${res.status})`;
                setSnack({ severity: "error", message: msg });
                return;
            }
            setSnack({ severity: "success", message: "Đã xóa" });
            fetchProducts();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Xóa thất bại" });
        }
    };

    // ----------------- SEARCH + FILTER CỘT -----------------
    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            setSearchTerm(searchInput.trim());
        }
    };

    const normalize = (v) => (v ?? "").toString().toLowerCase();

    const filteredItems = items.filter((p) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();

        const idStr = (p.id ?? "").toString();
        const name = normalize(p.name ?? p.title);
        const slug = normalize(p.slug);
        const desc = normalize(p.description);
        const categoryName = normalize(p.category?.name);
        const colorName = normalize(p.first_detail?.color?.name);
        const sizeName = normalize(p.first_detail?.size?.name);

        return (
            idStr.includes(term) ||
            name.includes(term) ||
            slug.includes(term) ||
            desc.includes(term) ||
            categoryName.includes(term) ||
            colorName.includes(term) ||
            sizeName.includes(term)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const visibleItems = filteredItems.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    // popup filter cột
    const openColumns = Boolean(columnAnchorEl);
    const handleOpenColumns = (event) => {
        setColumnAnchorEl(event.currentTarget);
    };
    const handleCloseColumns = () => {
        setColumnAnchorEl(null);
    };

    const handleToggleColumn = (id) => {
        setVisibleCols((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleToggleAllColumns = () => {
        setVisibleCols((prev) =>
            prev.length === BASE_COLUMNS.length
                ? []
                : BASE_COLUMNS.map((c) => c.id)
        );
    };

    const handleResetColumns = () => {
        setVisibleCols(DEFAULT_VISIBLE_COLS);
        setColumnSearch("");
    };

    const filteredBaseColumns = BASE_COLUMNS.filter((c) =>
        c.label.toLowerCase().includes(columnSearch.toLowerCase())
    );

    const allChecked = visibleCols.length === BASE_COLUMNS.length;
    const someChecked =
        visibleCols.length > 0 && visibleCols.length < BASE_COLUMNS.length;

    // ---------- HELPER: hiển thị tên category thay vì id ----------
    const getCategoryLabel = (p) => {
        if (p.category && (p.category.name || p.category.title || p.category.slug)) {
            return p.category.name || p.category.title || p.category.slug;
        }
        const catId = p.categories_id ?? p.category_id;
        if (catId == null || catId === "") return "-";

        const found = categories.find(
            (c) =>
                c.id === catId ||
                String(c.id) === String(catId) ||
                c.slug === catId ||
                c.name === catId
        );

        if (found) {
            return found.name || found.title || found.slug || catId;
        }
        return catId;
    };

    // ----------------- RENDER -----------------
    return (
        <Box>
            {/* Header: title + search + buttons */}
            <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ mb: 2 }}
            >
                <Typography variant="h6" sx={{ whiteSpace: "nowrap" }}>
                    Products
                </Typography>

                <Box sx={{ flex: 1 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Tìm theo ID, tên, slug, mô tả, category..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                    />
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onCreate}
                    >
                        Create product
                    </Button>
                    <Tooltip title="Chọn cột hiển thị">
                        <IconButton
                            onClick={handleOpenColumns}
                            sx={{ border: "1px solid #ddd" }}
                        >
                            <ViewColumnIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Popup chọn cột */}
            <Popover
                open={openColumns}
                anchorEl={columnAnchorEl}
                onClose={handleCloseColumns}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
            >
                <Box sx={{ p: 1.5, width: 260 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search"
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                    />
                    <FormGroup
                        sx={{ mt: 1, maxHeight: 220, overflowY: "auto" }}
                    >
                        {filteredBaseColumns.map((col) => (
                            <FormControlLabel
                                key={col.id}
                                control={
                                    <Checkbox
                                        checked={visibleCols.includes(col.id)}
                                        onChange={() =>
                                            handleToggleColumn(col.id)
                                        }
                                    />
                                }
                                label={col.label}
                            />
                        ))}
                    </FormGroup>
                    <Box
                        sx={{
                            mt: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allChecked}
                                    indeterminate={someChecked}
                                    onChange={handleToggleAllColumns}
                                />
                            }
                            label="Show/Hide All"
                        />
                        <Button size="small" onClick={handleResetColumns}>
                            RESET
                        </Button>
                    </Box>
                </Box>
            </Popover>

            <Paper>
                {loading ? (
                    <Box
                        sx={{
                            p: 3,
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {BASE_COLUMNS.filter((c) =>
                                        visibleCols.includes(c.id)
                                    ).map((col) => (
                                        <TableCell key={col.id}>
                                            {col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visibleItems.map((p) => (
                                    <TableRow key={p.id} hover>
                                        {BASE_COLUMNS.filter((c) =>
                                            visibleCols.includes(c.id)
                                        ).map((col) => {
                                            switch (col.id) {
                                                case "id":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            width={70}
                                                        >
                                                            {p.id}
                                                        </TableCell>
                                                    );
                                                case "name":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            sx={{
                                                                maxWidth: 260,
                                                                whiteSpace:
                                                                    "nowrap",
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                            }}
                                                        >
                                                            {p.name ?? p.title}
                                                        </TableCell>
                                                    );
                                                case "price":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                        >
                                                            {p.first_detail
                                                                ?.price
                                                                ? Number(
                                                                      p
                                                                          .first_detail
                                                                          .price
                                                                  ).toLocaleString(
                                                                      "vi-VN"
                                                                  ) + "₫"
                                                                : "—"}
                                                        </TableCell>
                                                    );
                                                case "quantity": {
                                                    const qty =
                                                        p.first_detail &&
                                                        typeof p.first_detail
                                                            .quantity ===
                                                            "number"
                                                            ? p.first_detail
                                                                  .quantity
                                                            : p.quantity !==
                                                                  undefined &&
                                                              p.quantity !==
                                                                  null
                                                            ? p.quantity
                                                            : null;
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                        >
                                                            {qty === null
                                                                ? "—"
                                                                : Number(
                                                                      qty
                                                                  ).toLocaleString(
                                                                      "en-US"
                                                                  )}
                                                        </TableCell>
                                                    );
                                                }
                                                case "slug":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            sx={{
                                                                maxWidth: 180,
                                                                whiteSpace:
                                                                    "nowrap",
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                            }}
                                                        >
                                                            {p.slug ?? "-"}
                                                        </TableCell>
                                                    );
                                                case "description":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            sx={{
                                                                maxWidth: 260,
                                                                whiteSpace:
                                                                    "nowrap",
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                            }}
                                                        >
                                                            {p.description ??
                                                                "-"}
                                                        </TableCell>
                                                    );
                                                case "status": {
                                                    const qty =
                                                        p.first_detail &&
                                                        typeof p.first_detail
                                                            .quantity ===
                                                            "number"
                                                            ? p.first_detail
                                                                  .quantity
                                                            : p.quantity !==
                                                                  undefined &&
                                                              p.quantity !==
                                                                  null
                                                            ? p.quantity
                                                            : null;

                                                    const isInStock =
                                                        qty === null
                                                            ? p.status === 1 ||
                                                              p.status ===
                                                                  "1" ||
                                                              p.status === true
                                                            : Number(qty) > 0;

                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                        >
                                                            {isInStock ? (
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
                                                    );
                                                }
                                                case "category":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                        >
                                                            {getCategoryLabel(
                                                                p
                                                            )}
                                                        </TableCell>
                                                    );
                                                case "color":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                        >
                                                            {p.first_detail
                                                                ?.color?.name ??
                                                                "—"}
                                                        </TableCell>
                                                    );
                                                case "size":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                        >
                                                            {p.first_detail
                                                                ?.size?.name ??
                                                                "—"}
                                                        </TableCell>
                                                    );
                                                case "image": {
                                                    let src = null;
                                                    if (p.image_url)
                                                        src = p.image_url;
                                                    else if (
                                                        Array.isArray(
                                                            p.images
                                                        ) &&
                                                        p.images.length
                                                    )
                                                        src = p.images[0];

                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            width={80}
                                                        >
                                                            {src ? (
                                                                <Box
                                                                    component="img"
                                                                    src={src}
                                                                    alt=""
                                                                    sx={{
                                                                        width: 50,
                                                                        height: 50,
                                                                        objectFit:
                                                                            "cover",
                                                                        borderRadius: 1,
                                                                        display:
                                                                            "block",
                                                                    }}
                                                                />
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </TableCell>
                                                    );
                                                }
                                                case "actions":
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            sx={{
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            <Stack
                                                                direction="row"
                                                                spacing={0.5}
                                                            >
                                                                <Tooltip title="Xem chi tiết (frontend)">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                            window.open(
                                                                                `/product/${p.id}`,
                                                                                "_blank"
                                                                            )
                                                                        }
                                                                    >
                                                                        <VisibilityIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Sửa sản phẩm">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                            onEdit(
                                                                                p
                                                                            )
                                                                        }
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Xóa sản phẩm">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() =>
                                                                            handleDelete(
                                                                                p.id
                                                                            )
                                                                        }
                                                                    >
                                                                        <DeleteIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        </TableCell>
                                                    );
                                                default:
                                                    return null;
                                            }
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                p: 2,
                            }}
                        >
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, v) => setPage(v)}
                            />
                        </Box>
                    </TableContainer>
                )}
            </Paper>

            <ProductEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                item={editing}
                onSave={handleSave}
                categories={categories}
                colors={colors}
                sizes={sizes}
                optsLoading={optsLoading}
            />
        </Box>
    );
}

// =============== DIALOG EDIT PRODUCT (giữ gần như cũ) =================
function ProductEditDialog({
    open,
    onClose,
    item,
    onSave,
    categories = [],
    colors = [],
    sizes = [],
    optsLoading = false,
}) {
    const [form, setForm] = useState(item ?? null);
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(item ? { ...item } : null);
        setFiles([]);
        setPreviews([]);
    }, [item]);

    useEffect(() => {
        if (!files || files.length === 0) {
            setPreviews([]);
            return;
        }
        const readers = [];
        const results = [];
        files.forEach((f, idx) => {
            const r = new FileReader();
            readers.push(r);
            r.onload = (e) => {
                results[idx] = e.target.result;
                if (results.filter(Boolean).length === files.length)
                    setPreviews([...results]);
            };
            r.readAsDataURL(f);
        });
        return () => {
            readers.forEach((r) => {
                try {
                    r.abort();
                } catch {
                    /* ignore */
                }
            });
        };
    }, [files]);

    if (!form) return null;

    const handleFilesChange = (e) => {
        const fl = Array.from(e.target.files || []);
        setFiles(fl);
    };

    const handleSaveClick = async () => {
        setSaving(true);
        try {
            const payload = { ...form };
            if (
                payload.status === true ||
                payload.status === "true" ||
                payload.status === "1" ||
                payload.status === 1
            )
                payload.status = 1;
            else payload.status = 0;

            if (payload.categories_id === "" || payload.categories_id === null)
                payload.categories_id = null;
            if (payload.colors_id === "" || payload.colors_id === null)
                payload.colors_id = null;
            if (payload.sizes_id === "" || payload.sizes_id === null)
                payload.sizes_id = null;

            if (
                payload.description === undefined ||
                payload.description === null
            )
                payload.description = "";

            if (payload.quantity === undefined || payload.quantity === null)
                payload.quantity = 0;
            else payload.quantity = Number(payload.quantity);

            await onSave(payload, files);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {form.id ? "Edit product" : "Create product"}
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="Name"
                    fullWidth
                    value={form.name || ""}
                    onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                    }
                    sx={{ mt: 1 }}
                />
                <TextField
                    label="Price"
                    fullWidth
                    value={form.price ?? ""}
                    onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                    }
                    sx={{ mt: 1 }}
                />
                <TextField
                    label="Description"
                    fullWidth
                    multiline
                    minRows={3}
                    value={form.description ?? ""}
                    onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                    }
                    sx={{ mt: 1 }}
                />

                <TextField
                    select
                    label="Status"
                    fullWidth
                    value={String(form.status ?? "1")}
                    onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                    }
                    sx={{ mt: 1 }}
                    helperText="1 = Còn hàng, 0 = Hết hàng (lưu ý: hệ thống sẽ ưu tiên quantity của detail để hiện thị status)"
                >
                    <MenuItem value={"1"}>Còn hàng</MenuItem>
                    <MenuItem value={"0"}>Hết hàng</MenuItem>
                </TextField>

                <TextField
                    select
                    label="Category"
                    fullWidth
                    value={form.categories_id ?? ""}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            categories_id: e.target.value,
                        })
                    }
                    sx={{ mt: 1 }}
                    helperText={optsLoading ? "Loading categories..." : ""}
                >
                    <MenuItem value="">-- none --</MenuItem>
                    {categories.map((c) => (
                        <MenuItem
                            key={c.id ?? c.slug ?? c.name}
                            value={c.id ?? c.slug ?? c.name}
                        >
                            {c.name ?? c.title ?? c.slug}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Color"
                    fullWidth
                    value={form.colors_id ?? ""}
                    onChange={(e) =>
                        setForm({ ...form, colors_id: e.target.value })
                    }
                    sx={{ mt: 1 }}
                    helperText={optsLoading ? "Loading colors..." : ""}
                >
                    <MenuItem value="">-- none --</MenuItem>
                    {colors.map((c) => (
                        <MenuItem
                            key={c.id ?? c.slug ?? c.name}
                            value={c.id ?? c.slug ?? c.name}
                        >
                            {c.name ?? c.title ?? c.slug}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Size"
                    fullWidth
                    value={form.sizes_id ?? ""}
                    onChange={(e) =>
                        setForm({ ...form, sizes_id: e.target.value })
                    }
                    sx={{ mt: 1 }}
                    helperText={optsLoading ? "Loading sizes..." : ""}
                >
                    <MenuItem value="">-- none --</MenuItem>
                    {sizes.map((s) => (
                        <MenuItem
                            key={s.id ?? s.slug ?? s.name}
                            value={s.id ?? s.slug ?? s.name}
                        >
                            {s.name ?? s.title ?? s.slug}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Quantity (for first detail)"
                    fullWidth
                    type="number"
                    value={form.quantity ?? 0}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            quantity: Number(e.target.value),
                        })
                    }
                    sx={{ mt: 1 }}
                    helperText="Số lượng sẽ quyết định hiển thị Status (Còn/Hết hàng) sau khi lưu"
                />

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Images</Typography>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFilesChange}
                        style={{ marginTop: 8 }}
                    />
                    <Box
                        sx={{
                            mt: 1,
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                        }}
                    >
                        {previews.map((p, idx) => (
                            <Paper
                                key={idx}
                                sx={{
                                    width: 120,
                                    height: 90,
                                    overflow: "hidden",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <img
                                    src={p}
                                    alt={`preview-${idx}`}
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                    }}
                                />
                            </Paper>
                        ))}
                        {!previews.length && form.image_url && (
                            <Paper
                                sx={{
                                    width: 120,
                                    height: 90,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <img
                                    src={form.image_url}
                                    alt="existing"
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                    }}
                                />
                            </Paper>
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSaveClick}
                    disabled={saving}
                >
                    {saving ? "Saving..." : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
