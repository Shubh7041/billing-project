import { useId, useState } from "react";
import { Card, EmptyState } from "../../components/ui";
import {
  formatInr,
  salesTrendMock,
  type SalesPeriod,
  type SalesPoint,
} from "./dashboardMockData";

const chartWidth = 680;
const chartHeight = 252;
const chartPadding = { top: 16, right: 16, bottom: 38, left: 102 };

interface SalesTrendChartProps {
  points: SalesPoint[];
  period: SalesPeriod;
}

function SalesTrendChart({ points, period }: SalesTrendChartProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (points.length === 0) {
    return (
      <div className="dashboard-chart-empty">
        <EmptyState
          title="No sales for this period"
          description="Sales activity will appear here when there are records to show."
        />
      </div>
    );
  }

  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const maxAmount = Math.max(...points.map((point) => point.amount), 1);
  const gridAmounts = [maxAmount, maxAmount / 2, 0];
  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      chartPadding.left +
      (index * plotWidth) / Math.max(points.length - 1, 1),
    y:
      chartPadding.top +
      plotHeight -
      (point.amount / maxAmount) * plotHeight,
  }));
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const lastPoint = coordinates[coordinates.length - 1];
  const baseline = chartPadding.top + plotHeight;
  const areaPath = `${linePath} L ${lastPoint.x} ${baseline} L ${coordinates[0].x} ${baseline} Z`;

  return (
    <figure className="dashboard-chart-figure">
      <svg
        className="dashboard-sales-chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <title id={titleId}>
          Sales overview, last {period === "7d" ? "7 days" : "30 days"}
        </title>
        <desc id={descriptionId}>
          Sample sales totals by day or week, in Indian rupees.
        </desc>
        {gridAmounts.map((amount, index) => {
          const y = chartPadding.top + (index * plotHeight) / 2;
          return (
            <g key={`${amount}-${index}`}>
              <line
                x1={chartPadding.left}
                x2={chartWidth - chartPadding.right}
                y1={y}
                y2={y}
                className="dashboard-chart-gridline"
              />
              <text
                x={chartPadding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="dashboard-chart-axis-label"
              >
                {formatInr(amount)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} className="dashboard-chart-area" />
        <path d={linePath} className="dashboard-chart-line" />
        {coordinates.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              className="dashboard-chart-point"
            />
            <text
              x={point.x}
              y={chartHeight - 12}
              textAnchor="middle"
              className="dashboard-chart-axis-label"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="dashboard-chart-caption">
        Illustrative preview data · Not live sales
      </figcaption>
    </figure>
  );
}

export function SalesOverviewCard() {
  const [period, setPeriod] = useState<SalesPeriod>("7d");

  return (
    <Card
      className="dashboard-card dashboard-section-card"
      title="Sales overview"
      description="Sales totals for the selected reporting period"
      headerAction={
        <div className="dashboard-period-control">
          <label htmlFor="dashboard-sales-period">Reporting period</label>
          <select
            id="dashboard-sales-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as SalesPeriod)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      }
    >
      <SalesTrendChart points={salesTrendMock[period]} period={period} />
    </Card>
  );
}