import React, { useMemo, useState } from "react";
import {
  Box,
  Container,
  
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
  Snackbar,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  CircularProgress,
  AccordionDetails,
} from "@mui/material";

import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Grid from "@mui/material/Grid";



const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";


const CONTACT_INFO = {
  brandName: "Denim On",
  headline: "Liên hệ với chúng tôi",
  subhead:
    "Nếu bạn cần hỗ trợ đơn hàng, sản phẩm, đổi trả hoặc hợp tác, hãy gửi thông tin. Chúng tôi sẽ phản hồi sớm nhất.",
  address: "35 Hồ Học Lãm, Phường An Lạc, TP.HCM",
  phone: "0931 321 722",
  email: "denimshop@gmail.com",
  hours: "T2–T7: 09:00–18:00 | CN: Nghỉ",
  
  mapEmbedUrl:
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d980.023869268439!2d106.60881651683712!3d10.72711901568885!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752d1fd1697bf3%3A0x29d9606ff2432095!2zQ2h1bmcgQ8awIEhPRiAtIEhRQyAzNSBI4buTIEjhu41jIEzDo20!5e0!3m2!1svi!2s!4v1768808564211!5m2!1svi!2s"
,
  socials: [
    
    { label: "Instagram", href: "https://www.instagram.com/denimonvn/" },
    { label: "TikTok", href: "https://www.tiktok.com/@denimonvn" },
    
  ],
  faqs: [
    {
      q: "Tôi có thể đổi/trả trong bao lâu?",
      a: "Bạn có thể đổi/trả theo chính sách của cửa hàng. Vui lòng cung cấp mã đơn hàng và lý do trong phần tài khoản để được hỗ trợ nhanh nhất.",
    },
    {
      q: "Thời gian phản hồi yêu cầu liên hệ là bao lâu?",
      a: "Thông thường chúng tôi phản hồi trong giờ làm việc từ 2–24 giờ tùy lượng yêu cầu.",
    },
    
  ],
};

