import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import WhatsApp from "@mui/icons-material/WhatsApp";
import Close from "@mui/icons-material/Close";
import { money } from "../utils/format.js";

// Code-split "Invoice saved" dialog. It is only mounted after the user saves
// an invoice, so lazy-loading it keeps its JSX, icons, and dependencies out of
// the initial-bundle evaluate step.
export default function SavedInvoiceModal({
  open,
  onClose,
  invoice,
  onDownloadPdf,
  onWhatsApp,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen>
      <DialogTitle sx={{ pr: 6 }}>
        Invoice saved
        <Button
          onClick={onClose}
          aria-label="Close invoice saved dialog"
          sx={{ position: "absolute", right: 8, top: 8, minWidth: 40, width: 40, height: 40 }}
        >
          <Close />
        </Button>
      </DialogTitle>
      <DialogContent dividers>
        <Box className="saved-invoice-summary">
          <Stack spacing={2}>
            <Box
              sx={{
                textAlign: "left",
                py: 2,
                px: 2,
                backgroundColor: "rgba(26, 115, 232, 0.06)",
                borderRadius: 3,
                border: "1px solid rgba(26,115,232,.16)",
              }}
            >
              <Typography component="div" fontWeight={700} color="#1A73E8" sx={{ mb: 0.5 }}>
                Invoice saved successfully!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your receipt is ready. You can share it as PDF or text from the buttons below.
              </Typography>
            </Box>
            <Box>
              <Typography className="receipt-meta">PASSENGER</Typography>
              <Typography className="receipt-value">
                {invoice?.passengerName || "Not added"}
              </Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={6}>
                <Typography className="receipt-meta">DRIVER</Typography>
                <Typography className="receipt-value">
                  {invoice?.driverName || "Not added"}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography className="receipt-meta">VEHICLE</Typography>
                <Typography className="receipt-value">
                  {invoice?.vehicleNumber || "Not added"}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography className="receipt-meta">FROM</Typography>
                <Typography className="receipt-value">
                  {invoice?.pickup || "Not added"}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography className="receipt-meta">TO</Typography>
                <Typography className="receipt-value">
                  {invoice?.drop || "Not added"}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography className="receipt-meta">DISTANCE</Typography>
                <Typography className="receipt-value">
                  {invoice?.distance ? `${invoice.distance} km` : "Not added"}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography className="receipt-meta">PAYMENT</Typography>
                <Typography className="receipt-value">
                  {invoice?.paymentMode || "Cash"}
                </Typography>
              </Grid>
            </Grid>
            <Divider className="receipt-divider" />
            <Box className="total-line">
              <Typography>Total due</Typography>
              <Typography className="total-amount">
                {money(invoice?.totals?.total)}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<PictureAsPdfOutlined />} onClick={onDownloadPdf}>
          Save PDF
        </Button>
        <Button className="whatsapp-button" variant="outlined" startIcon={<WhatsApp />} onClick={onWhatsApp}>
          Share via WhatsApp
        </Button>
      </DialogActions>
    </Dialog>
  );
}
