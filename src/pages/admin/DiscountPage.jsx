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

export default function DiscountPage({ setSnack }) {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // ================= FETCH =================
  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/discounts`, {
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
        message: "Không tải được danh sách mã giảm giá (đơn hàng)",
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
      await fetch(`${API_BASE}/api/admin/discounts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      setSnack({ severity: "success", message: "Đã xóa mã giảm giá" });
      fetchDiscounts();
    } catch (e) {
      console.error(e);
      setSnack({ severity: "error", message: "Xóa thất bại" });
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
  <Typography variant="h5" sx={{ mb: 0 }}>
    Quản lý mã giảm giá đơn hàng
  </Typography>

  <Stack direction="row" spacing={1} alignItems="center">
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

    <Button variant="outlined" onClick={fetchDiscounts} disabled={loading}>
      {loading ? "Đang tải..." : "Tải lại"}
    </Button>
  </Stack>
</Stack>


      <Paper sx={{ mt: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Mã</TableCell>
                <TableCell>Tên</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Giá trị</TableCell>
                <TableCell>Đơn tối thiểu</TableCell>
                <TableCell>Lượt dùng</TableCell>
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

                    <TableCell sx={{ fontWeight: 700 }}>{d.code}</TableCell>
                    <TableCell>{d.name || "—"}</TableCell>

                    <TableCell>
                      {d.type === "percent" ? "Phần trăm" : "Cố định"}
                    </TableCell>

                    <TableCell>
                      {d.type === "percent"
                        ? `${d.value}%`
                        : `${Number(d.value).toLocaleString("vi-VN")}₫`}
                    </TableCell>

                    <TableCell>
                      {d.min_total != null && d.min_total !== ""
                        ? `${Number(d.min_total).toLocaleString("vi-VN")}₫`
                        : "—"}
                    </TableCell>

                    <TableCell>
                      {(d.usage_count ?? 0).toString()}
                      {d.usage_limit != null ? ` / ${d.usage_limit}` : " / ∞"}
                    </TableCell>

                    <TableCell>
                      {d.start_at || "—"} → {d.end_at || "—"}
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
                  <TableCell colSpan={10} align="center">
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
    code: "",
    name: "",
    type: "percent",
    value: "",
    min_total: "",
    usage_limit: "",
    start_at: "",
    end_at: "",
    is_active: 1,
  });

  useEffect(() => {
    if (isEdit && editing) {
      setForm({
        code: editing.code ?? "",
        name: editing.name ?? "",
        type: editing.type ?? "percent",
        value: editing.value ?? "",
        min_total: editing.min_total ?? "",
        usage_limit: editing.usage_limit ?? "",
        start_at: editing.start_at ?? "",
        end_at: editing.end_at ?? "",
        is_active: editing.is_active ? 1 : 0,
      });
    } else {
      setForm({
        code: "",
        name: "",
        type: "percent",
        value: "",
        min_total: "",
        usage_limit: "",
        start_at: "",
        end_at: "",
        is_active: 1,
      });
    }
  }, [editing, isEdit]);

  const handleSave = async () => {
    try {
      // validate nhẹ phía FE cho đỡ lỗi
      if (!form.code?.trim()) {
        setSnack({ severity: "warning", message: "Vui lòng nhập mã (code)" });
        return;
      }
      if (!form.value || Number(form.value) <= 0) {
        setSnack({ severity: "warning", message: "Giá trị giảm phải > 0" });
        return;
      }
      if (form.type === "percent" && Number(form.value) > 100) {
        setSnack({ severity: "warning", message: "Giảm % không được > 100" });
        return;
      }

      const token = localStorage.getItem("access_token");

      // convert min_total/usage_limit rỗng -> null
      const payload = {
        ...form,
        value: Number(form.value),
        min_total: form.min_total === "" ? null : Number(form.min_total),
        usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
        is_active: Number(form.is_active) ? 1 : 0,
        start_at: form.start_at === "" ? null : form.start_at,
        end_at: form.end_at === "" ? null : form.end_at,
      };

      const res = await fetch(
        isEdit
          ? `${API_BASE}/api/admin/discounts/${editing.id}`
          : `${API_BASE}/api/admin/discounts`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        let msg = "Lưu thất bại";
        try {
          const err = await res.json();
          msg = err?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      setSnack({
        severity: "success",
        message: isEdit ? "Đã cập nhật" : "Đã tạo mã giảm",
      });

      onClose();
      refresh();
    } catch (e) {
      setSnack({
        severity: "error",
        message: e?.message || "Lưu thất bại",
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}</DialogTitle>

      <DialogContent>
        <TextField
          label="Mã (code)"
          fullWidth
          sx={{ mt: 1 }}
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          disabled={isEdit} // thường code không cho sửa
        />

        <TextField
          label="Tên (name)"
          fullWidth
          sx={{ mt: 2 }}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <TextField
          label="Loại giảm"
          select
          fullWidth
          sx={{ mt: 2 }}
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
          helperText={
            form.type === "percent"
              ? "Ví dụ: 10 (tức 10%)"
              : "Ví dụ: 50000 (tức 50.000đ)"
          }
        />

        <TextField
          label="Đơn tối thiểu (min_total)"
          fullWidth
          sx={{ mt: 2 }}
          value={form.min_total}
          onChange={(e) => setForm({ ...form, min_total: e.target.value })}
          helperText="Bỏ trống = không yêu cầu"
        />

        <TextField
          label="Giới hạn lượt dùng (usage_limit)"
          fullWidth
          sx={{ mt: 2 }}
          value={form.usage_limit}
          onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
          helperText="Bỏ trống = không giới hạn"
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
