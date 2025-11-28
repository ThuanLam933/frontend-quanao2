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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { API_BASE } from "../AdminPanel";

function CategoryEditDialog({ open, onClose, item, onSave, slugify }) {
    const [form, setForm] = useState(item ?? null);
    const [manualSlug, setManualSlug] = useState(false);

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

    if (!form) return null;
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{form.id ? "Edit category" : "Create category"}</DialogTitle>
            <DialogContent>
                <TextField
                    label="Name"
                    fullWidth
                    value={form.name || ""}
                    onChange={(e) => onNameChange(e.target.value)}
                    sx={{ mt: 1 }}
                />
                <TextField
                    label="Slug"
                    fullWidth
                    value={form.slug ?? ""}
                    onChange={(e) => onSlugChange(e.target.value)}
                    sx={{ mt: 1 }}
                    helperText="Nếu muốn slug khác mặc định, chỉnh tay vào đây."
                />
                <TextField
                    label="Description"
                    fullWidth
                    multiline
                    minRows={3}
                    value={form.description ?? ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={() => onSave(form)}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function CategoriesPage({ setSnack }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
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
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/categories`);
            if (!res.ok) throw new Error("Categories fetch failed");
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
            setItems(arr);
            setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
        } catch (err) {
            console.error("fetchCategories", err);
            setSnack({ severity: "error", message: "Không tải được categories." });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const onEdit = (item) => {
        setEditing(item);
        setEditOpen(true);
    };
    const onCreate = () => {
        setEditing({ name: "", slug: "", description: "" });
        setEditOpen(true);
    };

    const handleSave = async (obj) => {
        const token = localStorage.getItem("access_token");
        try {
            const method = obj.id ? "PUT" : "POST";
            const url = obj.id
                ? `${API_BASE}/api/categories/${obj.id}`
                : `${API_BASE}/api/categories`;
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(obj),
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(txt || "Save failed");
            }
            setSnack({ severity: "success", message: "Lưu danh mục thành công" });
            setEditOpen(false);
            fetchCategories();
        } catch (err) {
            console.error("save category", err);
            setSnack({ severity: "error", message: "Lưu danh mục thất bại" });
        }
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem("access_token");
        if (!window.confirm("Xóa danh mục?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/categories/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Delete failed");
            setSnack({ severity: "success", message: "Đã xóa danh mục" });
            fetchCategories();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Xóa thất bại" });
        }
    };

    const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <Box>
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
            >
                <Typography variant="h6">Categories</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
                    Create category
                </Button>
            </Stack>

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
                                    <TableCell>Name</TableCell>
                                    <TableCell>Slug</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visible.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>{c.id}</TableCell>
                                        <TableCell>{c.name}</TableCell>
                                        <TableCell>{c.slug ?? "-"}</TableCell>
                                        <TableCell>{c.description ?? "-"}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() =>
                                                    window.open(
                                                        `/collections?category=${c.slug || c.name}`,
                                                        "_blank"
                                                    )
                                                }
                                            >
                                                View
                                            </Button>
                                            <Button
                                                size="small"
                                                startIcon={<EditIcon />}
                                                onClick={() => onEdit(c)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                startIcon={<DeleteIcon />}
                                                onClick={() => handleDelete(c.id)}
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, v) => setPage(v)}
                            />
                        </Box>
                    </TableContainer>
                )}
            </Paper>

            <CategoryEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                item={editing}
                onSave={handleSave}
                slugify={slugify}
            />
        </Box>
    );
}
