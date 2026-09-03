import { memo, useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
const draftKey = "easybill_invoice_draft";
const billSchema = z.object({
  passengerName: z.string().trim().min(1, "Passenger name is required"),
  driverName: z.string().trim().min(1, "Driver name is required"),
  vehicleNumber: z.string().trim().min(1, "Vehicle number is required"),
  pickup: z.string().trim().min(1, "Pickup location is required"),
  drop: z.string().trim().min(1, "Drop location is required"),
  distance: z.coerce.number().finite().nonnegative("Distance cannot be negative"),
  fare: z.coerce.number().finite().nonnegative("Fare cannot be negative"),
  gst: z.coerce.number().finite().nonnegative("GST cannot be negative"),
  discount: z.coerce.number().finite().nonnegative("Discount cannot be negative"),
  paymentMode: z.enum(["Cash", "Card", upiQrMode]),
});

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey) || "null");
  } catch {
    return null;
  }
}

function NewBill({
  form, totals, receiptRef, saveInvoice, profileEditing, setProfileEditing,
  profileLoading, saveProfile, clearProfile, showQr, qrLoading, logo, saving,
  onFormChange,
}) {
  const draft = useRef(readDraft()).current;
  const formRef = useRef(form);
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(billSchema),
    defaultValues: draft || form,
    mode: "onBlur",
  });
  const watchedForm = watch();
  const canSave = Boolean(
    watchedForm.passengerName?.trim() && watchedForm.driverName?.trim() &&
    watchedForm.vehicleNumber?.trim() && watchedForm.pickup?.trim() &&
    watchedForm.drop?.trim() && String(watchedForm.distance ?? "").trim() &&
    String(watchedForm.fare ?? "").trim(),
  );

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => {
    if (draft && !form.passengerName && !form.pickup && !form.fare) {
      reset(draft);
      onFormChange(draft);
    }
  }, [draft, form.fare, form.passengerName, form.pickup, onFormChange, reset]);
  useEffect(() => {
    const subscription = watch((values) => {
      const nextForm = { ...formRef.current, ...values };
      localStorage.setItem(draftKey, JSON.stringify(nextForm));
      onFormChange(nextForm);
    });
    return () => subscription.unsubscribe();
  }, [onFormChange, watch]);

  const renderField = (name, label, props = {}, children = null) => (
    <Controller name={name} control={control} render={({ field: input }) => (
      <TextField fullWidth label={label} {...props} {...input} value={input.value ?? ""}
        error={Boolean(errors[name])} helperText={errors[name]?.message}>{children}</TextField>
    )} />
  );

  return (
    <>
      <PageIntro eyebrow="NEW RECEIPT" step="01" title="Create a ride bill" copy="Enter the trip details below. Your receipt updates as you type." />
      <Grid container spacing={3} className="workspace">
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper component="form" className="form-panel" elevation={0} onSubmit={handleSubmit(() => { localStorage.removeItem(draftKey); saveInvoice(); })}>
            <Stack spacing={3}>
              <Box><Typography component="h2" className="panel-title">Passenger and driver</Typography><Typography className="panel-subtitle">Saved driver details are protected and reusable</Typography></Box>
              <Grid container spacing={2}>
                <Grid size={12}>{renderField("passengerName", "Passenger name")}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{renderField("driverName", "Driver name", { placeholder: "e.g. Arjun Sharma", disabled: !profileEditing })}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{renderField("vehicleNumber", "Vehicle number", { placeholder: "e.g. MH 12 AB 1234", disabled: !profileEditing })}</Grid>
                <Grid size={12}><Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>{profileEditing && <Button type="button" size="small" variant="contained" startIcon={<SaveOutlined />} onClick={saveProfile} disabled={profileLoading}>{profileLoading ? "Saving..." : "Save"}</Button>}<Button type="button" size="small" startIcon={<EditOutlined />} onClick={() => setProfileEditing(true)} disabled={profileEditing || profileLoading}>Edit</Button><Button type="button" size="small" color="error" onClick={clearProfile} disabled={profileLoading}>Clear saved data</Button></Stack></Grid>
              </Grid>
              <Divider />
              <Box><Typography component="h2" className="panel-title">Trip details</Typography><Typography className="panel-subtitle">Where this journey begins and ends</Typography></Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>{renderField("pickup", "Pickup location", { placeholder: "e.g. Airport terminal 2" })}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{renderField("drop", "Drop location", { placeholder: "e.g. City centre" })}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{renderField("distance", "Distance", { type: "number", slotProps: { input: { endAdornment: <InputAdornment position="end">km</InputAdornment> } } })}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{renderField("fare", "Fare", { type: "number", slotProps: { input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> } } })}</Grid>
                <Grid size={{ xs: 6, sm: 2 }}>{renderField("gst", "GST", { type: "number", slotProps: { input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } } })}</Grid>
                <Grid size={{ xs: 6, sm: 2 }}>{renderField("discount", "Discount", { type: "number", slotProps: { input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } } })}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{renderField("paymentMode", "Payment mode", { select: true }, [<MenuItem key="cash" value="Cash">Cash</MenuItem>, <MenuItem key="card" value="Card">Card</MenuItem>, <MenuItem key="upi" value={upiQrMode}>{upiQrMode}</MenuItem>])}{watchedForm.paymentMode === upiQrMode && <Button size="small" onClick={showQr} disabled={qrLoading} sx={{ mt: 1 }}>{qrLoading ? "Loading QR..." : "Show QR"}</Button>}</Grid>
              </Grid>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} className="action-row"><Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={20} /> : <SaveOutlined />} disabled={!canSave || saving}>{saving ? "Saving..." : "Save Invoice"}</Button></Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}><Box className="preview-wrap"><Typography className="section-kicker preview-heading">LIVE PREVIEW</Typography><Paper ref={receiptRef} className="receipt" elevation={0}><Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}><ReceiptBrand logo={logo} title="Journey Receipt" titleVariant="h3" /><Box className="receipt-number">#RB-001</Box></Stack><Divider className="receipt-divider" /><Box className="route"><Box><Typography className="receipt-meta">FROM</Typography><Typography className="receipt-value">{watchedForm.pickup || "Pickup location"}</Typography></Box><Box className="route-arrow">-&gt;</Box><Box className="route-end"><Typography className="receipt-meta">TO</Typography><Typography className="receipt-value">{watchedForm.drop || "Drop location"}</Typography></Box></Box><Grid container spacing={2} className="receipt-info"><Info label="PASSENGER" value={watchedForm.passengerName || "Not added"} /><Info label="DRIVER" value={watchedForm.driverName || "Not added"} /><Info label="VEHICLE" value={watchedForm.vehicleNumber || "Not added"} /><Info label="DISTANCE" value={watchedForm.distance ? `${watchedForm.distance} km` : "Not added"} /></Grid><Divider className="receipt-divider" /><Stack spacing={1} className="price-lines"><Price label="Base fare" value={money(totals.fare)} /><Price label={`GST (${watchedForm.gst || 0}%)`} value={money(totals.gst)} /><Price label={`Discount (${watchedForm.discount || 0}%)`} value={`-${money(totals.discount)}`} className="discount-line" /></Stack><Box className="total-line"><Typography>Total due</Typography><Typography className="total-amount">{money(totals.total)}</Typography></Box><Typography className="receipt-foot">Thank you for choosing Aura Men Billing Service Portal</Typography></Paper></Box></Grid>
      </Grid>
    </>
  );
}

const Info = memo(function Info({ label, value }) { return <Grid size={6}><Typography className="receipt-meta">{label}</Typography><Typography className="receipt-value">{value}</Typography></Grid>; });
const Price = memo(function Price({ label, value, className = "" }) { return <Stack direction="row" sx={{ justifyContent: "space-between" }} className={className}><Typography>{label}</Typography><Typography>{value}</Typography></Stack>; });

export default memo(NewBill);
