import {
  Suspense,
  lazy,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import Close from "@mui/icons-material/Close";
import Menu from "@mui/icons-material/Menu";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { money } from "./utils/format.js";
import { createAppTheme, getInitialThemeMode } from "./theme.js";
import PageTransition from "./components/PageTransition.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import "./App.css";

// Non-initial views are code-split: their heavy dependencies (chart.js, and
// the invoice/export UI) are only fetched and evaluated when the user opens
// the matching tab, never during the initial paint.
const Dashboard = lazy(() => import("./components/Dashboard.jsx"));
const InvoiceList = lazy(() => import("./components/InvoiceList.jsx"));
const LoginPage = lazy(() => import("./components/Login.jsx"));
const SignupPage = lazy(() => import("./components/Signup.jsx"));
const QrSettings = lazy(() => import("./components/QrSettings.jsx"));
const NewBillView = lazy(() => import("./components/NewBill.jsx"));
// The "Invoice saved" dialog only mounts after a save, so its code is kept out
// of the initial bundle and fetched on demand.
const SavedInvoiceModal = lazy(() =>
  import("./components/SavedInvoiceModal.jsx"),
);

const PASSENGER_FIELDS = [["passengerName", "Passenger name"]];

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const API_URL = trimTrailingSlash(
  import.meta.env.REACT_APP_API_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000",
);
const AUTH_TOKEN_KEY = "easybill_driver_token";
const AUTH_DRIVER_KEY = "easybill_driver_profile";
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
// html2canvas and jspdf are large libraries. Importing them dynamically, on
// the first user action that needs them, keeps them off the critical path.
const loadPdfLibs = async () => {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  return { html2canvas, jsPDF };
};
const getStoredToken = () =>
  typeof window === "undefined" ? "" : localStorage.getItem(AUTH_TOKEN_KEY) || "";
const driverHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
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
function App() {
  const storedToken = useMemo(() => getStoredToken(), []);
  const [token, setToken] = useState(storedToken);
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);
  const toggleTheme = () => {
    setThemeMode((current) => {
      const nextMode = current === "dark" ? "light" : "dark";
      localStorage.setItem("easybill_theme_mode", nextMode);
      return nextMode;
    });
  };
  const [authView, setAuthView] = useState("login");
  const [view, setView] = useState("new");
  const [form, setForm] = useState(initialForm);
  const [formResetVersion, setFormResetVersion] = useState(0);
  const syncBillForm = useCallback((nextForm) => setForm(nextForm), []);
  const [invoices, setInvoices] = useState([]);
  const [reports, setReports] = useState({
    invoiceCount: 0,
    totalCollected: 0,
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [notice, setNotice] = useState("");
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [driverProfile, setDriverProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_DRIVER_KEY) || "null");
    } catch {
      return null;
    }
  });
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
  const updateField = useCallback(
    (field) => (event) =>
      setForm((current) => ({ ...current, [field]: event.target.value })),
    [],
  );
  const updateToken = useCallback((nextToken, driver) => {
    setToken(nextToken);
    if (typeof window === "undefined") return;
    if (nextToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
      if (driver) {
        localStorage.setItem(AUTH_DRIVER_KEY, JSON.stringify(driver));
        setDriverProfile(driver);
      }
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_DRIVER_KEY);
      setDriverProfile(null);
    }
  }, []);
  const logout = useCallback(() => {
    updateToken("", null);
    setAuthView("login");
    setNotice("Logged out");
  }, [updateToken]);
  const deleteAccount = useCallback(async () => {
    setAccountLoading(true);
    try {
      const result = await fetch(`${API_URL}/auth/delete-account`, {
        method: "DELETE",
        headers: driverHeaders(),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.error || "Unable to delete account");
      setAccountOpen(false);
      logout();
      setNotice(data.message || "Account deleted");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setAccountLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/profile`, { headers: driverHeaders() })
      .then(async (result) => {
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Unable to load saved driver data");
        setForm((current) => ({
          ...current,
          driverName: data.driverName || current.driverName || driverProfile?.driverName || "",
          vehicleNumber: data.vehicleNumber || current.vehicleNumber || driverProfile?.vehicleNumber || "",
        }));
        setLogo(data.logoData ? { logoData: data.logoData, logoMimeType: data.logoMimeType, logoSize: data.logoSize, updatedAt: data.updatedAt } : null);
      })
      .catch((error) => setNotice(error.message));
  }, [token, driverProfile]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetch(`${API_URL}/invoice`, {
        headers: driverHeaders(),
      });
      if (!result.ok) throw new Error();
      setInvoices(await result.json());
    } catch {
      setNotice("Unable to load invoices. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      const result = await fetch(`${API_URL}/reports?${query}`, {
        headers: driverHeaders(),
      });
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
    setMenuOpen(false);
    // Non-urgent update: React yields the main thread while the lazy chunk
    // for the target view (e.g. chart.js for Dashboard) is fetched, so the
    // current view stays responsive and the LCP paint isn't blocked.
    startTransition(() => {
      setView(nextView);
    });
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
      setForm((current) => ({
        ...initialForm,
        driverName: current.driverName,
        vehicleNumber: current.vehicleNumber,
      }));
      setFormResetVersion((current) => current + 1);
      return invoice;
    } catch (error) {
      setNotice(error.message === 'Failed to fetch' ? 'Unable to reach the API. Start it with npm run server.' : error.message);
      return null;
    } finally {
      setSaving(false);
    }
  };
  const ensureSavedInvoice = async () => savedInvoice || saveInvoice();
  const deleteInvoice = async (id) => {
    try {
      const result = await fetch(`${API_URL}/invoice/${id}`, {
        method: "DELETE",
        headers: driverHeaders(),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.error || "Unable to delete invoice");
      setInvoices((current) => current.filter((invoice) => invoice._id !== id));
      setNotice("Invoice deleted");
      return true;
    } catch (error) {
      setNotice(error.message);
      throw error;
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
    const { html2canvas, jsPDF } = await loadPdfLibs();
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
  const shareInvoicePdf = useCallback(async () => {
    if (!invoiceDetailRef.current || !selectedInvoice) return;
    const { html2canvas, jsPDF } = await loadPdfLibs();
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
    const blob = pdf.output("blob");
    const filename = `easy-bill-${selectedInvoice.passengerName || "invoice"}.pdf`;
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "Aura Men Billing Service Portal",
          text: "Journey invoice PDF",
          files: [file],
        });
        setNotice("PDF shared successfully");
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    pdf.save(filename);
    setNotice("PDF downloaded successfully");
  }, [invoiceDetailRef, selectedInvoice]);
  const loadQr = useCallback(async ({ silent = false } = {}) => {
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
    setQrLoading(true);
    try {
      const formData = new FormData();
      formData.append("qr", file);
      const result = await fetch(`${API_URL}/qr/save`, {
        method: "POST",
        headers: driverHeaders(),
        body: formData,
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
    setLogoLoading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const result = await fetch(`${API_URL}/profile/logo`, {
        method: "POST",
        headers: driverHeaders(),
        body: formData,
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
    setProfileLoading(true);
    try {
      const result = await fetch(`${API_URL}/profile/save`, { method: "POST", headers: { "Content-Type": "application/json", ...driverHeaders() }, body: JSON.stringify({ driverName: form.driverName, vehicleNumber: form.vehicleNumber }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Error saving");
      setForm((current) => ({ ...current, driverName: data.profile.driverName, vehicleNumber: data.profile.vehicleNumber }));
      setProfileEditing(false);
      setNotice(data.message || "Saved successfully");
    } catch (error) { setNotice(error.message); } finally { setProfileLoading(false); }
  };
  const clearProfile = async () => {
    setProfileLoading(true);
    try {
      const result = await fetch(`${API_URL}/profile/clear`, { method: "DELETE", headers: driverHeaders() });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Unable to clear saved data");
      setForm((current) => ({ ...current, driverName: "", vehicleNumber: "" }));
      setLogo(null);
      setProfileEditing(true);
      setNotice(data.message || "Saved data cleared");
    } catch (error) { setNotice(error.message); } finally { setProfileLoading(false); }
  };
  const exportImage = async () => {
    if (!receiptRef.current) return null;
    const { html2canvas } = await loadPdfLibs();
    return html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
  };
  const shareFile = async (blob, filename, title) => {
    const file = new File([blob], filename, { type: blob.type });
    if (!navigator.share || !navigator.canShare?.({ files: [file] }))
      return false;
    try {
      await navigator.share({ title, text: "Aura Men Billing Service Portal invoice", files: [file] });
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
    const { jsPDF } = await loadPdfLibs();
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
      setNotice("PDF saved successfully");
    }
  };
  const handleWhatsApp = async () => {
    const text = buildShareText();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const buildShareText = useCallback(
    () =>
      `Ride bill for ${form.passengerName || "Passenger"}\n${form.pickup || "Pickup"} to ${form.drop || "Drop"}\nDriver: ${form.driverName || "Driver"}\nVehicle: ${form.vehicleNumber || "Vehicle"}\nTotal: ${money(totals.total)}`,
    [form.passengerName, form.pickup, form.drop, form.driverName, form.vehicleNumber, totals.total],
  );
  const shareText = useCallback(async () => {
    const text = buildShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Aura Men Billing Service Portal", text });
        setNotice("Shared successfully");
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    await navigator.clipboard?.writeText(text);
    setNotice("Text copied to clipboard");
  }, [buildShareText]);
  const sharePdf = useCallback(async () => {
    const canvas = await exportImage();
    if (!canvas) return;
    const { jsPDF } = await loadPdfLibs();
    const pdf = new jsPDF({ unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    const blob = pdf.output("blob");
    const file = new File([blob], `aura-men-bill-${form.passengerName || "receipt"}.pdf`, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "Aura Men Billing Service Portal", text: "Journey receipt PDF", files: [file] });
        setNotice("PDF shared successfully");
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    pdf.save(file.name);
    setNotice("PDF downloaded successfully");
  }, [exportImage, form.passengerName]);

  const validateAuthForm = useCallback((mode, authForm) => {
    const nextErrors = {};
    if (mode === "signup" && !String(authForm.driverName || "").trim()) {
      nextErrors.driverName = "Driver name is required";
    }
    if (!String(authForm.email || "").trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(authForm.email).trim())) {
      nextErrors.email = "Enter a valid email";
    }
    if (!String(authForm.password || "")) {
      nextErrors.password = "Password is required";
    } else if (String(authForm.password).length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }
    if (mode === "signup" && !String(authForm.vehicleNumber || "").trim()) {
      nextErrors.vehicleNumber = "Vehicle number is required";
    }
    return nextErrors;
  }, []);

  const handleAuth = useCallback(
    async (mode, authForm, setErrors, setLoading) => {
      const nextErrors = validateAuthForm(mode, authForm);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
      setLoading(true);
      try {
        const result = await fetch(`${API_URL}/auth/${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authForm),
        });
        const data = await result.json().catch(() => ({}));
        if (!result.ok) throw new Error(data.error || "Authentication failed");
        updateToken(data.token, data.driver);
        setForm((current) => ({
          ...current,
          driverName: data.driver?.driverName || current.driverName,
          vehicleNumber: data.driver?.vehicleNumber || current.vehicleNumber,
        }));
        setView("new");
        setAuthView("login");
        setNotice(data.message || (mode === "login" ? "Login successful" : "Signup successful"));
      } catch (error) {
        setNotice(
          error.message === "Failed to fetch"
            ? "Unable to reach the API. Start it with npm run server."
            : error.message,
        );
      } finally {
        setLoading(false);
      }
    },
    [setForm, updateToken, validateAuthForm],
  );

  if (!token) {
    return (
      <ThemeProvider theme={theme}>
        <Box className={`app-shell auth-shell theme-${themeMode}`}>
          <Container maxWidth="sm" className="page-container auth-container">
            <Suspense
              fallback={
                <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                  <CircularProgress />
                </Box>
              }
            >
              {authView === "login" ? (
                <AuthLoginFlow
                  onSubmit={handleAuth}
                  onSwitchToSignup={() => setAuthView("signup")}
                />
              ) : (
                <AuthSignupFlow
                  onSubmit={handleAuth}
                  onSwitchToLogin={() => setAuthView("login")}
                />
              )}
            </Suspense>
          </Container>
          <Snackbar
            open={Boolean(notice)}
            autoHideDuration={3500}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            className="app-notice"
            onClose={() => setNotice("")}
          >
            <Alert severity="info" onClose={() => setNotice("")}>
              {notice}
            </Alert>
          </Snackbar>
        </Box>
      </ThemeProvider>
    );
  }


  return (
    <ThemeProvider theme={theme}>
      <Box className={`app-shell theme-${themeMode}`}>
        <Box component="main" className="page-main">
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
                <Typography className="eyebrow">AURA MEN</Typography>
                <Typography component="div" className="brand-name">
                   Billing Service Portal
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
            className={`mobile-drawer theme-${themeMode}`}
            slotProps={{ paper: { id: "mobile-navigation-drawer" } }}
          >
            <Box className="drawer-content" role="presentation">
              <Box className="drawer-toprow">
                <Box />
                <IconButton
                  aria-label="Close navigation menu"
                  className="drawer-close-button"
                  onClick={() => setMenuOpen(false)}
                >
                  <Close />
                </IconButton>
              </Box>
              <Box className="drawer-account">
                <Box>
                  <Typography className="drawer-kicker">SIGNED IN</Typography>
                  <Typography component="div" className="drawer-title">
                    Aura Men Billing Service Portal
                  </Typography>
                  <Typography className="drawer-subtitle drawer-name">
                    {driverProfile?.driverName || "Driver account"}
                  </Typography>
                </Box>
                <Button variant="contained" color="secondary" onClick={logout} className="drawer-logout">
                  Logout
                </Button>
              </Box>
              <List>
                <ListItem disablePadding>
                  <ListItemButton selected={view === "new"} onClick={() => changeView("new")}>
                    <ListItemText primary="New bill" secondary="Create a receipt" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton selected={view === "invoices"} onClick={() => changeView("invoices")}>
                    <ListItemText primary="Archive" secondary="View saved rides" />
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
                    <ListItemText primary="Settings" secondary="Manage QR, account, and theme" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          </Drawer>
          <Suspense
            fallback={
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  minHeight: 240,
                  py: 6,
                }}
              >
                <CircularProgress />
              </Box>
            }
          >
            <PageTransition view={view}>
            {view === "new" && (
              <NewBillView
                key={formResetVersion}
                form={form}
                totals={totals}
                fields={PASSENGER_FIELDS}
                updateField={updateField}
                receiptRef={receiptRef}
                saveInvoice={saveInvoice}
                onSharePdf={sharePdf}
                onShareText={shareText}
                shareLoading={saving}
                profileEditing={profileEditing}
                setProfileEditing={setProfileEditing}
                profileLoading={profileLoading}
                saveProfile={saveProfile}
                clearProfile={clearProfile}
                showQr={showQr}
                qrLoading={qrLoading}
                logo={logo}
                saving={saving}
                onFormChange={syncBillForm}
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
                shareInvoicePdf={shareInvoicePdf}
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
            {view === "settings" && (
              <QrSettings
                qr={qr}
                qrLoading={qrLoading}
                saveQr={saveQr}
                logo={logo}
                logoLoading={logoLoading}
                saveLogo={saveLogo}
                deleteLogo={deleteLogo}
                profile={driverProfile}
                onOpenAccount={() => setAccountOpen(true)}
                themeMode={themeMode}
                onToggleTheme={toggleTheme}
              />
            )}
            </PageTransition>
          </Suspense>
          <MobileBottomNav value={view} onChange={changeView} />
          <Typography className="footer-note">
            Aura Men Billing Service Portal <span>•</span> Simple billing for the road
          </Typography>
          </Container>
        </Box>
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
      <Dialog open={accountOpen} onClose={() => setAccountOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete account</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            This will permanently delete your driver account, profile, QR code, and saved invoices.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccountOpen(false)} disabled={accountLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteAccount} disabled={accountLoading}>
            {accountLoading ? "Deleting..." : "Delete account"}
          </Button>
        </DialogActions>
      </Dialog>
      <Suspense fallback={null}>
        <SavedInvoiceModal
          open={isModalOpen}
          onClose={closeSavedModal}
          invoice={savedInvoice}
          onDownloadPdf={handlePdf}
          onWhatsApp={handleWhatsApp}
        />
      </Suspense>
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
      <PageIntro
        eyebrow="NEW RECEIPT"
        step="01"
        title="Create a ride bill"
        copy="Enter the trip details below. Your receipt updates as you type."
      />
      <Grid container spacing={3} className="workspace">
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper component="form" className="form-panel" elevation={0} onSubmit={(event) => event.preventDefault()}>
            <Stack spacing={3}>
              <Box>
                <Typography component="h2" className="panel-title">
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
                      },
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                    {profileEditing && (
                      <Button
                        type="button"
                        size="small"
                        variant="contained"
                        startIcon={<SaveOutlined />}
                        onClick={saveProfile}
                        disabled={profileLoading}
                      >
                        {profileLoading ? "Saving..." : "Save"}
                      </Button>
                    )}
                    <Button type="button" size="small" startIcon={<EditOutlined />} onClick={() => setProfileEditing(true)} disabled={profileEditing || profileLoading}>Edit</Button>
                    <Button type="button" size="small" color="error" onClick={clearProfile} disabled={profileLoading}>Clear saved data</Button>
                  </Stack>
                </Grid>
              </Grid>
              <Divider />
              <Box>
                <Typography component="h2" className="panel-title">
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
                <ReceiptBrand logo={logo} title="Journey receipt" titleVariant="h3" />
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
                Thank you for choosing Aura Men Billing Service Portal
              </Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
const Info = memo(function Info({ label, value }) {
  return (
    <Grid size={6}>
      <Typography className="receipt-meta">{label}</Typography>
      <Typography className="receipt-value">{value}</Typography>
    </Grid>
  );
});
const Price = memo(function Price({ label, value, className = "" }) {
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
});

// ReceiptBrand, QrSettings, FilterBar, InvoiceList, InvoiceDialog,
// Dashboard, and Metric now live in frontend/src/components/ — they are
// code-split and only loaded with the views that need them.

function AuthLoginFlow({ onSubmit, onSwitchToSignup }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  return (
    <LoginPage
      form={form}
      errors={errors}
      loading={loading}
      onChange={(field) => (event) =>
        setForm((current) => ({ ...current, [field]: event.target.value }))}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit("login", form, setErrors, setLoading);
      }}
      onSwitchToSignup={onSwitchToSignup}
    />
  );
}

function AuthSignupFlow({ onSubmit, onSwitchToLogin }) {
  const [form, setForm] = useState({
    driverName: "",
    email: "",
    password: "",
    vehicleNumber: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  return (
    <SignupPage
      form={form}
      errors={errors}
      loading={loading}
      onChange={(field) => (event) =>
        setForm((current) => ({ ...current, [field]: event.target.value }))}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit("signup", form, setErrors, setLoading);
      }}
      onSwitchToLogin={onSwitchToLogin}
    />
  );
}

export default App;
