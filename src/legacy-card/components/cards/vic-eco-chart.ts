// Third-party Libraries
import ApexCharts from 'apexcharts';
import { LitElement, html, TemplateResult, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { ecoChartModel } from '../../../types';

@customElement('eco-chart')
export class EcoChart extends LitElement {
  @property({ attribute: false }) private ecoChartData!: ecoChartModel;
  @state() private chart: ApexCharts | undefined;

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyChart();
  }

  private _destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }
  protected async firstUpdated(changedProps: PropertyValues): Promise<void> {
    super.firstUpdated(changedProps);
    this.initChart();
  }

  private initChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    const seriesArr = this.ecoChartData.chartData.map((item) => item.series);
    const labelsArr = this.ecoChartData.chartData.map((item) => item.labels);
    const bonusRange = this.ecoChartData.bonusRange;

    const chartElement = this.shadowRoot?.getElementById('chart');
    if (chartElement) {
      this.chart = new ApexCharts(chartElement, {
        series: seriesArr,
        chart: {
          height: 400,
          type: 'radialBar',
        },
        plotOptions: {
          radialBar: {
            offsetY: 0,
            offsetX: 0,
            startAngle: 0,
            endAngle: 270,
            hollow: {
              margin: 5,
              size: '35%',
              background: 'transparent',
              image: undefined,
            },
            dataLabels: {
              textAnchor: 'middle',
              distributed: false,
              name: {
                show: true,
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 'bold',
              },
              total: {
                show: true,
                label: bonusRange.label,
                formatter: () => {
                  return bonusRange.value;
                },
              },
            },
            barLabels: {
              enabled: true,
              useSeriesColors: true,
              offsetX: -20,
              fontSize: '16px',
              formatter: (seriesName: string, opts: any) => {
                return `${seriesName}:  ${opts.w.globals.series[opts.seriesIndex]}`;
              },
            },
          },
        },
        stroke: {
          lineCap: 'round',
          curve: 'smooth',
          width: 1,
        },
        colors: ['#1ab7ea', '#0084ff', '#39539E'],
        labels: labelsArr,
        responsive: [
          {
            breakpoint: 480,
            options: {
              legend: {
                show: false,
              },
            },
          },
        ],
      });
      this.chart.render();
    }
  }

  protected render(): TemplateResult {
    return html`<div id="chart"></div>`;
  }

  static styles = css`
    #chart {
      position: relative;
      width: 100%;
      max-height: 400px;
    }
    .apexcharts-datalabels-group .apexcharts-text {
      fill: var(--primary-text-color);
    }
    .apexcharts-radialbar-track > path {
      stroke: var(--secondary-text-color);
      opacity: 0.2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'eco-chart': EcoChart;
  }
}
