import { memo } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import IosShareOutlined from "@mui/icons-material/IosShareOutlined";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import Search from "@mui/icons-material/Search";
import PageIntro from "./PageIntro.jsx";
import ReceiptBrand from "./ReceiptBrand.jsx";
import { dateLabel, money } from "../utils/format.js";
import { useMemo, useState } from "react";

function InvoiceList({
  invoices,
  loadInvoices,
  deleteInvoice,
  loading,
  viewInvoice,
  selectedInvoice,
  invoiceLoading,
  invoiceError,
  closeInvoiceDialog,
  downloadInvoicePdf,
  shareInvoicePdf,
  invoiceDetailRef,
  logo,
}) {
  const [query, setQuery] = useState("");
  const filteredInvoices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return invoices;
    return invoices.filter((invoice) => {
      const passenger = String(invoice.passengerName || "").toLowerCase();
      const date = String(dateLabel(invoice.createdAt)).toLowerCase();
      const createdAt = String(invoice.createdAt || "").toLowerCase();
      return passenger.includes(normalized) || date.includes(normalized) || createdAt.includes(normalized);
    });
  }, [invoices, query]);

  return (
    <>
      <PageIntro
        eyebrow="INVOICE ARCHIVE"
        step="02"
        title="All invoices"
        copy="Search by client name or date, then tap to open a clean invoice view."
        compact
      />
      <Paper className="table-panel" elevation={0}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} className="invoice-search-row">
          <TextField
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search client name or date"
            label="Search invoices"
            size="small"
            slotProps={{
              input: {
                startAdornment: <Search sx={{ color: "text.secondary", mr: 1 }} />,
              },
            }}
          />
          <Button variant="contained" onClick={loadInvoices} disabled={loading} className="invoice-refresh-button">
            Refresh
          </Button>
        </Stack>
        <Box className="invoice-table">
          <Box className="table-row table-header">
            <Typography>Passenger</Typography>
            <Typography>Date</Typography>
            <Typography>Total amount</Typography>
            <Typography>Action</Typography>
          </Box>
          {!loading && filteredInvoices.length === 0 && (
            <Typography className="empty-state">
              No invoices match your search.
            </Typography>
          )}
          {filteredInvoices.map((invoice) => (
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
        onSharePdf={shareInvoicePdf}
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
  onSharePdf,
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
              <ReceiptBrand logo={logo} title="Journey invoice" titleVariant="h3" />
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
        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          spacing={1}
          sx={{ width: "100%" }}
          className="invoice-detail-actions"
        >
          <Button onClick={onClose} fullWidth={false} sx={{ flex: { xs: 1, sm: "0 0 auto" } }}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfOutlined />}
            onClick={onDownloadPdf}
            disabled={!invoice || loading}
            fullWidth
            sx={{ flex: { sm: "1 1 auto" } }}
          >
            Download PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<IosShareOutlined />}
            onClick={onSharePdf}
            disabled={!invoice || loading}
            fullWidth
            sx={{ flex: { sm: "1 1 auto" } }}
          >
            Share PDF
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

const InvoiceField = memo(function InvoiceField({ label, value, strong = false }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography className="receipt-meta">{label}</Typography>
      <Typography className={strong ? "invoice-detail-total" : "receipt-value"}>
        {value || "Not added"}
      </Typography>
    </Grid>
  );
});

export default memo(InvoiceList);
