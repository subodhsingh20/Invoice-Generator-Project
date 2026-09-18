import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import ApartmentOutlined from "@mui/icons-material/ApartmentOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import FlightTakeoffOutlined from "@mui/icons-material/FlightTakeoffOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ReceiptBrand from "./ReceiptBrand.jsx";
import { money } from "../utils/format.js";

const numberWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tensWords = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const wordsBelowHundred = (value) => value < 20 ? numberWords[value] : `${tensWords[Math.floor(value / 10)]}${value % 10 ? ` ${numberWords[value % 10]}` : ""}`;
const wordsBelowThousand = (value) => value < 100 ? wordsBelowHundred(value) : `${numberWords[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${wordsBelowHundred(value % 100)}` : ""}`;
const amountInWords = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0));
  if (!amount) return "Zero Rupees Only";
  const parts = [];
  const lakh = Math.floor(amount / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const remainder = amount % 1000;
  if (lakh) parts.push(`${wordsBelowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${wordsBelowThousand(thousand)} Thousand`);
  if (remainder) parts.push(wordsBelowThousand(remainder));
  return `${parts.join(" ")} Rupees Only`;
};

export default function InvoicePreview({ receiptRef, logo, invoiceNumber, form, totals }) {
  const passenger = form.passengerName || "Passenger name";
  const roundTrip = form.tripType === "Round-Trip" || form.tripType === "Round Trip";
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", "-");
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Box className="preview-wrap">
        <Typography className="section-kicker preview-heading">LIVE PREVIEW</Typography>
        <Paper ref={receiptRef} className="receipt aura-invoice" elevation={0}>
          <Box className="aura-invoice-header">
            <Box className="aura-brand-block"><ReceiptBrand logo={logo} title="AURA MEN" titleVariant="h3" /><Typography className="aura-subtitle">TRAVEL | TRUST</Typography></Box>
            <Box className="aura-invoice-stamp"><Typography>INVOICE</Typography><Typography className="aura-date">DATE<br /><strong>{date}</strong></Typography><Typography className="aura-invoice-number">#RB-{String(invoiceNumber || 1).padStart(3, "0")}</Typography></Box>
          </Box>
          <Typography className="aura-tagline">Safe <span>•</span> Reliable <span>•</span> Comfortable</Typography>
          <Typography className="aura-service-line"><LocationOnOutlined /> Service Available All Over Gujarat</Typography>
          <Box className="aura-info-grid">
            <InfoBox title="BILL TO" icon={<PhoneOutlined />}><strong>{passenger}</strong><span><PhoneOutlined /> {form.passengerContact || "Contact not added"}</span></InfoBox>
            <InfoBox title="FROM" icon={<ApartmentOutlined />}><strong>Aura Men Cab Service</strong><span><PhoneOutlined /> {form.driverContact || "Contact not added"}</span><span><EmailOutlined /> theauramencabservice@gmail.com</span><span><LocationOnOutlined /> Service Available All Over Gujarat</span></InfoBox>
          </Box>
          <Box className="aura-section-heading">TRIP DETAILS</Box>
          <Box className={roundTrip ? "aura-route" : "aura-route aura-one-way"}>
            <RoutePoint icon={<FlightTakeoffOutlined />} label={form.pickup || "Pickup location"} />
            <span className="aura-route-line">•••••••••➜</span>
            <RoutePoint icon={<LocationOnOutlined />} label={roundTrip ? (form.destination || "Destination location") : (form.drop || "Drop location")} gold />
            {roundTrip && <><span className="aura-route-line">•••••••••➜</span><RoutePoint icon={<ApartmentOutlined />} label={form.drop || "Drop location"} /></>}
            <Box className="aura-trip-options"><label><Checkbox checked={!roundTrip} readOnly /> One-Way</label><label><Checkbox checked={roundTrip} readOnly /> Round-Trip</label></Box>
          </Box>
          <Box className="aura-fare-row"><Box className="aura-fare-wrap"><Box className="aura-section-heading">FARE BREAKDOWN <span>AMOUNT (₹)</span></Box><Box className="aura-fare-table"><Price label="Total Fare" value={money(totals.fare)} /><Price label="Discount" value={`- ${money(totals.discount)}`} className="aura-discount" /><Box className="aura-total"><strong>TOTAL PAYABLE</strong><strong>{money(totals.total)}</strong></Box><Box className="aura-words"><strong>Amount in Words:</strong><span>{amountInWords(totals.total)}</span></Box></Box></Box><Box className="aura-thanks-badge"><span>☆</span><strong>Thank You!</strong><small>FOR CHOOSING<br />US</small><b>★ ★ ★</b></Box></Box>
          <Box className="aura-bottom-grid"><Box className="aura-note-box"><Box className="aura-section-heading">NOTES</Box><p><CheckCircleOutlined /> Thank you for choosing Aura Men Cab Service.</p><p><CheckCircleOutlined /> We look forward to serving you again.</p><p><CheckCircleOutlined /> Drive Safe. Travel Safe.</p></Box><Box className="aura-note-box"><Box className="aura-section-heading">PAYMENT METHOD</Box><p className="aura-payment"><AccountBalanceWalletOutlined /> {form.paymentMode || "Cash"}</p><Divider /><small>Thank you for your payment!</small></Box></Box>
          <Box className="aura-footer"><span><PhoneOutlined /> {form.driverContact || "9525911804"}</span><span>SAFE JOURNEY<br />OUR PRIORITY</span><strong>COMFORT | SAFETY | TRUST<br />Your Journey, Our Commitment</strong></Box>
        </Paper>
      </Box>
    </Grid>
  );
}

function InfoBox({ title, icon, children }) { return <Box className="aura-info-box"><Box className="aura-box-title">{icon}{title}</Box><Stack spacing={0.55}>{children}</Stack></Box>; }
function RoutePoint({ icon, label, gold }) { return <Box className={gold ? "aura-route-point aura-gold" : "aura-route-point"}><span>{icon}</span><strong>{label}</strong></Box>; }
function Price({ label, value, className = "" }) { return <Box className={className}><span>{label}</span><span>{value}</span></Box>; }
