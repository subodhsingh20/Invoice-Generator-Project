import { memo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EditOutlined from "@mui/icons-material/EditOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import PageIntro from "./PageIntro.jsx";
import ReceiptBrand from "./ReceiptBrand.jsx";
import { money } from "../utils/format.js";

const upiQrMode = "UPI QR";

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
      String(form.fare).trim(),
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
          <Paper
            component="form"
            className="form-panel"
            elevation={0}
            onSubmit={(event) => event.preventDefault()}
          >
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
                        startAdornment: (
                          <InputAdornment position="start"></InputAdornment>
                        ),
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
                        startAdornment: (
                          <InputAdornment position="start"></InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "flex-end" }}
                  >
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
                    <Button
                      type="button"
                      size="small"
                      startIcon={<EditOutlined />}
                      onClick={() => setProfileEditing(true)}
                      disabled={profileEditing || profileLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      color="error"
                      onClick={clearProfile}
                      disabled={profileLoading}
                    >
                      Clear saved data
                    </Button>
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
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Pickup location"
                    placeholder="e.g. Airport terminal 2"
                    value={form.pickup}
                    onChange={updateField("pickup")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Drop location"
                    placeholder="e.g. City centre"
                    value={form.drop}
                    onChange={updateField("drop")}
                  />
                </Grid>
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
                          <InputAdornment position="start">Rs</InputAdornment>
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
                  >
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="Card">Card</MenuItem>
                    <MenuItem value={upiQrMode}>UPI QR</MenuItem>
                  </TextField>
                  {form.paymentMode === upiQrMode && (
                    <Button
                      size="small"
                      onClick={showQr}
                      disabled={qrLoading}
                      sx={{ mt: 1 }}
                    >
                      {qrLoading ? "Loading QR..." : "Show QR"}
                    </Button>
                  )}
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
                <ReceiptBrand
                  logo={logo}
                  title="Journey Receipt"
                  titleVariant="h3"
                />
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
                <Box className="route-arrow">-&gt;</Box>
                <Box className="route-end">
                  <Typography className="receipt-meta">TO</Typography>
                  <Typography className="receipt-value">
                    {form.drop || "Drop location"}
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2} className="receipt-info">
                <Info label="PASSENGER" value={form.passengerName || "Not added"} />
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

export default memo(NewBill);
