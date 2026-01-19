import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Paper, Typography, Button, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Stack,
} from "@mui/material";

const API_BASE = "http://127.0.0.1:8000";

export default function CommentsPage({ setSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setSnack?.({ severity: "error", message: "Cần đăng nhập admin" });
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/reviews?per_page=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      console.log("admin/reviews status:", res.status, "data:", data);

      if (!res.ok) throw new Error(data?.message || "admin reviews fetch failed");

      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error(err);
      setSnack?.({ severity: "error", message: "Không tải reviews (admin)" });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [setSnack]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDelete = async (id) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setSnack?.({ severity: "error", message: "Cần đăng nhập admin" });
      return;
    }
    if (!window.confirm("Xóa review/comment?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      console.log("delete admin/reviews status:", res.status, "data:", data);

      if (!res.ok) throw new Error(data?.message || "delete failed");

      setSnack?.({ severity: "success", message: "Đã xóa" });
      fetchComments();
    } catch (err) {
      console.error(err);
      setSnack?.({ severity: "error", message: "Xóa thất bại" });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Reviews</Typography>
        <Button onClick={fetchComments}>Refresh</Button>
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
                  <TableCell>User</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Comment</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.user?.email ?? c.user?.name ?? c.user_id}</TableCell>
                    <TableCell>{c.product?.name ?? c.product_id}</TableCell>
                    <TableCell>{c.rating ?? "—"}</TableCell>
                    <TableCell>{c.comment ?? "—"}</TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => handleDelete(c.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>Chưa có review.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
