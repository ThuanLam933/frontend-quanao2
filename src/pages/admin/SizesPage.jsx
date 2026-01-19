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



function SizeEditDialog({ open, onClose, item, onSave, slugify }) {
    const [form, setForm] = useState(item ?? null);
    const [manualSlug, setManualSlug] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(item ?? null);
        setManualSlug(false);
    }, [item]);

    const onNameChange = (v) => {
        const next = { ...(form || {}), name: v };
        if (!manualSlug) next.slug = slugify(v);
        setForm(next);
    };

    const onSlugChange = (v) => {
        setManualSlug(true);
        setForm({ ...(form || {}), slug: v });
    };

    const handleSave = async () => {
        if (!form.name?.trim()) {
            alert("Tên size không được để trống");
            return;
        }
        const payload = {
            ...form,
            name: form.name.trim(),
            slug: form.slug?.trim() || slugify(form.name),
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                {form.id ? "Edit size" : "THêm kích cỡ sản phẩm"}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Tên kích cỡ"
                        fullWidth
                        required
                        value={form.name}
                        onChange={(e) => onNameChange(e.target.value)}
                    />
                    <TextField
                        label="Slug"
                        fullWidth
                        value={form.slug}
                        onChange={(e) => onSlugChange(e.target.value)}
                        
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Lưu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}



export default function SizesPage({ setSnack }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;
    const [totalPages, setTotalPages] = useState(1);

    const slugify = (text) => {
        if (!text) return "";
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    };

    const fetchSizes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/sizes`);
            if (!res.ok) throw new Error("Fetch failed");
            const data = await res.json();
            const raw = Array.isArray(data) ? data : data.data ?? [];

            const arr = raw.map((s) => ({
                ...s,
                name: s.name,
                slug: s.slug ?? slugify(s.name),
            }));

            setItems(arr);
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Không tải được sizes." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSizes();
    }, []);

    
    const filtered = items.filter((s) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            s.name?.toLowerCase().includes(q) ||
            s.slug?.toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        setTotalPages(pages);
        if (page > pages) setPage(1);
    }, [filtered.length]);

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
                ? `${API_BASE}/api/sizes/${obj.id}`
                : `${API_BASE}/api/sizes`;

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(obj),
            });

            if (!res.ok) throw new Error("Save failed");

            setSnack({ severity: "success", message: "Lưu size thành công" });
            setEditOpen(false);
            fetchSizes();
        } catch (err) {
            setSnack({ severity: "error", message: "Lưu size thất bại" });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa size này?")) return;

        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch(`${API_BASE}/api/sizes/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error("Delete failed");

            setSnack({ severity: "success", message: "Đã xóa size" });
            fetchSizes();
        } catch (err) {
            setSnack({ severity: "error", message: "Xóa thất bại" });
        }
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
                        Quản lý kích cỡ sản phẩm
                    </Typography>
                    
                </Box>

                <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
                    Thêm kích cỡ
                </Button>
            </Stack>

            
            <Paper sx={{ mb: 2, p: 2 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                        <SearchIcon fontSize="small" />
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Tìm kiếm"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                        Tổng: {items.length} size
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
                                <TableCell align="right" sx={{ width: 60 }}>#</TableCell>
                                <TableCell>Tên màu sản phẩm</TableCell>
                                <TableCell align="right" sx={{ width: 160 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((s) => (
                                <TableRow hover key={s.id}>
                                    <TableCell align="right">{s.id}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {s.name}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                                            <IconButton
                                                size="small"
                                                onClick={() => onEdit(s)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>

                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(s.id)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}

                            
                            {visible.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        <Box sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Không có size nào.
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
                        page={page}
                        onChange={(_, v) => setPage(v)}
                    />
                </Box>
            </Paper>

            
            <SizeEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                item={editing}
                onSave={handleSave}
                slugify={slugify}
            />
        </Box>
    );
}
