import * as React from 'react';

import borrowSvg from './icons/navigation/borrow.svg';
import saveSvg from './icons/navigation/save.svg';
import tradeSvg from './icons/navigation/trade.svg';
import * as styles from './Navigation.scss';
import { SvgImage } from './utils/icons/utils';

export const Navigation = ({ children }: any) => {
  return (
    <div className={styles.container}>
      <div className={styles.horizontal}><HorizontalNav /></div>
      <div className={styles.vertical}><VerticalNav /></div>
      <div>{children}</div>
    </div>
  );
};

export const VerticalNav = () => {
  return (
    <div className={styles.verticalContent}>
      <a href="/save">
        <SvgImage image={saveSvg} />
        Save
      </a>
      <a href="/borrow">
        <SvgImage image={borrowSvg} />
        Borrow
      </a>
      <a className={styles.activeItem}>
        <SvgImage image={tradeSvg} />
        Trade
      </a>
    </div>
  );
};

export const HorizontalNav = () => {
  return (
    <div className={styles.horizontalContent}>
      <a href="/save">
        <SvgImage image={saveSvg} />
        Save
      </a>
      <a href="/borrow">
        <SvgImage image={borrowSvg} />
        Borrow
      </a>
      <a className={styles.activeItem}>
        <SvgImage image={tradeSvg} />
        Trade
      </a>
    </div>
  );
};
