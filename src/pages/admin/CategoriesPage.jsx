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
import SearchIcon from "@mui/icons-material/Search";
import { API_BASE } from "../AdminPanel";

function CategoryEditDialog({ open, onClose, item, onSave, slugify }) {
  const [form, setForm] = useState(item ?? null);
  const [manualSlug, setManualSlug] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(item ?? null);
    setManualSlug(false);
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
      alert("Tên danh mục không được để trống");
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
        {form.id ? "Edit category" : "Thêm loại sản phẩm"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Tên loại sản phẩm"
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
          />
          {/* <TextField
            label="Ghi chú"
            fullWidth
            multiline
            minRows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          /> */}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSaveClick} disabled={saving}>
          {saving ? "Saving..." : "Save"}
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

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      if (!res.ok) throw new Error("Categories fetch failed");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setItems(arr);
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

  const filtered = items.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.slug?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
    if (page > Math.ceil(filtered.length / PAGE_SIZE) && filtered.length > 0) {
      setPage(1);
    }
  }, [filtered.length, page]);

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      setSnack({ severity: "error", message: "Xóa thất bại. " });
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Loại sản phẩm
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
          Thêm loại sản phẩm
        </Button>
      </Stack>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
            <SearchIcon fontSize="small" />
            <TextField
              size="small"
              fullWidth
              placeholder="Tìm theo tên, slug hoặc mô tả..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Tổng: {items.length} danh mục
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
                <TableCell width={60}>#</TableCell>
                <TableCell>Tên loại sản phẩm</TableCell>
                <TableCell align="right" width={160}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((c) => (
                <TableRow hover key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {c.name}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(c)}>
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
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Không có danh mục nào.
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
            onChange={(_, v) => setPage(v)}
            size="small"
          />
        </Box>
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
