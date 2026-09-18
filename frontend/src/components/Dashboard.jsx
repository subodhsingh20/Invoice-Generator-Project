import { memo, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalTaxiOutlined from "@mui/icons-material/LocalTaxiOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { Bar, Line } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import PageIntro from "./PageIntro.jsx";
import FilterBar from "./FilterBar.jsx";
import { money } from "../utils/format.js";

// chart.js only starts executing once this module is loaded, i.e. when the
// user opens the Dashboard tab. It never runs on the initial critical path.
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

// Compact Indian-rupee labels for chart axes (â‚¹1.2k, â‚¹3.4L).
const shortCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
const moneyShort = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `${shortCurrency.format(n / 1_00_000)}L`;
  if (abs >= 1_000) return `${shortCurrency.format(n / 1_000)}k`;
  return shortCurrency.format(Math.round(n));
};

// Shared tooltip style: dark card, headline value, and trip count per point.
const makeTooltip = (items) => ({
  backgroundColor: "#17313a",
  titleColor: "#ffffff",
  bodyColor: "#eaf4f1",
  borderColor: "#2a8aa8",
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  displayColors: false,
  titleFont: { weight: "700", size: 12 },
  bodyFont: { size: 12.5 },
  callbacks: {
    label: (context) => {
      const entry = items[context.dataIndex];
      const line = [`Earned ${money(context.parsed.y)}`];
      if (entry) {
        const trips = entry.trips || 0;
        line.push(`${trips} trip${trips === 1 ? "" : "s"}`);
      }
      return line;
    },
  },
});

