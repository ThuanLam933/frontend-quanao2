import React, { useEffect, useState, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Chip,
  Stack,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { API_BASE } from "../AdminPanel";
const parseIso = (s) => {
  if (!s) return null;
  const normalized = String(s).replace(/\.\d+Z$/, "Z");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTimeVN = (isoString) => {
  const d = parseIso(isoString);
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
};

const toDatetimeLocalValue = (isoString) => {
  const d = parseIso(isoString);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocalToIso = (value) => {
  if (!value) return null;
  return new Date(value).toISOString();
};
export default function DiscountProductPage({ setSnack }) {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // Drop phần microseconds kiểu .000000Z để Date parse ổn định hơn





  // ================= FETCH =================
  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/product-discounts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : data.data ?? []);
    } catch (e) {
      console.error(e);
      setSnack({
        severity: "error",
        message: "Không tải được danh sách giảm giá",
      });
    } finally {
      setLoading(false);
    }
  }, [setSnack]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Xóa mã giảm giá này?")) return;

    try {
      await fetch(`${API_BASE}/api/admin/product-discounts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      setSnack({
        severity: "success",
        message: "Đã xóa mã giảm giá",
      });
      fetchDiscounts();
    } catch (e) {
      console.error(e);
      setSnack({
        severity: "error",
        message: "Xóa thất bại",
      });
    }
  };

  return (
    <Box>
      <Stack
  direction="row"
  alignItems="center"
  justifyContent="space-between"
  sx={{ mb: 2 }}
>
  <Typography variant="h5">Quản lý mã giảm giá</Typography>

  <Button
    variant="contained"
    startIcon={<AddIcon />}
    onClick={() => {
      setEditing(null);
      setDialogOpen(true);
    }}
  >
    Thêm mã giảm
  </Button>
</Stack>



      <Paper sx={{ mt: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Giá trị</TableCell>
                <TableCell>Thời gian</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {discounts.length ? (
                discounts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.id}</TableCell>

                    <TableCell>
                      {d.type === "percent" ? "Phần trăm" : "Cố định"}
                    </TableCell>

                    <TableCell>
                      {d.type === "percent"
                        ? `${d.value}%`
                        : `${Number(d.value).toLocaleString("vi-VN")}₫`}
                    </TableCell>

                    <TableCell>
                     {formatDateTimeVN(d.start_at)} → {formatDateTimeVN(d.end_at)}
                    </TableCell>
                    <TableCell>
                      {d.is_active ? (
                        <Chip label="Đang bật" color="success" size="small" />
                      ) : (
                        <Chip label="Tắt" size="small" />
                      )}
                    </TableCell>

                    <TableCell>
                      <IconButton
                        onClick={() => {
                          setEditing(d);
                          setDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        onClick={() => handleDelete(d.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Không có mã giảm
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <DiscountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        refresh={fetchDiscounts}
        setSnack={setSnack}
      />
    </Box>
  );
}

// =====================================================================
// ========================== DIALOG ===================================
// =====================================================================

function DiscountDialog({ open, onClose, editing, refresh, setSnack }) {
  const isEdit = !!editing;
  
  const [form, setForm] = useState({
    type: "percent",
    value: "",
    start_at: "",
    end_at: "",
    is_active: true,
  });

  useEffect(() => {
    if (isEdit && editing) {
      setForm({
        type: editing.type,
        value: editing.value,
        start_at: toDatetimeLocalValue(editing.start_at),
        end_at: toDatetimeLocalValue(editing.end_at),
        is_active: editing.is_active ? 1 : 0,
      });
    } else {
      setForm({
        type: "percent",
        value: "",
        start_at: "",
        end_at: "",
        is_active: 1,
      });
    }
  }, [editing, isEdit]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(
        isEdit
          ? `${API_BASE}/api/admin/product-discounts/${editing.id}`
          : `${API_BASE}/api/admin/product-discounts`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) throw new Error();

      setSnack({
        severity: "success",
        message: isEdit ? "Đã cập nhật" : "Đã tạo mã giảm",
      });

      onClose();
      refresh();
    } catch {
      setSnack({
        severity: "error",
        message: "Lưu thất bại",
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
      </DialogTitle>

      <DialogContent>
        <TextField
          label="Loại giảm"
          select
          fullWidth
          sx={{ mt: 1 }}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <MenuItem value="percent">Giảm %</MenuItem>
          <MenuItem value="fixed">Giảm tiền</MenuItem>
        </TextField>

        <TextField
          label="Giá trị"
          fullWidth
          sx={{ mt: 2 }}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />

        <TextField
          label="Bắt đầu"
          type="datetime-local"
          fullWidth
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
          value={form.start_at}
          onChange={(e) => setForm({ ...form, start_at: e.target.value })}
        />

        <TextField
          label="Kết thúc"
          type="datetime-local"
          fullWidth
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
          value={form.end_at}
          onChange={(e) => setForm({ ...form, end_at: e.target.value })}
        />

        <TextField
          label="Trạng thái"
          select
          fullWidth
          sx={{ mt: 2 }}
          value={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.value })}
        >
          <MenuItem value={1}>Bật</MenuItem>
          <MenuItem value={0}>Tắt</MenuItem>
        </TextField>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={handleSave}>
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
