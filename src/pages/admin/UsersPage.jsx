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
    TextField,
    IconButton,
    Tooltip,
    Chip,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Pagination,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import VisibilityIcon from "@mui/icons-material/Visibility";

const PAGE_SIZE = 12;

export default function UsersPage({ setSnack }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);

    const getStoredToken = () => {
        let token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token") ||
            null;

        if (!token) return null;

        try {
            const maybe = JSON.parse(token);
            if (typeof maybe === "string") token = maybe;
        } catch (e) {}

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
            const arr = Array.isArray(data)
                ? data
                : data.data ?? data.items ?? [];

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

    const filtered = users.filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;

        return (
            String(u.id ?? "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.name || "").toLowerCase().includes(q)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visible = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

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
                        Users
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý tài khoản người dùng.
                    </Typography>
                </Box>

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={fetchUsers}
                >
                    Refresh
                </Button>
            </Stack>

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
                            placeholder="Tìm theo email, tên hoặc ID..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                        Tổng: {users.length} users
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
                                <TableCell align="right" sx={{ width: 60 }}>
                                    #
                                </TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Verified</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right" sx={{ width: 160 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        align="center"
                                        sx={{ py: 6 }}
                                    >
                                        Không có users
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visible.map((u) => {
                                    const verified = Boolean(
                                        u.email_verified_at
                                    );
                                    const locked = Boolean(u.locked);
                                    const createdTime =
                                        u.created_at || u.updated_at || null;

                                    return (
                                        <TableRow hover key={u.id}>
                                            <TableCell align="right">
                                                {u.id}
                                            </TableCell>
                                            <TableCell>
                                                {u.email ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {u.name ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={
                                                        verified ? "Yes" : "No"
                                                    }
                                                    color={
                                                        verified
                                                            ? "success"
                                                            : "default"
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {createdTime
                                                    ? new Date(
                                                          createdTime
                                                      ).toLocaleString("vi-VN")
                                                    : "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    justifyContent="flex-end"
                                                >
                                                    <Tooltip
                                                        title={
                                                            locked
                                                                ? "Mở khóa user"
                                                                : "Khóa user"
                                                        }
                                                    >
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    toggleLock(
                                                                        u
                                                                    )
                                                                }
                                                                disabled={!u.id}
                                                                color={
                                                                    locked
                                                                        ? "warning"
                                                                        : "error"
                                                                }
                                                            >
                                                                {locked ? (
                                                                    <LockOpenIcon fontSize="small" />
                                                                ) : (
                                                                    <LockIcon fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>

                                                    <Tooltip title="Xem chi tiết">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                setSelectedUser(
                                                                    u
                                                                )
                                                            }
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider />

                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        p: 1.5,
                    }}
                >
                    <Pagination
                        size="small"
                        count={totalPages}
                        page={currentPage}
                        onChange={(_, v) => setPage(v)}
                    />
                </Box>
            </Paper>

            <UserDetailDialog
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />
        </Box>
    );
}

function UserDetailDialog({ user, onClose }) {
    const open = !!user;
    if (!open) return null;

    const verified = Boolean(user.email_verified_at);
    const locked = Boolean(user.locked);
    const createdTime = user.created_at || user.updated_at || null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>User #{user?.id}</DialogTitle>

            <DialogContent dividers>
                <Typography variant="subtitle2" gutterBottom>
                    Thông tin cơ bản
                </Typography>

                <Typography variant="body2">
                    Email: {user?.email ?? "—"}
                </Typography>
                <Typography variant="body2">
                    Name: {user?.name ?? "—"}
                </Typography>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Trạng thái
                    </Typography>

                    <Stack direction="row" spacing={1}>
                        <Chip
                            size="small"
                            label={
                                verified ? "Verified" : "Chưa xác thực"
                            }
                            color={verified ? "success" : "default"}
                        />
                        <Chip
                            size="small"
                            label={locked ? "Locked" : "Active"}
                            color={locked ? "error" : "success"}
                        />
                    </Stack>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Thời gian
                    </Typography>

                    <Typography variant="body2">
                        Created:{" "}
                        {createdTime
                            ? new Date(createdTime).toLocaleString("vi-VN")
                            : "—"}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
