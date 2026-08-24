import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import {
  DeleteOutlineOutlined,
  DirectionsCarOutlined,
  EditOutlined,
  ImageOutlined,
  Menu,
  PictureAsPdfOutlined,
  RefreshOutlined,
  SaveOutlined,
  SettingsOutlined,
  WhatsApp,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const API_URL =
  import.meta.env.REACT_APP_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";
const PUBLIC_API_URL = import.meta.env.VITE_PUBLIC_API_URL || API_URL;
const DRIVER_TOKEN =
  import.meta.env.VITE_DRIVER_TOKEN || import.meta.env.REACT_APP_DRIVER_TOKEN || "";
const initialForm = {
  passengerName: "",
  driverName: "",
  vehicleNumber: "",
  pickup: "",
  drop: "",
  distance: "",
  fare: "",
  gst: "5",
  discount: "0",
  paymentMode: "Cash",
};
const theme = createTheme({
  palette: { primary: { main: "#176b87" }, secondary: { main: "#d97745" } },
  typography: { fontFamily: "DM Sans, sans-serif" },
  shape: { borderRadius: 10 },
});
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const dateLabel = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const driverHeaders = () =>
  DRIVER_TOKEN ? { Authorization: `Bearer ${DRIVER_TOKEN}` } : {};
const upiQrMode = "UPI QR";
const maxQrUploadSize = 2 * 1024 * 1024;
const maxLogoUploadSize = 2 * 1024 * 1024;
const allowedLogoTypes = ["image/png", "image/jpeg", "image/svg+xml"];
const releaseActiveFocus = (target) => {
  target?.blur();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};
const afterAnimationFrame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected QR image"));
    reader.readAsDataURL(file);
  });

