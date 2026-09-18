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
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import SyncAltOutlined from "@mui/icons-material/SyncAltOutlined";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import PageIntro from "./PageIntro.jsx";
import InvoicePreview from "./InvoicePreview.jsx";

const upiQrMode = "UPI QR";
const draftKey = "easybill_invoice_draft";
// Contacts are informational only; any value (including blank or partial) is valid.
const phone = z.preprocess((value) => value == null ? "" : String(value).trim(), z.string());
const billSchema = z.object({
  passengerName: z.string().trim().min(1, "Passenger name is required"),
  passengerContact: phone,
  driverName: z.string().trim().min(1, "Driver name is required"),
  driverContact: phone,
  vehicleNumber: z.string().trim().min(1, "Vehicle number is required"),
  pickup: z.string().trim().min(1, "Pickup location is required"),
  destination: z.string().trim(),
  drop: z.string().trim().min(1, "Drop location is required"),
  distance: z.coerce.number().finite().nonnegative("Distance cannot be negative"),
  fare: z.coerce.number().finite().nonnegative("Fare cannot be negative"),
  discount: z.coerce.number().finite().nonnegative("Discount cannot be negative"),
  paymentMode: z.enum(["Cash", "Card", upiQrMode]),
  tripType: z.enum(["One-Way", "Round-Trip"]),
}).refine((value) => value.discount <= value.fare, { path: ["discount"], message: "Discount cannot exceed base fare" })
  .refine((value) => value.tripType !== "Round-Trip" || value.destination.trim(), { path: ["destination"], message: "Destination location is required for round trips" });

function readDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (!draft) return null;
    return { ...draft, tripType: draft.tripType === "One Way" ? "One-Way" : draft.tripType === "Round Trip" ? "Round-Trip" : draft.tripType || "Round-Trip" };
  } catch {
    return null;
  }
}

function NewBill({
  form, totals, receiptRef, saveInvoice, profileEditing, setProfileEditing,
  profileLoading, saveProfile, clearProfile, showQr, qrLoading, logo, saving,
  onFormChange, invoiceNumber,
}) {
  const draft = useRef(readDraft()).current;
  const formRef = useRef(form);
  const { control, handleSubmit, reset, watch, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(billSchema),
    defaultValues: draft || form,
    mode: "onBlur",
  });
  const watchedForm = watch();
  const canSave = Boolean(
    watchedForm.passengerName?.trim() && watchedForm.driverName?.trim() &&
    watchedForm.vehicleNumber?.trim() && watchedForm.pickup?.trim() &&
    (watchedForm.tripType !== "Round-Trip" || watchedForm.destination?.trim()) &&
    watchedForm.drop?.trim() && String(watchedForm.distance ?? "").trim() &&
    String(watchedForm.fare ?? "").trim(),
  );

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => {
    const current = getValues();
    const savedFields = ["passengerName", "passengerContact", "driverName", "driverContact", "vehicleNumber"];
    if (savedFields.some((field) => (form[field] || "") !== (current[field] || ""))) reset({ ...current, ...form });
  }, [form.passengerName, form.passengerContact, form.driverName, form.driverContact, form.vehicleNumber, getValues, reset]);
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
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper component="form" className="form-panel" elevation={0} onSubmit={handleSubmit(() => { localStorage.removeItem(draftKey); saveInvoice(); })}>
            <Stack spacing={3}>
              <Box><Typography component="h2" className="panel-title">Passenger and driver</Typography><Typography className="panel-subtitle">Saved driver details are protected and reusable</Typography></Box>
              <Grid container spacing={2}>
                <Grid size={12}>{renderField("passengerName", "Passenger name")}</Grid>
                <Grid size={12}>{renderField("passengerContact", <>Passenger contact <span className="optional-label">(optional)</span></>, { type: "tel", placeholder: "e.g. 9876543210", slotProps: { htmlInput: { inputMode: "numeric", maxLength: 20 } } })}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{renderField("driverName", "Driver name", { placeholder: "e.g. Arjun Sharma", disabled: !profileEditing })}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{renderField("driverContact", <>Driver contact <span className="optional-label">(optional)</span></>, { type: "tel", placeholder: "e.g. 9876543210", disabled: !profileEditing, slotProps: { htmlInput: { inputMode: "numeric", maxLength: 20 } } })}</Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{renderField("vehicleNumber", "Vehicle number", { placeholder: "e.g. MH 12 AB 1234", disabled: !profileEditing })}</Grid>
                <Grid size={12}><Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>{profileEditing && <Button type="button" size="small" variant="contained" startIcon={<SaveOutlined />} onClick={saveProfile} disabled={profileLoading}>{profileLoading ? "Saving..." : "Save"}</Button>}<Button type="button" size="small" startIcon={<EditOutlined />} onClick={() => setProfileEditing(true)} disabled={profileEditing || profileLoading}>Edit</Button><Button type="button" size="small" color="error" onClick={clearProfile} disabled={profileLoading}>Clear saved data</Button></Stack></Grid>
              </Grid>
              <Divider />
              <Box><Typography component="h2" className="panel-title">Trip details</Typography><Typography className="panel-subtitle">Where this journey begins and ends</Typography></Box>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Controller name="tripType" control={control} render={({ field }) => (
                    <ToggleButtonGroup exclusive value={field.value || "One-Way"} onChange={(_, value) => value && field.onChange(value)} className="trip-type-toggle" aria-label="Trip type">
                      <ToggleButton value="One-Way"><DirectionsCarOutlined /> One-Way</ToggleButton>
                      <ToggleButton value="Round-Trip"><SyncAltOutlined /> Round-Trip</ToggleButton>
                    </ToggleButtonGroup>
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: watchedForm.tripType === "Round-Trip" ? 4 : 6 }}>{renderField("pickup", "Pickup location", { placeholder: "e.g. Ahmedabad Airport" })}</Grid>
                {watchedForm.tripType === "Round-Trip" && <Grid size={{ xs: 12, sm: 4 }} className="trip-field-enter">{renderField("destination", "Destination location", { placeholder: "e.g. Allencera Tiles" })}</Grid>}
                <Grid size={{ xs: 12, sm: watchedForm.tripType === "Round-Trip" ? 4 : 6 }}>{renderField("drop", "Drop location", { placeholder: "e.g. Ahmedabad Airport" })}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{renderField("distance", "Distance", { type: "number", slotProps: { input: { endAdornment: <InputAdornment position="end">km</InputAdornment> } } })}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{renderField("fare", "Base fare", { type: "number", slotProps: { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } } })}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{renderField("discount", "Discount (₹)", { type: "number", placeholder: "0", slotProps: { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } } })}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{renderField("paymentMode", "Payment mode", { select: true }, [<MenuItem key="cash" value="Cash">Cash</MenuItem>, <MenuItem key="card" value="Card">Card</MenuItem>, <MenuItem key="upi" value={upiQrMode}>{upiQrMode}</MenuItem>])}{watchedForm.paymentMode === upiQrMode && <Button size="small" onClick={showQr} disabled={qrLoading} sx={{ mt: 1 }}>{qrLoading ? "Loading QR..." : "Show QR"}</Button>}</Grid>
              </Grid>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} className="action-row"><Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={20} /> : <SaveOutlined />} disabled={!canSave || saving}>{saving ? "Saving..." : "Save Invoice"}</Button></Stack>
            </Stack>
          </Paper>
        </Grid>
        <InvoicePreview receiptRef={receiptRef} logo={logo} invoiceNumber={invoiceNumber} form={watchedForm} totals={totals} />
      </Grid>
    </>
  );
}

export default memo(NewBill);