export default function ContactPage() {
  const [snack, setSnack] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const isEmailValid = useMemo(() => {
    if (!form.email) return true;
    return /^\S+@\S+\.\S+$/.test(form.email);
  }, [form.email]);

  const isPhoneValid = useMemo(() => {
    if (!form.phone) return true;
    return /^\d{9,11}$/.test(form.phone.replace(/\D/g, ""));
  }, [form.phone]);

  const sanitizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);

  const validate = () => {
    if (!form.name.trim()) return "Vui lòng nhập họ tên.";
    if (!form.email.trim()) return "Vui lòng nhập email.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Email không hợp lệ.";
    if (form.phone && !/^\d{9,11}$/.test(form.phone.replace(/\D/g, "")))
      return "Số điện thoại không hợp lệ.";
    if (!form.subject.trim()) return "Vui lòng nhập chủ đề.";
    if (!form.message.trim()) return "Vui lòng nhập nội dung.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setSnack({ severity: "error", message: err });
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Kết nối API của bạn ở đây
      // Gợi ý endpoint: POST `${API_BASE}/api/contact`
      // body: { name, email, phone, subject, message }
      //
      // const res = await fetch(`${API_BASE}/api/contact`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(form),
      // });
      // const data = await res.json().catch(() => ({}));
      // if (!res.ok) throw new Error(data.message || "Gửi thất bại");

      await new Promise((r) => setTimeout(r, 450)); // demo

      setSnack({ severity: "success", message: "Đã gửi liên hệ. Chúng tôi sẽ phản hồi sớm." });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (ex) {
      setSnack({ severity: "error", message: ex?.message || "Gửi liên hệ thất bại." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: "#fff", py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg" sx={{ maxWidth: "1080px !important" }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase" }}>
            {CONTACT_INFO.headline}
          </Typography>
          <Typography sx={{ color: "#666", maxWidth: 760 }}>
            {CONTACT_INFO.subhead}
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {/* LEFT: INFO */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 0, border: "1px solid #e0e0e0" }}>
              <Typography sx={{ fontWeight: 800, mb: 2, textTransform: "uppercase" }}>
                Thông tin
              </Typography>

              <List disablePadding>
                <ListItem disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LocationOnOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>Địa chỉ</Typography>}
                    secondary={<Typography sx={{ color: "#666" }}>{CONTACT_INFO.address}</Typography>}
                  />
                </ListItem>

                <ListItem disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PhoneOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>Hotline</Typography>}
                    secondary={
                      <Typography sx={{ color: "#666" }}>
                        <Link href={`tel:${CONTACT_INFO.phone}`} underline="hover" color="inherit">
                          {CONTACT_INFO.phone}
                        </Link>
                      </Typography>
                    }
                  />
                </ListItem>

                <ListItem disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <MailOutlineIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>Email</Typography>}
                    secondary={
                      <Typography sx={{ color: "#666" }}>
                        <Link href={`mailto:${CONTACT_INFO.email}`} underline="hover" color="inherit">
                          {CONTACT_INFO.email}
                        </Link>
                      </Typography>
                    }
                  />
                </ListItem>

                <ListItem disableGutters sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <AccessTimeOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>Giờ làm việc</Typography>}
                    secondary={<Typography sx={{ color: "#666" }}>{CONTACT_INFO.hours}</Typography>}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 800, mb: 1, textTransform: "uppercase" }}>
                Mạng xã hội
              </Typography>

              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                {CONTACT_INFO.socials.map((s) => (
                  <Link key={s.label} href={s.href} target="_blank" rel="noreferrer" underline="hover" color="inherit">
                    {s.label}
                  </Link>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 800, mb: 1, textTransform: "uppercase" }}>
                FAQ
              </Typography>

              {CONTACT_INFO.faqs.map((f, i) => (
                <Accordion key={i} disableGutters elevation={0} sx={{ border: "1px solid #eee", mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 700 }}>{f.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography sx={{ color: "#666" }}>{f.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          </Grid>

          {/* RIGHT: FORM + MAP */}
          <Grid item xs={12} md={7}>
            {/* <Paper sx={{ p: 3, borderRadius: 0, border: "1px solid #e0e0e0", mb: 3 }}>
              <Typography sx={{ fontWeight: 800, mb: 2, textTransform: "uppercase" }}>
                Gửi liên hệ
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Họ & tên"
                      fullWidth
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email"
                      fullWidth
                      value={form.email}
                      error={!isEmailValid}
                      helperText={!isEmailValid ? "Email không hợp lệ." : " "}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Số điện thoại"
                      fullWidth
                      value={form.phone}
                      error={!isPhoneValid}
                      helperText={!isPhoneValid ? "SĐT không hợp lệ." : " "}
                      onChange={(e) => setForm((p) => ({ ...p, phone: sanitizePhone(e.target.value) }))}
                      inputProps={{ inputMode: "numeric" }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Chủ đề"
                      fullWidth
                      value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      placeholder="Ví dụ: Hỗ trợ đơn hàng / Đổi trả / Hợp tác"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Nội dung"
                      fullWidth
                      multiline
                      minRows={5}
                      value={form.message}
                      onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                      placeholder="Vui lòng cung cấp mã đơn hàng (nếu có), mô tả chi tiết vấn đề..."
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={submitting}
                      sx={{
                        backgroundColor: "#000",
                        borderRadius: 0,
                        fontWeight: 800,
                        px: 4,
                        py: 1.2,
                        "&:hover": { backgroundColor: "#222" },
                      }}
                    >
                      {submitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "GỬI"}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper> */}

            <Paper sx={{ p: 0, borderRadius: 0, border: "1px solid #e0e0e0", overflow: "hidden" }}>
              <Box sx={{ height: { xs: 280, md: 360 }, width: "100%" }}>
                <iframe
                  title={`${CONTACT_INFO.brandName} Map`}
                  src={CONTACT_INFO.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </Box>
            </Paper>

            <Alert severity="info" sx={{ mt: 2, borderRadius: 0 }}>
              Mẹo: Nếu bạn cần hỗ trợ đơn hàng, hãy ghi rõ “Mã đơn hàng” và số điện thoại nhận hàng để chúng tôi xử lý nhanh.
            </Alert>
          </Grid>
        </Grid>

        <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}>
          {snack && (
            <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ borderRadius: 0 }}>
              {snack.message}
            </Alert>
          )}
        </Snackbar>
      </Container>
    </Box>
  );
}
