import { LitElement, html, TemplateResult, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { EcoData } from '../types';
import { localize } from '../localize/localize';
// Third-party Libraries
import ApexCharts from 'apexcharts';

@customElement('eco-chart')
export class EcoChart extends LitElement {
  @property({ type: Object }) ecoData!: EcoData;

  @state() private chart: ApexCharts | undefined;

  private options = {
    series: [0, 0, 0], // Dummy data to initialize the chart
    chart: {
      height: 350,
      width: 350,
      type: 'radialBar',
    },
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: 0,
        endAngle: 270,
        hollow: {
          margin: 5,
          size: '40%',
          background: '#ffffff',
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
            fontSize: '24px',
            fontWeight: 'bold',
          },
          total: {
            show: true,
            label: localize('ecoCard.ecoScoreBonusRange'),
            formatter: () => {
              return `${this.ecoData.bonusRange || 0} km`;
            },
            offsetX: 50,
            offsetY: 10,
          },
        },
        barLabels: {
          enabled: true,
          useSeriesColors: true,
          margin: 8,
          fontSize: '16px',
          formatter: (seriesName: string, opts: any) => {
            return `${seriesName}:  ${opts.w.globals.series[opts.seriesIndex]}`;
          },
        },
      },
    },
    colors: ['#1ab7ea', '#0084ff', '#39539E'],
    labels: [
      localize('ecoCard.ecoScoreAcceleraion'),
      localize('ecoCard.ecoScoreConstant'),
      localize('ecoCard.ecoScoreFreeWheel'),
    ],
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
  };

  protected firstUpdated() {
    this.chart = new ApexCharts(this.shadowRoot?.getElementById('chart'), this.options);
    this.chart.render();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('ecoData')) {
      this.updateChart();
    }
  }

  private updateChart() {
    if (this.chart) {
      this.chart.updateOptions({
        series: [this.ecoData.acceleration, this.ecoData.constant, this.ecoData.freeWheel],
        plotOptions: {
          radialBar: {
            dataLabels: {
              total: {
                formatter: () => {
                  return `${this.ecoData.bonusRange || 0} km`;
                },
              },
            },
          },
        },
      });
    }
  }

  protected render(): TemplateResult {
    return html`<div id="chart"></div>`;
  }

  static styles = css`
    #chart {
      display: flex;
      justify-content: center;
      position: relative;
      width: 100%;
      max-height: 350px;
      margin: 0;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Oxygen,
        Ubuntu,
        Cantarell,
        'Open Sans',
        'Helvetica Neue',
        sans-serif !important;
    }
    .apexcharts-datalabels-group .apexcharts-text {
      font-size: 1.2rem;
      fill: var(--primary-text-color);
    }
    .apexcharts-radialbar-track > path {
      stroke: var(--divider-color);
    }
    .apexcharts-radialbar-hollow {
      fill: var(--ha-card-background, var(--card-background-color, #fff));
    }
  `;
}
