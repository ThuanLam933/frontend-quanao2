import React, { useState, useEffect, useCallback, useRef } from "react";
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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  IconButton,
  Chip,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { API_BASE } from "../AdminPanel";

export default function VariantPage({ setSnack }) {
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  const showSnack = setSnack;

  
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.data ?? []);
    } catch (e) {
      console.error(e);
      showSnack({
        severity: "error",
        message: "Không tải được danh sách sản phẩm",
      });
    }
  }, [showSnack]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  
  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");

      const url = selectedProduct
        ? `${API_BASE}/api/product-details?product_id=${selectedProduct}`
        : `${API_BASE}/api/product-details`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = res.ok ? await res.json() : [];
      setVariants(Array.isArray(data) ? data : data.data ?? []);
    } catch (e) {
      console.error(e);
      showSnack({
        severity: "error",
        message: "Không tải được biến thể",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, showSnack]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  
  const handleDeleteVariant = async (id) => {
    if (!window.confirm("Xóa biến thể này?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/product-details/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!res.ok) {
        showSnack({
          severity: "error",
          message: "Sản phẩm đang có đơn hàng, không thể xóa biến thể",
        });
        return;
      }

      showSnack({
        severity: "success",
        message: "Đã xóa biến thể",
      });
      fetchVariants();
    } catch (e) {
      console.error(e);
      showSnack({
        severity: "error",
        message: "Lỗi khi xóa biến thể",
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Quản lý biến thể sản phẩm
      </Typography>

      
      <TextField
        select
        label="Chọn sản phẩm"
        fullWidth
        value={selectedProduct}
        onChange={(e) => setSelectedProduct(e.target.value)}
      >
        <MenuItem value="">-- Chọn sản phẩm --</MenuItem>
        {products.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>

      
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!selectedProduct}
          onClick={() => {
            setEditingVariant(null);
            setDialogOpen(true);
          }}
        >
          Thêm biến thể
        </Button>
      </Box>

      
      <Paper sx={{ mt: 3 }}>
        {loading ? (
          <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Số thứ tự</TableCell>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Ảnh</TableCell>
                  <TableCell>Màu</TableCell>
                  <TableCell>Kích cỡ</TableCell>
                  <TableCell>Giá gốc</TableCell>
                  <TableCell>Giá sau giảm</TableCell>
                  <TableCell>Số lượng</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variants.length ? (
                  variants.map((v, index) => (
                    <TableRow key={v.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{v.product?.name ?? "—"}</TableCell>

                      <TableCell>
                        {v.images && v.images.length > 0 ? (
                          <img
                            src={v.images[0].full_url || v.images[0].url_image}
                            alt=""
                            style={{
                              width: 50,
                              height: 50,
                              objectFit: "cover",
                              borderRadius: 4,
                            }}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>{v.color?.name ?? "—"}</TableCell>
                      <TableCell>{v.size?.name ?? "—"}</TableCell>

                      <TableCell>
                        {Number(v.price).toLocaleString("vi-VN")}₫
                      </TableCell>

                      <TableCell>
                        {v.has_discount ? (
                          <Typography
                            sx={{
                              fontWeight: 600,
                              color: "error.main",
                            }}
                          >
                            {Number(v.final_price).toLocaleString("vi-VN")}₫
                          </Typography>
                        ) : (
                          <Typography sx={{ color: "text.secondary" }}>
                            —
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>{v.quantity}</TableCell>

                      <TableCell>
                        {v.quantity > 0 ? (
                          <Chip label="Còn hàng" size="small" color="success" />
                        ) : (
                          <Chip
                            label="Hết hàng"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>

                      <TableCell>
                        <IconButton
                          onClick={() => {
                            setEditingVariant(v);
                            setDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>

                        <IconButton
                          color="error"
                          onClick={() => handleDeleteVariant(v.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Không có biến thể
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* DIALOG THÊM / SỬA BIẾN THỂ */}
      <AddVariantDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingVariant(null); 
        }}
        productId={selectedProduct}
        variant={editingVariant}
        variants={variants}
        refresh={fetchVariants}
        showSnack={showSnack}
      />
    </Box>
  );
}

// =====================================================================
// ==================== ADD / EDIT VARIANT DIALOG =======================
// =====================================================================

function AddVariantDialog({ open, onClose, productId, variant, variants, refresh, showSnack }) {
  const isEdit = !!variant;

  const [form, setForm] = useState({
    price: "",
    quantity: "",
    color_id: "",
    size_id: "",
    product_discount_id: "",
  });

  
  const [files, setFiles] = useState([]); 
  const [previews, setPreviews] = useState([]); 
  const originalImagesRef = useRef([]); 
  const originalQuantityRef = useRef(null); 

  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [discounts, setDiscounts] = useState([]);

  
  useEffect(() => {
    if (!open) return;
    if (isEdit && variant) {
      setForm({
        price: variant.price ?? "",
        quantity: variant.quantity ?? "",
        color_id: variant.color_id ?? "",
        size_id: variant.size_id ?? "",
        product_discount_id: variant.product_discount_id ?? "",
      });

      
      originalQuantityRef.current = variant.quantity ?? 0;

      
      const urls =
        (variant.images ?? [])
          .map((img) => img.full_url || img.url_image)
          .filter(Boolean) || [];
      originalImagesRef.current = urls;

      setFiles([]);
      setPreviews([]);
    } else {
      setForm({
        price: "",
        quantity: "",
        color_id: "",
        size_id: "",
        product_discount_id: "",
      });
      originalQuantityRef.current = null;
      originalImagesRef.current = [];
      setFiles([]);
      setPreviews([]);
    }
  }, [open, variant, isEdit]);

  

  useEffect(() => {
    if (!files || files.length === 0) {
      setPreviews([]);
      return;
    }
    const readers = [];
    const results = [];
    files.forEach((f, idx) => {
      const r = new FileReader();
      readers.push(r);
      r.onload = (e) => {
        results[idx] = e.target.result;
        if (results.filter(Boolean).length === files.length) {
          setPreviews([...results]);
        }
      };
      r.readAsDataURL(f);
    });

    return () => {
      readers.forEach((r) => {
        try {
          r.abort();
        } catch {
          /* ignore */
        }
      });
    };
  }, [files]);

  
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    Promise.all([
      fetch(`${API_BASE}/api/colors`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_BASE}/api/sizes`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_BASE}/api/admin/product-discounts`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([c, s, d]) => {
        setColors(Array.isArray(c) ? c : c.data ?? []);
        setSizes(Array.isArray(s) ? s : s.data ?? []);
        setDiscounts(Array.isArray(d) ? d : d.data ?? []);
      })
      .catch((e) => {
        console.error(e);
        showSnack({
          severity: "error",
          message: "Không tải được màu/kích cỡ/giảm giá",
        });
      });
  }, [showSnack]);

  const handleFilesChange = (e) => {
    const fl = Array.from(e.target.files || []);
    setFiles(fl);
  };

  const readErrorMessage = async (res) => {
    
    const txt = await res.text().catch(() => "");
    try {
      const j = JSON.parse(txt || "{}");
      if (j.message) return j.message;
      
      if (j.errors && typeof j.errors === "object") {
        const firstKey = Object.keys(j.errors)[0];
        if (firstKey && Array.isArray(j.errors[firstKey]) && j.errors[firstKey][0]) {
          return j.errors[firstKey][0];
        }
      }
      return txt || `Request failed (${res.status})`;
    } catch {
      return txt || `Request failed (${res.status})`;
    }
  };
  const norm = (x) => (String(x ?? "").trim() === "" ? "" : String(x));

const isDuplicateCombo = (colorId, sizeId) => {
  const pId = norm(productId);
  const cId = norm(colorId);
  const sId = norm(sizeId);

  return (variants || []).some((v) => {
    const vp = norm(v.product_id ?? v.product?.id);
    const vc = norm(v.color_id ?? v.color?.id);
    const vs = norm(v.size_id ?? v.size?.id);

    
    const sameCombo = vp === pId && vc === cId && vs === sId;

    
    const notSelf = !variant?.id || String(v.id) !== String(variant.id);

    return sameCombo && notSelf;
  });
};

  const handleSave = async () => {
    try {
      if (!productId) {
        showSnack({ severity: "error", message: "Vui lòng chọn sản phẩm" });
        return;
      }

      
      if (String(form.price ?? "").trim() === "") {
        showSnack({ severity: "error", message: "Vui lòng nhập giá" });
        return;
      }
      
      if (isDuplicateCombo(form.color_id, form.size_id)) {
        showSnack({
          severity: "error",
          message: "Biến thể (Màu + Kích cỡ) này đã tồn tại cho sản phẩm. Vui lòng chọn màu/kích cỡ khác.",
        });
        return;
      }

      if (form.product_discount_id) {
      const d = discounts.find((x) => String(x.id) === String(form.product_discount_id));
      const st = getDiscountStatus(d);
      if (!st.ok) {
        showSnack({
          severity: "error",
          message: `Mã giảm giá không hợp lệ: ${st.reason}. Vui lòng chọn mã khác hoặc bỏ áp dụng.`,
        });
        return;
      }
    }

     

      const token = localStorage.getItem("access_token");

      const hasNewImages = files && files.length > 0;

      // normalize: tránh gửi "" cho field kiểu int/nullable
      const priceNumber = Number(String(form.price).replace(/[^\d.]/g, ""));
      const quantityNumber =
        isEdit
          ? (String(form.quantity).trim() === ""
              ? Number(originalQuantityRef.current ?? 0)
              : Number(form.quantity))
          : 0;

      const fd = new FormData();
      fd.append("product_id", productId);
      fd.append("price", Number.isFinite(priceNumber) ? String(priceNumber) : "0");
      fd.append("quantity", Number.isFinite(quantityNumber) ? String(quantityNumber) : "0");

      if (String(form.color_id ?? "").trim() !== "") fd.append("color_id", form.color_id);
      if (String(form.size_id ?? "").trim() !== "") fd.append("size_id", form.size_id);

      // discount: nếu rỗng thì không gửi (tránh 422 nếu validate integer|nullable)
      if (String(form.product_discount_id ?? "").trim() !== "") {
        fd.append("product_discount_id", form.product_discount_id);
      }

      // update: thêm _method trong FormData cho chắc
      if (isEdit) fd.append("_method", "PUT");

      const endpoint = isEdit
        ? `${API_BASE}/api/product-details/${variant.id}?_method=PUT`
        : `${API_BASE}/api/product-details`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const msg = await readErrorMessage(res);
        showSnack({
          severity: "error",
          message: isEdit ? `Cập nhật thất bại: ${msg}` : `Tạo biến thể thất bại: ${msg}`,
        });
        return;
      }

      let createdOrUpdated = null;
      try {
        createdOrUpdated = await res.json();
      } catch {
        
      }
const uploadOne = async (file) => {
  const imgFd = new FormData();
  imgFd.append("product_detail_id", String(variantId));
  imgFd.append("image", file, file.name);

  const r = await fetch(`${API_BASE}/api/image-products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: imgFd,
  });

  if (!r.ok) {
    const msg = await readErrorMessage(r);
    throw new Error(msg);
  }

  return r.json().catch(() => null);
};
      const variantId = isEdit ? variant.id : createdOrUpdated?.id ?? null;
      if (variantId && hasNewImages) {
        for (let i = 0; i < files.length; i++) {
          const imgFd = new FormData();
          imgFd.append("product_detail_id", variantId);
          imgFd.append("image", files[i], files[i].name);

          await fetch(`${API_BASE}/api/image-products`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: imgFd,
          });
        }
      }

      showSnack({
        severity: "success",
        message: isEdit ? "Đã cập nhật" : "Đã tạo biến thể",
      });

      onClose();
      refresh();
    } catch (err) {
      console.error(err);
      showSnack({
        severity: "error",
        message: "Lỗi khi lưu biến thể",
      });
    }
  };

  
  const showExistingImages = !previews.length && isEdit && originalImagesRef.current.length > 0;
  const parseApiDate = (s) => {
  if (!s) return null;
  
  return new Date(String(s).replace(" ", "T"));
};

const getDiscountStatus = (d) => {
  if (!d) return { ok: false, reason: "Không tồn tại" };
  if (!d.is_active) return { ok: false, reason: "Đang tắt" };

  const now = new Date();
  const start = parseApiDate(d.start_at);
  const end = parseApiDate(d.end_at);

  if (start && now < start) return { ok: false, reason: "Chưa bắt đầu" };
  if (end && now > end) return { ok: false, reason: "Hết hạn" };

  return { ok: true, reason: "" };
};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Sửa biến thể" : "Thêm biến thể"}</DialogTitle>

      <DialogContent>
        <TextField
          label="Giá"
          fullWidth
          sx={{ mt: 1 }}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        <TextField
        label="Giảm giá"
        select
        fullWidth
        sx={{ mt: 2 }}
        value={form.product_discount_id}
        onChange={(e) =>
            setForm({ ...form, product_discount_id: e.target.value })
        }
        >
        <MenuItem value="">-- Không áp dụng --</MenuItem>

        {discounts.map((d) => {
            const st = getDiscountStatus(d);
            return (
            <MenuItem key={d.id} value={d.id} disabled={!st.ok}>
                {d.type === "percent"
                ? `Giảm ${d.value}%`
                : `Giảm ${Number(d.value).toLocaleString("vi-VN")}₫`}
                {!st.ok ? ` (${st.reason})` : ""}
            </MenuItem>
            );
        })}
        </TextField>


        {isEdit && (
          <TextField
            label="Số lượng"
            fullWidth
            type="number"
            sx={{ mt: 2 }}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            helperText="Để trống sẽ giữ số lượng hiện tại"
          />
        )}

        <TextField
          label="Màu"
          select
          fullWidth
          sx={{ mt: 2 }}
          value={form.color_id}
          onChange={(e) => setForm({ ...form, color_id: e.target.value })}
        >
          <MenuItem value="">-- none --</MenuItem>
          {colors.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Kích cỡ"
          select
          fullWidth
          sx={{ mt: 2 }}
          value={form.size_id}
          onChange={(e) => setForm({ ...form, size_id: e.target.value })}
        >
          <MenuItem value="">-- none --</MenuItem>
          {sizes.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>

        {/* UPLOAD ẢNH */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Ảnh biến thể
          </Typography>

          <input type="file" accept="image/*" multiple onChange={handleFilesChange} />

          <Typography variant="caption" color="text.secondary">
            {isEdit
              ? "Không chọn ảnh mới = giữ nguyên ảnh hiện tại. Chọn ảnh mới = upload thêm ảnh cho biến thể."
              : "Có thể chọn nhiều ảnh. Ảnh sẽ gắn riêng cho biến thể này."}
          </Typography>

          {/* PREVIEW */}
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {previews.map((p, idx) => (
              <Paper
                key={idx}
                sx={{
                  width: 120,
                  height: 90,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={p}
                  alt={`preview-${idx}`}
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
              </Paper>
            ))}

            {showExistingImages &&
              originalImagesRef.current.map((url, idx) => (
                <Paper
                  key={`old-${idx}`}
                  sx={{
                    width: 120,
                    height: 90,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={url}
                    alt={`existing-${idx}`}
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                  />
                </Paper>
              ))}
          </Box>
        </Box>
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