function App() {
  const [view, setView] = useState("new");
  const [form, setForm] = useState(initialForm);
  const [invoices, setInvoices] = useState([]);
  const [reports, setReports] = useState({
    invoiceCount: 0,
    totalCollected: 0,
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [notice, setNotice] = useState(
    DRIVER_TOKEN ? "" : "Add VITE_DRIVER_TOKEN to frontend/.env to load driver data.",
  );
  const [loading, setLoading] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [logo, setLogo] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const receiptRef = useRef(null);
  const invoiceDetailRef = useRef(null);
  const menuOpenFrameRef = useRef(null);
  const totals = useMemo(() => {
    const fare = Number(form.fare) || 0;
    const gst = (fare * (Number(form.gst) || 0)) / 100;
    const discount = (fare * (Number(form.discount) || 0)) / 100;
    return { fare, gst, discount, total: Math.max(0, fare + gst - discount) };
  }, [form.fare, form.gst, form.discount]);
  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    if (!DRIVER_TOKEN) {
      return;
    }
    fetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${DRIVER_TOKEN}` } })
      .then(async (result) => {
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Unable to load saved driver data");
        setForm((current) => ({ ...current, driverName: data.driverName || "", vehicleNumber: data.vehicleNumber || "" }));
        setLogo(data.logoData ? { logoData: data.logoData, logoMimeType: data.logoMimeType, logoSize: data.logoSize, updatedAt: data.updatedAt } : null);
      })
      .catch((error) => setNotice(error.message));
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      const result = await fetch(`${API_URL}/invoice?${query}`, {
        headers: driverHeaders(),
      });
      if (!result.ok) throw new Error();
      setInvoices(await result.json());
    } catch {
      setNotice("Unable to load invoices. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, [filters]);
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      const result = await fetch(`${API_URL}/reports?${query}`);
      if (!result.ok) throw new Error();
      setReports(await result.json());
    } catch {
      setNotice(
        "Unable to load dashboard data. Check that the API is running.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);
  const changeView = (nextView) => {
    setView(nextView);
    setMenuOpen(false);
    if (nextView === "invoices") loadInvoices();
    if (nextView === "dashboard") loadReports();
    if (nextView === "settings") loadQr();
  };
  const openMobileMenu = (event) => {
    releaseActiveFocus(event.currentTarget);
    if (menuOpenFrameRef.current) {
      cancelAnimationFrame(menuOpenFrameRef.current);
    }
    menuOpenFrameRef.current = requestAnimationFrame(() => {
      menuOpenFrameRef.current = null;
      setMenuOpen(true);
    });
  };

  useEffect(
    () => () => {
      if (menuOpenFrameRef.current) {
        cancelAnimationFrame(menuOpenFrameRef.current);
      }
    },
    [],
  );

  const saveInvoice = async () => {
    const missingFields = [
      ['passengerName', 'Passenger name'],
      ['driverName', 'Driver name'],
      ['vehicleNumber', 'Vehicle number'],
      ['pickup', 'Pickup location'],
      ['drop', 'Drop location'],
      ['distance', 'Distance'],
      ['fare', 'Fare'],
    ].filter(([field]) => String(form[field]).trim() === '')
    if (missingFields.length > 0) {
      setNotice(`Complete these fields: ${missingFields.map(([, label]) => label).join(', ')}`)
      return null
    }
    if (Number(form.distance) < 0 || Number(form.fare) < 0 || Number(form.gst) < 0 || Number(form.discount) < 0) {
      setNotice('Distance, fare, GST, and discount cannot be negative')
      return null
    }
    setSaving(true);
    try {
      const result = await fetch(`${API_URL}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...driverHeaders() },
        body: JSON.stringify(form),
      });
      if (!result.ok) {
        const error = await result.json().catch(() => ({}));
        throw new Error(error.fields?.join(', ') || error.details || error.error || 'Unable to save invoice');
      }
      const invoice = await result.json();
      setSavedInvoice(invoice);
      setIsModalOpen(true);
      setNotice("Invoice saved successfully!");
      return invoice;
    } catch (error) {
      setNotice(error.message === 'Failed to fetch' ? 'Unable to reach the API. Start it with npm run server.' : error.message);
      return null;
    } finally {
      setSaving(false);
    }
  };
  const ensureSavedInvoice = async () => savedInvoice || saveInvoice();
  const createShareLink = async () => {
    const invoice = await ensureSavedInvoice();
    if (!invoice) return null;
    try {
      const result = await fetch(`${API_URL}/share/${invoice._id}`, {
        method: "POST",
      });
      if (!result.ok) throw new Error();
      const data = await result.json();
      return `${PUBLIC_API_URL}${data.path}`;
    } catch {
      setNotice("Unable to create invoice link");
      return null;
    }
  };
  const deleteInvoice = async (id) => {
    try {
      const result = await fetch(`${API_URL}/invoice/${id}`, {
        method: "DELETE",
        headers: driverHeaders(),
      });
      if (!result.ok) throw new Error();
      setInvoices((current) => current.filter((invoice) => invoice._id !== id));
      setNotice("Invoice deleted");
    } catch {
      setNotice("Unable to delete invoice");
    }
  };
  const viewInvoice = async (id, event) => {
    releaseActiveFocus(event?.currentTarget);
    await afterAnimationFrame();
    setSelectedInvoice(null);
    setInvoiceError("");
    setInvoiceLoading(true);
    try {
      const result = await fetch(`${API_URL}/invoice/${id}`, {
        headers: driverHeaders(),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) {
        throw new Error(data.error || "Unable to load invoice");
      }
      setSelectedInvoice(data);
    } catch (error) {
      setInvoiceError(
        error.message === "Failed to fetch"
          ? "Unable to reach the API. Start it with npm run server."
          : error.message,
      );
    } finally {
      setInvoiceLoading(false);
    }
  };
  const closeInvoiceDialog = () => {
    setSelectedInvoice(null);
    setInvoiceError("");
    setInvoiceLoading(false);
  };
  const closeSavedModal = () => {
    setIsModalOpen(false);
    setSavedInvoice(null);
    setForm((current) => ({
      ...initialForm,
      driverName: current.driverName,
      vehicleNumber: current.vehicleNumber,
    }));
  };
  const downloadInvoicePdf = async () => {
    if (!invoiceDetailRef.current || !selectedInvoice) return;
    const canvas = await html2canvas(invoiceDetailRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const pdf = new jsPDF({
      unit: "px",
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      canvas.width / 2,
      canvas.height / 2,
    );
    pdf.save(`easy-bill-${selectedInvoice.passengerName || "invoice"}.pdf`);
    setNotice("PDF downloaded successfully");
  };
  const loadQr = useCallback(async ({ silent = false } = {}) => {
    if (!DRIVER_TOKEN) {
      if (!silent) setNotice("Add VITE_DRIVER_TOKEN to frontend/.env first.");
      return null;
    }
    setQrLoading(true);
    try {
      const result = await fetch(`${API_URL}/qr`, { headers: driverHeaders() });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) {
        if (result.status === 404) {
          setQr(null);
          if (!silent) setNotice(data.error || "No UPI QR code saved");
          return null;
        }
        throw new Error(data.error || "Unable to load QR code");
      }
      setQr(data);
      if (!data.imageData && !silent) setNotice("No UPI QR code saved");
      return data;
    } catch (error) {
      if (!silent) setNotice(error.message === "Failed to fetch" ? "Unable to reach the API. Start it with npm run server." : error.message);
      return null;
    } finally {
      setQrLoading(false);
    }
  }, []);
  const saveQr = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setNotice("Upload a PNG or JPG QR image.");
      return;
    }
    if (file.size > maxQrUploadSize) {
      setNotice("QR image must be 2 MB or smaller.");
      return;
    }
    if (!DRIVER_TOKEN) {
      setNotice("Add VITE_DRIVER_TOKEN to frontend/.env first.");
      return;
    }
    setQrLoading(true);
    try {
      const imageData = await readFileAsDataUrl(file);
      const result = await fetch(`${API_URL}/qr/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...driverHeaders() },
        body: JSON.stringify({ imageData, mimeType: file.type, size: file.size }),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.error || "Unable to save QR code");
      setQr(data.qr);
      setNotice(data.message || "QR code saved");
    } catch (error) {
      setNotice(error.message === "Failed to fetch" ? "Unable to reach the API. Start it with npm run server." : error.message);
    } finally {
      setQrLoading(false);
    }
  };
  const saveLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!allowedLogoTypes.includes(file.type)) {
      setNotice("Upload a PNG, JPG, or SVG logo.");
      return;
    }
    if (file.size > maxLogoUploadSize) {
      setNotice("Logo must be 2 MB or smaller.");
      return;
    }
    if (!DRIVER_TOKEN) {
      setNotice("Add VITE_DRIVER_TOKEN to frontend/.env first.");
      return;
    }
    setLogoLoading(true);
    try {
      const logoData = await readFileAsDataUrl(file);
      const result = await fetch(`${API_URL}/profile/logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...driverHeaders() },
        body: JSON.stringify({ logoData, logoMimeType: file.type, logoSize: file.size }),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.error || "Unable to save logo");
      setLogo(data.logo);
      setNotice(data.message || "Logo saved");
    } catch (error) {
      setNotice(error.message === "Failed to fetch" ? "Unable to reach the API. Start it with npm run server." : error.message);
    } finally {
      setLogoLoading(false);
    }
  };
  const deleteLogo = async () => {
    if (!DRIVER_TOKEN) {
      setNotice("Add VITE_DRIVER_TOKEN to frontend/.env first.");
      return;
    }
    setLogoLoading(true);
    try {
      const result = await fetch(`${API_URL}/profile/logo`, {
        method: "DELETE",
        headers: driverHeaders(),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.error || "Unable to delete logo");
      setLogo(null);
      setNotice(data.message || "Logo deleted");
    } catch (error) {
      setNotice(error.message === "Failed to fetch" ? "Unable to reach the API. Start it with npm run server." : error.message);
    } finally {
      setLogoLoading(false);
    }
  };
  const showQr = async (event) => {
    releaseActiveFocus(event?.currentTarget);
    const savedQr = qr || (await loadQr());
    if (savedQr?.imageData) {
      await afterAnimationFrame();
      setQrDialogOpen(true);
    }
  };
  const saveProfile = async () => {
    if (!DRIVER_TOKEN) { setNotice("Add VITE_DRIVER_TOKEN to frontend/.env first."); return; }
    setProfileLoading(true);
    try {
      const result = await fetch(`${API_URL}/profile/save`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${DRIVER_TOKEN}` }, body: JSON.stringify({ driverName: form.driverName, vehicleNumber: form.vehicleNumber }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Error saving");
      setForm((current) => ({ ...current, driverName: data.profile.driverName, vehicleNumber: data.profile.vehicleNumber }));
      setProfileEditing(false);
      setNotice(data.message || "Saved successfully");
    } catch (error) { setNotice(error.message); } finally { setProfileLoading(false); }
  };
  const clearProfile = async () => {
    if (!DRIVER_TOKEN) { setNotice("Add VITE_DRIVER_TOKEN to frontend/.env first."); return; }
    setProfileLoading(true);
    try {
      const result = await fetch(`${API_URL}/profile/clear`, { method: "DELETE", headers: { Authorization: `Bearer ${DRIVER_TOKEN}` } });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Unable to clear saved data");
      setForm((current) => ({ ...current, driverName: "", vehicleNumber: "" }));
      setLogo(null);
      setProfileEditing(true);
      setNotice(data.message || "Saved data cleared");
    } catch (error) { setNotice(error.message); } finally { setProfileLoading(false); }
  };
  const exportImage = async () =>
    receiptRef.current
      ? html2canvas(receiptRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
        })
      : null;
  const shareFile = async (blob, filename, title) => {
    const file = new File([blob], filename, { type: blob.type });
    if (!navigator.share || !navigator.canShare?.({ files: [file] }))
      return false;
    try {
      await navigator.share({ title, text: "EasyBill invoice", files: [file] });
      setNotice(`${title} shared successfully`);
      return true;
    } catch (error) {
      if (error.name !== "AbortError") setNotice("Sharing was cancelled");
      return true;
    }
  };
  const handlePdf = async () => {
    const canvas = await exportImage();
    if (!canvas) return;
    const pdf = new jsPDF({
      unit: "px",
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      canvas.width / 2,
      canvas.height / 2,
    );
    const filename = `easy-bill-${form.passengerName || "receipt"}.pdf`;
    if (!(await shareFile(pdf.output("blob"), filename, "PDF invoice"))) {
      pdf.save(filename);
      setNotice("PDF downloaded successfully");
    }
  };
  const handleWhatsApp = async () => {
    const link = await createShareLink();
    if (!link) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Ride bill for ${form.passengerName || "Passenger"}\n${form.pickup || "Pickup"} to ${form.drop || "Drop"}\nTotal: ${money(totals.total)}\nInvoice: ${link}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const fields = [
    ["passengerName", "Passenger name"],
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box className="app-shell">
        <Container maxWidth="lg" className="page-container">
          <Box component="header" className="topbar">
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box className="brand-mark desktop-brand-mark">
                <DirectionsCarOutlined />
              </Box>
              <IconButton
                className="mobile-menu-button"
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation-drawer"
                onClick={openMobileMenu}
              >
                <Menu />
              </IconButton>
              <Box>
                <Typography className="eyebrow">TRANSPORT DESK</Typography>
                <Typography variant="h6" className="brand-name">
                  EasyBill
                </Typography>
              </Box>
            </Stack>
            <Typography className="header-note">
              A clear record for every journey
            </Typography>
          </Box>
          <Tabs
            value={view}
            onChange={(event, value) => changeView(value)}
            className="main-tabs desktop-tabs"
          >
            <Tab value="new" label="New bill" />
            <Tab value="invoices" label="Invoices" />
            <Tab value="dashboard" label="Dashboard" />
            <Tab value="settings" label="Settings" />
          </Tabs>
          <Drawer
            anchor="left"
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            className="mobile-drawer"
            slotProps={{ paper: { id: "mobile-navigation-drawer" } }}
          >
            <Box className="drawer-content" role="presentation">
              <Typography className="drawer-kicker">EASYBILL</Typography>
              <Typography variant="h6" className="drawer-title">
                Quick access
              </Typography>
              <List>
                <ListItem disablePadding>
                  <ListItemButton selected={view === "new"} onClick={() => changeView("new")}>
                    <ListItemText primary="New bill" secondary="Create a receipt" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton selected={view === "invoices"} onClick={() => changeView("invoices")}>
                    <ListItemText primary="Invoices" secondary="View saved rides" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton selected={view === "dashboard"} onClick={() => changeView("dashboard")}>
                    <ListItemText primary="Dashboard" secondary="Track earnings" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton selected={view === "settings"} onClick={() => changeView("settings")}>
                    <SettingsOutlined sx={{ mr: 1.5 }} />
                    <ListItemText primary="Settings" secondary="Manage QR and logo" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          </Drawer>
          {view === "new" && (
            <NewBill
              form={form}
              totals={totals}
              fields={fields}
              updateField={updateField}
              receiptRef={receiptRef}
              saveInvoice={saveInvoice}
              profileEditing={profileEditing}
              setProfileEditing={setProfileEditing}
              profileLoading={profileLoading}
              saveProfile={saveProfile}
              clearProfile={clearProfile}
              showQr={showQr}
              qrLoading={qrLoading}
              logo={logo}
              saving={saving}
            />
          )}
          {view === "invoices" && (
            <InvoiceList
              invoices={invoices}
              filters={filters}
              setFilters={setFilters}
              loadInvoices={loadInvoices}
              deleteInvoice={deleteInvoice}
              loading={loading}
              viewInvoice={viewInvoice}
              selectedInvoice={selectedInvoice}
              invoiceLoading={invoiceLoading}
              invoiceError={invoiceError}
              closeInvoiceDialog={closeInvoiceDialog}
              downloadInvoicePdf={downloadInvoicePdf}
              invoiceDetailRef={invoiceDetailRef}
              logo={logo}
            />
          )}
          {view === "dashboard" && (
            <Dashboard
              reports={reports}
              filters={filters}
              setFilters={setFilters}
              loadReports={loadReports}
              loading={loading}
            />
          )}
          {view === "settings" && <QrSettings qr={qr} qrLoading={qrLoading} saveQr={saveQr} logo={logo} logoLoading={logoLoading} saveLogo={saveLogo} deleteLogo={deleteLogo} />}
          <Typography className="footer-note">
            EasyBill <span>•</span> Simple billing for the road
          </Typography>
        </Container>
      </Box>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        className="app-notice"
        onClose={() => setNotice("")}
      >
        <Alert severity={notice.includes("saved") ? "success" : "info"} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      </Snackbar>
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>UPI QR code</DialogTitle>
        <DialogContent dividers><Box className="qr-modal-image-wrap">{qr && <img src={qr.imageData} alt="Saved UPI payment QR code" className="qr-modal-image" />}</Box></DialogContent>
        <DialogActions><Button onClick={() => setQrDialogOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={isModalOpen} onClose={closeSavedModal} maxWidth="md" fullWidth>
        <DialogTitle>Invoice saved</DialogTitle>
        <DialogContent dividers>
          <Box className="saved-invoice-summary">
            <Stack spacing={3}>
              <Box sx={{ textAlign: "center", py: 3, px: 2, backgroundColor: "rgba(46, 125, 50, 0.06)", borderRadius: 2, border: "1px solid #c8e6c9" }}>
                <Typography variant="h6" fontWeight={700} color="#2e7d32">
                  Invoice saved successfully!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Your receipt is ready. You can share the PDF, or share text message via WhatsApp.
                </Typography>
              </Box>
              <Box>
                <Typography className="receipt-meta">PASSENGER</Typography>
                <Typography className="receipt-value">{savedInvoice?.passengerName || "Not added"}</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography className="receipt-meta">DRIVER</Typography>
                  <Typography className="receipt-value">{savedInvoice?.driverName || "Not added"}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography className="receipt-meta">VEHICLE</Typography>
                  <Typography className="receipt-value">{savedInvoice?.vehicleNumber || "Not added"}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography className="receipt-meta">FROM</Typography>
                  <Typography className="receipt-value">{savedInvoice?.pickup || "Not added"}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography className="receipt-meta">TO</Typography>
                  <Typography className="receipt-value">{savedInvoice?.drop || "Not added"}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography className="receipt-meta">DISTANCE</Typography>
                  <Typography className="receipt-value">{savedInvoice?.distance ? `${savedInvoice.distance} km` : "Not added"}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography className="receipt-meta">PAYMENT</Typography>
                  <Typography className="receipt-value">{savedInvoice?.paymentMode || "Cash"}</Typography>
                </Grid>
              </Grid>
              <Divider className="receipt-divider" />
              <Box className="total-line">
                <Typography>Total due</Typography>
                <Typography className="total-amount">{money(savedInvoice?.totals?.total)}</Typography>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSavedModal}>Close</Button>
          <Button variant="contained" startIcon={<PictureAsPdfOutlined />} onClick={handlePdf}>Save PDF</Button>
          <Button className="whatsapp-button" variant="outlined" startIcon={<WhatsApp />} onClick={handleWhatsApp}>Share via WhatsApp</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

function NewBill({
  form,
  totals,
  fields,
  updateField,
  receiptRef,
  saveInvoice,
  profileEditing,
  setProfileEditing,
  profileLoading,
  saveProfile,
  clearProfile,
  showQr,
  qrLoading,
  logo,
  saving,
}) {
  const canSave = Boolean(
    form.passengerName?.trim() &&
    form.driverName?.trim() &&
    form.vehicleNumber?.trim() &&
    form.pickup?.trim() &&
    form.drop?.trim() &&
    String(form.distance).trim() &&
    String(form.fare).trim()
  );
  return (
    <>
      <Box className="intro">
        <Typography className="section-kicker">
          NEW RECEIPT <span>•</span> 01
        </Typography>
        <Typography variant="h1">Create a ride bill</Typography>
        <Typography className="intro-copy">
          Enter the trip details below. Your receipt updates as you type.
        </Typography>
      </Box>
      <Grid container spacing={3} className="workspace">
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper component="form" className="form-panel" elevation={0} onSubmit={(event) => event.preventDefault()}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" className="panel-title">
                  Passenger and driver
                </Typography>
                <Typography className="panel-subtitle">
                  Saved driver details are protected and reusable
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {fields.map(([field, label]) => (
                  <Grid
                    key={field}
                    size={{
                      xs: 12,
                      sm: field === "passengerName" ? 12 : 6,
                    }}
                  >
                    <TextField
                      fullWidth
                      label={label}
                      value={form[field]}
                      onChange={updateField(field)}
                    />
                  </Grid>
                ))}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Driver name"
                    placeholder="e.g. Arjun Sharma"
                    value={form.driverName}
                    disabled={!profileEditing}
                    onChange={updateField("driverName")}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">🧑</InputAdornment>,
                        endAdornment: <InputAdornment position="end"><Button type="button" size="small" onClick={saveProfile} disabled={!profileEditing || profileLoading}>Save</Button></InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Vehicle number"
                    placeholder="e.g. MH 12 AB 1234"
                    value={form.vehicleNumber}
                    disabled={!profileEditing}
                    onChange={updateField("vehicleNumber")}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">🚗</InputAdornment>,
                        endAdornment: <InputAdornment position="end"><Button type="button" size="small" onClick={saveProfile} disabled={!profileEditing || profileLoading}>Save</Button></InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                    <Button type="button" size="small" startIcon={<EditOutlined />} onClick={() => setProfileEditing(true)} disabled={profileEditing || profileLoading}>Edit</Button>
                    <Button type="button" size="small" color="error" onClick={clearProfile} disabled={profileLoading}>Clear saved data</Button>
                  </Stack>
                </Grid>
              </Grid>
              <Divider />
              <Box>
                <Typography variant="h5" className="panel-title">
                  Trip details
                </Typography>
                <Typography className="panel-subtitle">
                  Where this journey begins and ends
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Pickup location" placeholder="e.g. Airport terminal 2" value={form.pickup} onChange={updateField("pickup")} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Drop location" placeholder="e.g. City centre" value={form.drop} onChange={updateField("drop")} /></Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Distance"
                    value={form.distance}
                    onChange={updateField("distance")}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">km</InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Fare"
                    value={form.fare}
                    onChange={updateField("fare")}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">₹</InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="GST"
                    value={form.gst}
                    onChange={updateField("gst")}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">%</InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Discount"
                    value={form.discount}
                    onChange={updateField("discount")}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">%</InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    select
                    label="Payment mode"
                    value={form.paymentMode}
                    onChange={updateField("paymentMode")}
                  ><MenuItem value="Cash">Cash</MenuItem><MenuItem value="Card">Card</MenuItem><MenuItem value={upiQrMode}>UPI QR</MenuItem></TextField>
                  {form.paymentMode === upiQrMode && <Button size="small" onClick={showQr} disabled={qrLoading} sx={{ mt: 1 }}>{qrLoading ? "Loading QR..." : "Show QR"}</Button>}
                </Grid>
              </Grid>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                className="action-row"
              >
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveOutlined />}
                  onClick={saveInvoice}
                  disabled={!canSave || saving}
                >
                  {saving ? "Saving..." : "Save Invoice"}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box className="preview-wrap">
            <Typography className="section-kicker preview-heading">
              LIVE PREVIEW
            </Typography>
            <Paper ref={receiptRef} className="receipt" elevation={0}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
              >
                <ReceiptBrand logo={logo} title="Journey receipt" titleVariant="h4" />
                <Box className="receipt-number">#RB-001</Box>
              </Stack>
              <Divider className="receipt-divider" />
              <Box className="route">
                <Box>
                  <Typography className="receipt-meta">FROM</Typography>
                  <Typography className="receipt-value">
                    {form.pickup || "Pickup location"}
                  </Typography>
                </Box>
                <Box className="route-arrow">→</Box>
                <Box className="route-end">
                  <Typography className="receipt-meta">TO</Typography>
                  <Typography className="receipt-value">
                    {form.drop || "Drop location"}
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2} className="receipt-info">
                <Info
                  label="PASSENGER"
                  value={form.passengerName || "Not added"}
                />
                <Info label="DRIVER" value={form.driverName || "Not added"} />
                <Info
                  label="VEHICLE"
                  value={form.vehicleNumber || "Not added"}
                />
                <Info
                  label="DISTANCE"
                  value={form.distance ? `${form.distance} km` : "Not added"}
                />
              </Grid>
              <Divider className="receipt-divider" />
              <Stack spacing={1} className="price-lines">
                <Price label="Base fare" value={money(totals.fare)} />
                <Price
                  label={`GST (${form.gst || 0}%)`}
                  value={money(totals.gst)}
                />
                <Price
                  label={`Discount (${form.discount || 0}%)`}
                  value={`-${money(totals.discount)}`}
                  className="discount-line"
                />
              </Stack>
              <Box className="total-line">
                <Typography>Total due</Typography>
                <Typography className="total-amount">
                  {money(totals.total)}
                </Typography>
              </Box>
              <Typography className="receipt-foot">
                Thank you for choosing EasyBill
              </Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
function Info({ label, value }) {
  return (
    <Grid size={6}>
      <Typography className="receipt-meta">{label}</Typography>
      <Typography className="receipt-value">{value}</Typography>
    </Grid>
  );
}
function Price({ label, value, className = "" }) {
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: "space-between" }}
      className={className}
    >
      <Typography>{label}</Typography>
      <Typography>{value}</Typography>
    </Stack>
  );
}

function ReceiptBrand({ logo, title, titleVariant = "h4" }) {
  return (
    <Stack direction="row" spacing={1.5} className="receipt-brand">
      {logo?.logoData ? (
        <img src={logo.logoData} alt="Driver business logo" className="receipt-logo" />
      ) : (
        <Box className="receipt-logo default-receipt-logo">
          <DirectionsCarOutlined fontSize="small" />
        </Box>
      )}
      <Box>
        <Typography className="receipt-label">EASY BILL</Typography>
        <Typography variant={titleVariant} className="receipt-title">
          {title}
        </Typography>
      </Box>
    </Stack>
  );
}

function QrSettings({ qr, qrLoading, saveQr, logo, logoLoading, saveLogo, deleteLogo }) {
  return (
    <>
      <Box className="intro compact-intro">
        <Typography className="section-kicker">SETTINGS <span>•</span> 04</Typography>
        <Typography variant="h1">Payment and branding</Typography>
        <Typography className="intro-copy">Manage the QR code and logo shown on each bill.</Typography>
      </Box>
      <Box className="settings-grid">
        <Paper className="settings-panel" elevation={0}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" className="panel-title">Upload Logo</Typography>
              <Typography className="panel-subtitle">PNG, JPG, or SVG, up to 2 MB</Typography>
            </Box>
            {logo?.logoData ? (
              <img src={logo.logoData} alt="Uploaded bill logo preview" className="logo-preview" />
            ) : (
              <Box className="logo-preview default-logo-preview">
                <ImageOutlined />
                <Typography>EasyBill</Typography>
              </Box>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button component="label" variant="contained" disabled={logoLoading}>
                {logo?.logoData ? "Update Logo" : "Upload Logo"}
                <input hidden type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={saveLogo} />
              </Button>
              <Button variant="outlined" color="error" onClick={deleteLogo} disabled={logoLoading || !logo?.logoData}>
                Delete Logo
              </Button>
            </Stack>
            {logo?.updatedAt && <Typography className="panel-subtitle">Last updated {new Date(logo.updatedAt).toLocaleString()}</Typography>}
          </Stack>
        </Paper>
        <Paper className="settings-panel" elevation={0}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" className="panel-title">UPI payment code</Typography>
              <Typography className="panel-subtitle">PNG or JPG, up to 2 MB</Typography>
            </Box>
            {qr && <img src={qr.imageData} alt="Saved UPI payment QR code preview" className="qr-preview" />}
            <Button component="label" variant="contained" disabled={qrLoading}>
              {qr ? "Replace QR" : "Upload QR code"}
              <input hidden type="file" accept="image/png,image/jpeg" onChange={saveQr} />
            </Button>
            {qr && <Typography className="panel-subtitle">Last updated {new Date(qr.updatedAt).toLocaleString()}</Typography>}
          </Stack>
        </Paper>
      </Box>
    </>
  );
  return <><Box className="intro compact-intro"><Typography className="section-kicker">SETTINGS <span>•</span> 04</Typography><Typography variant="h1">Payment QR</Typography><Typography className="intro-copy">Upload the UPI QR code customers can scan to pay.</Typography></Box><Paper className="settings-panel" elevation={0}><Stack spacing={2.5}><Box><Typography variant="h5" className="panel-title">UPI payment code</Typography><Typography className="panel-subtitle">PNG or JPG, up to 2 MB</Typography></Box>{qr && <img src={qr.imageData} alt="Saved UPI payment QR code preview" className="qr-preview" />}<Button component="label" variant="contained" disabled={qrLoading}>{qr ? "Replace QR" : "Upload QR code"}<input hidden type="file" accept="image/png,image/jpeg" onChange={saveQr} /></Button>{qr && <Typography className="panel-subtitle">Last updated {new Date(qr.updatedAt).toLocaleString()}</Typography>}</Stack></Paper></>
}

function FilterBar({ filters, setFilters, onRefresh, loading }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      className="filter-bar"
    >
      <TextField
        type="date"
        label="From"
        value={filters.from}
        onChange={(event) =>
          setFilters((current) => ({ ...current, from: event.target.value }))
        }
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        type="date"
        label="To"
        value={filters.to}
        onChange={(event) =>
          setFilters((current) => ({ ...current, to: event.target.value }))
        }
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Button
        variant="contained"
        startIcon={<RefreshOutlined />}
        onClick={onRefresh}
        disabled={loading}
      >
        Refresh
      </Button>
    </Stack>
  );
}
function InvoiceList({
  invoices,
  filters,
  setFilters,
  loadInvoices,
  deleteInvoice,
  loading,
  viewInvoice,
  selectedInvoice,
  invoiceLoading,
  invoiceError,
  closeInvoiceDialog,
  downloadInvoicePdf,
  invoiceDetailRef,
  logo,
}) {
  return (
    <>
      <Box className="intro compact-intro">
        <Typography className="section-kicker">
          INVOICE ARCHIVE <span>•</span> 02
        </Typography>
        <Typography variant="h1">All invoices</Typography>
        <Typography className="intro-copy">
          Review saved trips. MongoDB automatically removes invoices after 60
          days.
        </Typography>
      </Box>
      <Paper className="table-panel" elevation={0}>
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          onRefresh={loadInvoices}
          loading={loading}
        />
        <Box className="invoice-table">
          <Box className="table-row table-header">
            <Typography>Passenger</Typography>
            <Typography>Date</Typography>
            <Typography>Total amount</Typography>
            <Typography>Action</Typography>
          </Box>
          {!loading && invoices.length === 0 && (
            <Typography className="empty-state">
              No invoices found for this date range.
            </Typography>
          )}
          {invoices.map((invoice) => (
            <Box className="table-row" key={invoice._id}>
              <Typography fontWeight={600}>{invoice.passengerName}</Typography>
              <Typography>{dateLabel(invoice.createdAt)}</Typography>
              <Typography className="table-total">
                {money(invoice.totals?.total)}
              </Typography>
              <Stack direction="row" spacing={1} className="table-actions">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(event) => viewInvoice(invoice._id, event)}
                >
                  View Invoice
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineOutlined />}
                  onClick={() => deleteInvoice(invoice._id)}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          ))}
        </Box>
      </Paper>
      <InvoiceDialog
        invoice={selectedInvoice}
        loading={invoiceLoading}
        error={invoiceError}
        onClose={closeInvoiceDialog}
        onDownloadPdf={downloadInvoicePdf}
        invoiceDetailRef={invoiceDetailRef}
        logo={logo}
      />
    </>
  );
}

function InvoiceDialog({
  invoice,
  loading,
  error,
  onClose,
  onDownloadPdf,
  invoiceDetailRef,
  logo,
}) {
  const open = loading || Boolean(error) || Boolean(invoice);
  const totals = invoice?.totals || {};
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Invoice details</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Stack spacing={2} sx={{ alignItems: "center", py: 5 }}>
            <CircularProgress />
            <Typography color="text.secondary">Loading invoice...</Typography>
          </Stack>
        )}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && invoice && (
          <Box ref={invoiceDetailRef} className="invoice-detail">
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
              className="invoice-detail-header"
            >
              <ReceiptBrand logo={logo} title="Journey invoice" titleVariant="h5" />
              <Typography className="receipt-number">
                #{String(invoice.invoiceId || invoice._id || "").slice(-6).toUpperCase()}
              </Typography>
            </Stack>
            <Divider className="receipt-divider" />
            <Grid container spacing={2}>
              <InvoiceField label="Passenger" value={invoice.passengerName} />
              <InvoiceField label="Date" value={dateLabel(invoice.date || invoice.createdAt)} />
              <InvoiceField label="Driver" value={invoice.driverName} />
              <InvoiceField label="Vehicle" value={invoice.vehicleNumber} />
              <InvoiceField label="Pickup location" value={invoice.pickupLocation || invoice.pickup} />
              <InvoiceField label="Drop location" value={invoice.dropLocation || invoice.drop} />
              <InvoiceField label="Distance" value={invoice.distance ? `${invoice.distance} km` : "Not added"} />
              <InvoiceField label="Payment mode" value={invoice.paymentMode || "Cash"} />
              <InvoiceField label="Fare" value={money(invoice.fare ?? totals.baseFare)} />
              <InvoiceField label="GST" value={`${invoice.GST ?? invoice.gst ?? totals.gstRate ?? 0}% (${money(totals.gstAmount)})`} />
              <InvoiceField label="Discount" value={`${invoice.discount ?? totals.discountRate ?? 0}% (${money(totals.discountAmount)})`} />
              <InvoiceField label="Total" value={money(invoice.total ?? totals.total)} strong />
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfOutlined />}
          onClick={onDownloadPdf}
          disabled={!invoice || loading}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InvoiceField({ label, value, strong = false }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography className="receipt-meta">{label}</Typography>
      <Typography className={strong ? "invoice-detail-total" : "receipt-value"}>
        {value || "Not added"}
      </Typography>
    </Grid>
  );
}

function Dashboard({ reports, filters, setFilters, loadReports, loading }) {
  const labels = reports.daily?.map((item) => item.period) || [];
  const values = reports.daily?.map((item) => item.earnings) || [];
  const chartData = {
    labels,
    datasets: [
      {
        label: "Daily earnings",
        data: values,
        borderColor: "#176b87",
        backgroundColor: "rgba(23,107,135,.14)",
        fill: true,
        tension: 0.35,
      },
    ],
  };
  const monthlyData = {
    labels: reports.monthly?.map((item) => item.period) || [],
    datasets: [
      {
        label: "Monthly earnings",
        data: reports.monthly?.map((item) => item.earnings) || [],
        backgroundColor: "#d97745",
        borderRadius: 5,
      },
    ],
  };
  return (
    <>
      <Box className="intro compact-intro">
        <Typography className="section-kicker">
          PERFORMANCE <span>•</span> 03
        </Typography>
        <Typography variant="h1">Earnings dashboard</Typography>
        <Typography className="intro-copy">
          Track trips and earnings across the selected period.
        </Typography>
      </Box>
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onRefresh={loadReports}
        loading={loading}
      />
      <Grid container spacing={2} className="metric-grid">
        <Metric label="Total trips" value={reports.invoiceCount} />
        <Metric label="Total earnings" value={money(reports.totalCollected)} />
        <Metric
          label="Average fare"
          value={
            reports.invoiceCount
              ? money(reports.totalCollected / reports.invoiceCount)
              : money(0)
          }
        />
      </Grid>
      <Grid container spacing={3} className="charts-grid">
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper className="chart-panel" elevation={0}>
            <Typography className="panel-title">Daily earnings</Typography>
            <Box className="chart-box">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper className="chart-panel" elevation={0}>
            <Typography className="panel-title">Monthly earnings</Typography>
            <Box className="chart-box">
              <Bar
                data={monthlyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
function Metric({ label, value }) {
  return (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Paper className="metric-card" elevation={0}>
        <Typography className="metric-label">{label}</Typography>
        <Typography className="metric-value">{value}</Typography>
      </Paper>
    </Grid>
  );
}

export default App;
