import { memo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalTaxiOutlined from "@mui/icons-material/LocalTaxiOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
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

function Dashboard({ reports, filters, setFilters, loadReports, loading }) {
  const daily = reports.daily || [];
  const weekly = reports.weekly || [];
  const monthly = reports.monthly || [];
  const hasData = (reports.invoiceCount || 0) > 0;

  const dailyStats = summarize(daily);
  const weeklyStats = summarize(weekly);
  const monthlyStats = summarize(monthly);

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
          caption="per trip, GST included"
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
    </>
  );
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
