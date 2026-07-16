import { css, unsafeCSS } from 'lit';

import { IMAGE } from '../const/imgconst';

const strImages = {
  tyreBg: `
		:host {
			--vic-tyre-bg-image: url(${IMAGE.BACK_TYRE});
		}`,
  loadingImg: `
		:host {
			--vic-loading-image: url(${IMAGE.LOADING});
		}`,
  cardBackground: `
		:host([dark-mode]) {
			--vic-card-bg-image: url(${IMAGE.BACK_WHITE});
		}
		:host(:not([dark-mode])) {
			--vic-card-bg-image: url(${IMAGE.BACK_DARK});
		}`,
};

export const imagesVars = {
  cardBackground: css`
    ${unsafeCSS(strImages.cardBackground)}
  `,
  tyreBg: css`
    ${unsafeCSS(strImages.tyreBg)}
  `,
  loadingImg: css`
    ${unsafeCSS(strImages.loadingImg)}
  `,
};
