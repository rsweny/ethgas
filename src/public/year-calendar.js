class YearCalendar extends HTMLElement {

  constructor() {
    super();
    this.year = 2020;
  }
  static get observedAttributes() {
    return ['year'];
  }
  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>

        .blend { opacity: 60% }

        .month-header {
          flex: 1 1 3.225%;
          width: 3.225%;
          min-width: 24px;
          text-align: left;
          line-height: 1.5rem;
          height: 1.5rem;
        }

        .year-entry {
          flex: 0 1 3.1%;
          min-width: 24px;
          text-align: center;
          color: white;
          line-height: 1.5rem;
          height: 1.5rem;
          cursor: pointer;
          font-size: 10px;
        }

        .year-entry:hover { opacity: 60% }

        .day-entry {
          overflow: hidden;
          box-sizing: border-box;
          flex: 1 0 0px;
          height: 1.5rem;
          line-height: 1.5rem;
          text-align: start;
          padding-left: 12px;
          text-shadow: 1px 1px 1px #333, 0 0 6px #000;
        }
      </style>

      <div style="display: flex; padding-bottom: 12px">
        <div style="flex: 1 1 90%">
          <div>
            <h2 style="margin-top: 45px">Price History ${this.year}</h2>
            <div id="yearData${this.year}"></div>
          </div>
        </div>
        <div id="dayPanel${this.year}" style="flex: 1 1 10%; opacity: 0">
          <div>
            <h2 style="margin-top: 45px">Hourly</h2>
            <div style="">
              <div id="dateHoursHeader${this.year}" style="display: flex; flex-direction: column; text-align: right" />
            </div>
            <div id="dayData${this.year}" style="display: flex; flex-direction: column; width: 100%" />
          </div>
        </div>
      </div>
    `;
  }
}