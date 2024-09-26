import { LitElement, html, TemplateResult, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { EcoData } from '../types';
import { localize } from '../localize/localize';
// Third-party Libraries
import ApexCharts from 'apexcharts';

@customElement('eco-chart')
export class EcoChart extends LitElement {
  @property({ type: Object }) private ecoData!: EcoData;
  @state() private selectedLanguage!: string;

  @state() private chart: ApexCharts | undefined;

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this.selectedLanguage, search, replace);
  };

  private get options() {
    return {
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
              label: this.localize('card.ecoCard.ecoScoreBonusRange'),
              formatter: () => {
                return `${this.ecoData.bonusRange || 0} km`;
              },
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
        this.localize('card.ecoCard.ecoScoreAcceleraion'),
        this.localize('card.ecoCard.ecoScoreConstant'),
        this.localize('card.ecoCard.ecoScoreFreeWheel'),
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
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    this.updateComplete.then(() => {
      if (!this.chart) {
        this.chart = new ApexCharts(this.shadowRoot?.getElementById('chart'), this.options);
        this.chart.render();
      } else {
        this.updateChart();
      }
    });
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
        labels: [
          this.localize('card.ecoCard.ecoScoreAcceleraion'),
          this.localize('card.ecoCard.ecoScoreConstant'),
          this.localize('card.ecoCard.ecoScoreFreeWheel'),
        ],
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
      height: 100%;
      margin: 0;
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
