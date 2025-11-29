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
    Pagination,
    Stack,
    IconButton,
    Divider,
    Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import { API_BASE } from "../AdminPanel";

/* -------------------- EDIT / CREATE DIALOG -------------------- */

function ColorEditDialog({ open, onClose, item, onSave, slugify }) {
    const [form, setForm] = useState(item ?? null);
    const [manualSlug, setManualSlug] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(item ?? null);
        setManualSlug(!!(item && item.slug));
    }, [item]);

    const onNameChange = (value) => {
        const next = { ...(form || {}), name: value };
        if (!manualSlug) {
            next.slug = slugify(value);
        }
        setForm(next);
    };

    const onSlugChange = (value) => {
        setManualSlug(true);
        setForm({ ...(form || {}), slug: value });
    };

    const handleSaveClick = async () => {
        if (!form) return;
        if (!form.name || !form.name.trim()) {
            alert("Tên màu không được để trống");
            return;
        }
        const payload = {
            ...form,
            name: form.name.trim(),
            slug: (form.slug || slugify(form.name)).trim(),
        };
        setSaving(true);
        try {
            await onSave(payload);
        } finally {
            setSaving(false);
        }
    };

    if (!form) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {form.id ? "Edit color" : "Create color"}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Name"
                        fullWidth
                        required
                        value={form.name || ""}
                        onChange={(e) => onNameChange(e.target.value)}
                    />
                    <TextField
                        label="Slug"
                        fullWidth
                        value={form.slug ?? ""}
                        onChange={(e) => onSlugChange(e.target.value)}
                        helperText="Nếu muốn slug khác mặc định, chỉnh tay vào đây."
                    />
                </Stack>
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

/* -------------------- MAIN PAGE -------------------- */

export default function ColorsPage({ setSnack }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");

    const slugify = (text) => {
        if (!text) return "";
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    const fetchColors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/colors`);
            if (!res.ok) throw new Error("Colors fetch failed");
            const data = await res.json();
            const rawArr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
            const arr = (rawArr || []).map((it) => {
                const name = it.name ?? it.title ?? "";
                const slug = it.slug ?? (name ? slugify(name) : "");
                return { ...it, name, slug };
            });
            setItems(arr);
        } catch (err) {
            console.error("fetchColors", err);
            setSnack({ severity: "error", message: "Không tải được colors." });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    useEffect(() => {
        fetchColors();
    }, [fetchColors]);

    // Lọc theo search
    const filtered = items.filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            c.name?.toLowerCase().includes(q) ||
            c.slug?.toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        setTotalPages(pages);
        if (page > pages && filtered.length > 0) {
            setPage(1);
        }
    }, [filtered.length, page]);

    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const onEdit = (item) => {
        setEditing(item);
        setEditOpen(true);
    };
    const onCreate = () => {
        setEditing({ name: "", slug: "" });
        setEditOpen(true);
    };

    const handleSave = async (obj) => {
        const token = localStorage.getItem("access_token");
        try {
            const method = obj.id ? "PUT" : "POST";
            const url = obj.id
                ? `${API_BASE}/api/colors/${obj.id}`
                : `${API_BASE}/api/colors`;
            const payload = {
                name: obj.name,
                slug: obj.slug && String(obj.slug).trim()
                    ? obj.slug
                    : slugify(obj.name),
            };
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(txt || "Save failed");
            }
            setSnack({ severity: "success", message: "Lưu color thành công" });
            setEditOpen(false);
            fetchColors();
        } catch (err) {
            console.error("save color", err);
            setSnack({ severity: "error", message: "Lưu color thất bại" });
        }
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem("access_token");
        if (!window.confirm("Xóa color?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/colors/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Delete failed");
            setSnack({ severity: "success", message: "Đã xóa color" });
            fetchColors();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Xóa thất bại" });
        }
    };

    return (
        <Box>
            {/* HEADER */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Colors
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý màu sản phẩm dùng trong bộ lọc & hiển thị.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onCreate}
                >
                    Create color
                </Button>
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
                            placeholder="Tìm theo tên hoặc slug..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Tổng: {items.length} màu
                    </Typography>
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
                                <TableCell
                                    align="right"
                                    sx={{ width: 60 }}
                                >
                                    #
                                </TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell
                                    align="right"
                                    sx={{ width: 160 }}
                                >
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visible.map((c) => (
                                <TableRow hover key={c.id}>
                                    <TableCell align="right">{c.id}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {c.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="View on site">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        window.open(
                                                            `/collections?color=${c.slug || c.name}`,
                                                            "_blank"
                                                        )
                                                    }
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onEdit(c)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(c.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {visible.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        <Box sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Không có màu nào.
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
                        count={totalPages}
                        page={page}
                        onChange={(_, v) => setPage(v)}
                        size="small"
                    />
                </Box>
            </Paper>

            {/* DIALOG */}
            <ColorEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                item={editing}
                onSave={handleSave}
                slugify={slugify}
            />
        </Box>
    );
}