const dayLabel = (period) =>
  new Date(`${period}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const weekLabel = (period) => String(period).replace(/^.*?-W(\d+)$/, "Wk $1");

const monthLabel = (period) => {
  const [year, month] = String(period).split("-").map(Number);
  const label = new Date(year, (month || 1) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
  });
  return year === new Date().getFullYear()
    ? label
    : `${label} ${String(year).slice(-2)}`;
};

const summarize = (items) =>
  items.reduce(
    (acc, item) => ({
      earnings: acc.earnings + (item.earnings || 0),
      trips: acc.trips + (item.trips || 0),
      days: acc.days + 1,
    }),
    { earnings: 0, trips: 0, days: 0 },
  );

function Dashboard({ reports, filters, setFilters, loadReports, earningHistory, loadEarningHistory, onNotice, loading }) {
  const [historyTab, setHistoryTab] = useState(0);
  const [page, setPage] = useState(0);
  const [details, setDetails] = useState(null);
  const daily = reports.daily || [];
  const weekly = reports.weekly || [];
  const monthly = reports.monthly || [];
  const hasData = (reports.invoiceCount || 0) > 0;

  const dailyStats = summarize(daily);
  const weeklyStats = summarize(weekly);
  const monthlyStats = summarize(monthly);
  const selectedYear = (earningHistory.yearly || []).find((item) => Number(item.year) === Number(filters.year));
  const historyItems = historyTab === 0 ? earningHistory.monthly || [] : earningHistory.yearly || [];
  const pageItems = historyItems.slice(page * 6, page * 6 + 6);
  const pageCount = Math.max(1, Math.ceil(historyItems.length / 6));

  const averageFare =
    (reports.invoiceCount || 0) > 0
      ? money(reports.totalCollected / reports.invoiceCount)
      : money(0);

  const dailyData = {
    labels: daily.map((item) => dayLabel(item.period)),
    datasets: [
      {
        label: "Earnings",
        data: daily.map((item) => item.earnings || 0),
        borderColor: "#176b87",
        borderWidth: 2.5,
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return "rgba(23,107,135,.14)";
          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          );
          gradient.addColorStop(0, "rgba(23,107,135,.25)");
          gradient.addColorStop(1, "rgba(23,107,135,.02)");
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#176b87",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const weeklyData = {
    labels: weekly.map((item) => weekLabel(item.period)),
    datasets: [
      {
        label: "Earnings",
        data: weekly.map((item) => item.earnings || 0),
        borderColor: "#176b87",
        borderWidth: 2.5,
        backgroundColor: "rgba(23,107,135,.10)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#176b87",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const monthlyData = {
    labels: monthly.map((item) => monthLabel(item.period)),
    datasets: [
      {
        label: "Earnings",
        data: monthly.map((item) => item.earnings || 0),
        backgroundColor: "#d97745",
        hoverBackgroundColor: "#c9683a",
        borderRadius: 6,
        maxBarThickness: 36,
      },
    ],
  };

  const axisDefaults = {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: "#455a64",
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8,
        font: { size: 11 },
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "rgba(23,107,135,.08)" },
      ticks: {
        color: "#455a64",
        maxTicksLimit: 5,
        callback: (value) => moneyShort(value),
        font: { size: 11 },
      },
    },
  };

  const chartOptions = (items) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: makeTooltip(items) },
    scales: axisDefaults,
  });
  return (
    <>
      <PageIntro
        eyebrow="PERFORMANCE"
        step="03"
        title="Earnings dashboard"
        copy="Track trips and earnings across the selected period."
        compact
      />
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onRefresh={loadReports}
        loading={loading}
      />
      <Grid container spacing={2} className="earning-summary-grid">
        <SummaryCard icon={CalendarMonthOutlined} label={`${months[Number(filters.month) - 1] || "Month"} summary`} value={`${monthlyStats.trips} rides`} detail={`${money(monthlyStats.earnings)} total`} />
        <SummaryCard icon={BarChartOutlined} label={`${filters.year || "Year"} summary`} value={`${selectedYear?.totalRides || 0} rides`} detail={`${money(selectedYear?.totalEarnings)} total`} />
      </Grid>
      <Grid container spacing={2} className="metric-grid">
        <Metric
          icon={LocalTaxiOutlined}
          label="Total trips"
          value={reports.invoiceCount ?? 0}
          caption={hasData ? "trips in this period" : "no trips recorded yet"}
        />
        <Metric
          icon={PaymentsOutlined}
          label="Total earnings"
          value={money(reports.totalCollected)}
          caption="net amount collected"
        />
        <Metric
          icon={AccountBalanceWalletOutlined}
          label="Average fare"
          value={averageFare}
          caption="per trip"
        />
      </Grid>

      <Grid container spacing={3} className="charts-grid">
        <Grid size={12}>
          <Paper className="chart-panel" elevation={0}>
            <ChartHeader
              title="Daily earnings"
              summary={
                <>
                  <strong>{money(dailyStats.earnings)}</strong> total
                  <span className="sep">|</span>
                  <strong>
                    {moneyShort(
                      dailyStats.days ? dailyStats.earnings / dailyStats.days : 0,
                    )}
                  </strong>
                  /day avg
                  <span className="sep">|</span>
                  <strong>{dailyStats.trips}</strong> trips
                </>
              }
            />
            <Box className="chart-box chart-box-lg">
              {loading ? (
                <Skeleton variant="rounded" width="100%" height="100%" />
              ) : daily.length ? (
                <Line data={dailyData} options={chartOptions(daily)} />
              ) : (
                <EmptyChart message="No daily earnings yet. Save a bill to see it here." />
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper className="chart-panel" elevation={0}>
            <ChartHeader
              title="Weekly earnings"
              summary={
                <>
                  <strong>{money(weeklyStats.earnings)}</strong> total
                  <span className="sep">|</span>
                  <strong>{weeklyStats.trips}</strong> trips
                </>
              }
            />
            <Box className="chart-box">
              {loading ? (
                <Skeleton variant="rounded" width="100%" height="100%" />
              ) : weekly.length ? (
                <Line data={weeklyData} options={chartOptions(weekly)} />
              ) : (
                <EmptyChart message="No weekly earnings yet." />
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper className="chart-panel" elevation={0}>
            <ChartHeader
              title="Monthly earnings"
              summary={
                <>
                  <strong>{money(monthlyStats.earnings)}</strong> total
                  <span className="sep">|</span>
                  <strong>{monthlyStats.trips}</strong> trips
                </>
              }
            />
            <Box className="chart-box">
              {loading ? (
                <Skeleton variant="rounded" width="100%" height="100%" />
              ) : monthly.length ? (
                <Bar data={monthlyData} options={chartOptions(monthly)} />
              ) : (
                <EmptyChart message="No monthly earnings yet." />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      <EarningHistory
        tab={historyTab}
        setTab={(nextTab) => { setHistoryTab(nextTab); setPage(0); }}
        items={pageItems}
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        onDetails={setDetails}
        onExport={(format) => exportHistory(format, historyItems, historyTab, onNotice)}
        onRefresh={loadEarningHistory}
      />
      <DetailsDialog details={details} onClose={() => setDetails(null)} />
    </>
  );
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function SummaryCard({ icon: Icon, label, value, detail }) {
  return <Grid size={{ xs: 12, md: 6 }}><Paper className="earning-summary-card" elevation={0}><Box className="earning-summary-heading"><Typography className="metric-label">{label}</Typography><Icon /></Box><Typography className="earning-summary-value">{value}</Typography><Typography className="metric-caption">{detail}</Typography></Paper></Grid>;
}

function EarningHistory({ tab, setTab, items, page, pageCount, setPage, onDetails, onExport, onRefresh }) {
  return <Paper className="history-panel" elevation={0}>
    <Box className="history-heading"><Box><Typography component="h2" className="panel-title">Earning History</Typography><Typography className="panel-subtitle">Your permanent monthly and yearly earning record.</Typography></Box><Button size="small" onClick={onRefresh}>Refresh</Button></Box>
    <Tabs value={tab} onChange={(_, value) => setTab(value)} className="history-tabs" aria-label="Earning history view">
      <Tab icon={<CalendarMonthOutlined />} iconPosition="start" label="Monthly History" />
      <Tab icon={<BarChartOutlined />} iconPosition="start" label="Yearly History" />
    </Tabs>
    <Box className="history-actions"><Button size="small" startIcon={<DownloadOutlined />} onClick={() => onExport("csv")}>CSV</Button><Button size="small" startIcon={<DownloadOutlined />} onClick={() => onExport("pdf")}>PDF</Button></Box>
    <Box className="history-list">{items.length ? items.map((item) => <Box className="history-row" key={`${item.year}-${item.month || "year"}`}><Box><Typography className="history-period">{item.month ? `${item.month} ${item.year}` : item.year}</Typography><Typography className="metric-caption">{item.totalRides || 0} rides</Typography></Box><Typography className="history-total">{money(item.totalEarnings)}</Typography><Button size="small" variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => onDetails(item)}>View Details</Button></Box>) : <Box className="empty-state">No earning history has been archived yet.</Box>}</Box>
    {pageCount > 1 && <Box className="history-pagination"><Button disabled={!page} onClick={() => setPage(page - 1)}>Previous</Button><Typography className="metric-caption">Page {page + 1} of {pageCount}</Typography><Button disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Next</Button></Box>}
  </Paper>;
}

function DetailsDialog({ details, onClose }) {
  if (!details) return null;
  const methods = details.paymentMethods && Object.entries(details.paymentMethods);
  return <Dialog open onClose={onClose} fullWidth maxWidth="xs"><DialogTitle>{details.month ? `${details.month} ${details.year}` : `${details.year} earnings`}<IconButton aria-label="Close" onClick={onClose} sx={{ float: "right" }}><CloseOutlined /></IconButton></DialogTitle><DialogContent><Box className="details-grid"><Detail label="Rides" value={details.totalRides || 0} /><Detail label="Average fare" value={money(details.averageFare || (details.totalRides ? details.totalEarnings / details.totalRides : 0))} /><Detail label="Total earnings" value={money(details.totalEarnings)} /></Box><Typography className="details-label">Payment methods</Typography>{methods?.length ? methods.map(([method, count]) => <Box className="details-method" key={method}><span>{method}</span><strong>{count} rides</strong></Box>) : <Typography className="metric-caption">Payment method detail is available as invoices are archived.</Typography>}</DialogContent></Dialog>;
}

function Detail({ label, value }) { return <Box><Typography className="details-label">{label}</Typography><Typography className="details-value">{value}</Typography></Box>; }

async function exportHistory(format, items, tab, onNotice) {
  if (!items.length) return onNotice("There is no earning history to export.");
  const headers = tab === 0 ? ["Month", "Year", "Rides", "Total earnings"] : ["Year", "Rides", "Total earnings"];
  const rows = items.map((item) => tab === 0 ? [item.month, item.year, item.totalRides, item.totalEarnings] : [item.year, item.totalRides, item.totalEarnings]);
  if (format === "csv") {
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "earning-history.csv"; link.click(); URL.revokeObjectURL(link.href); onNotice("CSV exported successfully"); return;
  }
  const { jsPDF } = await import("jspdf"); const pdf = new jsPDF(); pdf.setFontSize(16); pdf.text("Aura Men Earning History", 14, 18); pdf.setFontSize(10); rows.forEach((row, index) => pdf.text(row.join(" | "), 14, 30 + index * 7)); pdf.save("earning-history.pdf"); onNotice("PDF exported successfully");
}

function ChartHeader({ title, summary }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "4px 16px",
      }}
    >
      <Typography component="h2" className="panel-title">
        {title}
      </Typography>
      <Typography component="span" className="chart-summary">
        {summary}
      </Typography>
    </Box>
  );
}

const EmptyChart = memo(function EmptyChart({ message }) {
  return (
    <Box className="chart-empty">
      <Box>
        <Box sx={{ fontSize: "30px", mb: 0.5 }}>Chart</Box>
        {message}
      </Box>
    </Box>
  );
});

const Metric = memo(function Metric({ icon: Icon, label, value, caption }) {
  return (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Paper className="metric-card" elevation={0}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography className="metric-label">{label}</Typography>
          {Icon && <Icon sx={{ color: "#b9d6d0", fontSize: 26 }} />}
        </Box>
        <Typography className="metric-value">{value}</Typography>
        {caption && <Typography className="metric-caption">{caption}</Typography>}
      </Paper>
    </Grid>
  );
});

export default memo(Dashboard);
