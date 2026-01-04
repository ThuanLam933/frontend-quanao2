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
    Stack,
} from "@mui/material";


const API_BASE = "http://127.0.0.1:8000";

export default function CommentsPage({ setSnack }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchComments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/comments`);
            if (!res.ok) throw new Error("comments fetch failed");
            const data = await res.json();
            setItems(Array.isArray(data) ? data : data.data ?? []);
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Không tải comments" });
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
            setSnack({ severity: "error", message: "Cần đăng nhập" });
            return;
        }
        if (!window.confirm("Xóa comment?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/comments/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("delete failed");
            setSnack({ severity: "success", message: "Đã xóa" });
            fetchComments();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Xóa thất bại" });
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Comments</Typography>
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
                                    <TableCell>Comment</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>{c.id}</TableCell>
                                        <TableCell>{c.user?.email ?? c.user_id}</TableCell>
                                        <TableCell>{c.body}</TableCell>
                                        <TableCell>
                                            <Button size="small" color="error" onClick={() => handleDelete(c.id)}>
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
}
