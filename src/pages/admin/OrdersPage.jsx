// src/pages/admin/OrdersPage.jsx
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
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";

// Tránh import vòng lặp từ AdminPanel, khai báo API_BASE cục bộ
const API_BASE = "http://127.0.0.1:8000";

export default function OrdersPage({ setSnack }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sel, setSel] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE}/api/orders-all`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            if (!res.ok) throw new Error("Orders fetch failed");
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.data ?? [];
            setOrders(arr);
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Không tải danh sách đơn hàng!" });
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [setSnack]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleView = (o) => setSel(o);

    const changeStatus = async (orderId, status) => {
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Status update failed");
            setSnack({ severity: "success", message: "Cập nhật trạng thái thành công!" });
            fetchOrders();
        } catch (err) {
            console.error(err);
            setSnack({ severity: "error", message: "Cập nhật thất bại!" });
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6">Orders (Admin)</Typography>
                <Button onClick={fetchOrders}>Refresh</Button>
            </Box>

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
                                    <TableCell>Customer Name</TableCell>
                                    <TableCell>Total</TableCell>
                                    <TableCell>Payment</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.map((o) => (
                                    <TableRow key={o.id}>
                                        <TableCell>{o.id}</TableCell>
                                        <TableCell>{o.user?.email ?? "—"}</TableCell>
                                        <TableCell>{o.name ?? "—"}</TableCell>
                                        <TableCell>
                                            {o.total_price ? Number(o.total_price).toLocaleString("vi-VN") + "₫" : "—"}
                                        </TableCell>
                                        <TableCell>{o.payment_method ?? "—"}</TableCell>
                                        <TableCell>{o.status ?? "—"}</TableCell>
                                        <TableCell>
                                            <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handleView(o)}>
                                                View
                                            </Button>
                                            <Button size="small" onClick={() => changeStatus(o.id, "confirmed")}>
                                                Confirm
                                            </Button>
                                            <Button size="small" color="error" onClick={() => changeStatus(o.id, "cancelled")}>
                                                Cancel
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="md" fullWidth>
                <DialogTitle>Order #{sel?.id}</DialogTitle>
                <DialogContent>
                    <Typography>Email: {sel?.email}</Typography>
                    <Typography>Phone: {sel?.phone}</Typography>
                    <Typography>Address: {sel?.address}</Typography>
                    <Typography sx={{ mt: 2 }}>
                        Total Price: {sel?.total_price ? Number(sel.total_price).toLocaleString("vi-VN") + "₫" : "—"}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSel(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}