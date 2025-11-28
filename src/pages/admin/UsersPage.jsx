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

export default function UsersPage({ setSnack }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const getStoredToken = () => {
        let token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token") ||
            null;
        if (!token) return null;
        try {
            const maybe = JSON.parse(token);
            if (typeof maybe === "string") token = maybe;
        } catch (e) { }
        return String(token).trim();
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const res = await fetch("http://127.0.0.1:8000/api/admin/users", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) throw new Error("users fetch failed");
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
            setUsers(arr);
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Không tải users" });
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const toggleLock = async (u) => {
        const token = getStoredToken();
        try {
            const res = await fetch(
                `http://127.0.0.1:8000/api/admin/users/${u.id}/toggle-lock`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({}),
                }
            );
            if (!res.ok) throw new Error("toggle failed");
            setSnack({ severity: "success", message: "Cập nhật user" });
            fetchUsers();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Thao tác thất bại" });
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Users</Typography>
                <Button onClick={fetchUsers}>Refresh</Button>
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
                                    <TableCell>Email</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Verified</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                            Không có users
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell>{u.id}</TableCell>
                                            <TableCell>{u.email ?? "—"}</TableCell>
                                            <TableCell>{u.name ?? "—"}</TableCell>
                                            <TableCell>
                                                {u.email_verified_at ? (
                                                    <Typography component="span" variant="body2" color="success.main">
                                                        Yes
                                                    </Typography>
                                                ) : (
                                                    <Typography component="span" variant="body2" color="text.secondary">
                                                        No
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {u.created_at
                                                    ? new Date(u.created_at).toLocaleString()
                                                    : u.updated_at
                                                        ? new Date(u.updated_at).toLocaleString()
                                                        : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    onClick={() => toggleLock(u)}
                                                    sx={{ mr: 1 }}
                                                    disabled={!u.id}
                                                >
                                                    {u.locked ? "Unlock" : "Lock"}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => {
                                                        console.log("View user", u.id);
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
}
