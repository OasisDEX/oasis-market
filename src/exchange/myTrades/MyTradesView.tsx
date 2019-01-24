import classnames from 'classnames';
import * as React from 'react';

import { BigNumber } from 'bignumber.js';
import { etherscan } from '../../blockchain/etherscan';
import { formatDateTime } from '../../utils/formatters/format';
import { FormatAmount, FormatPrice } from '../../utils/formatters/Formatters';
import { CloseButton } from '../../utils/forms/Buttons';
import { Select } from '../../utils/forms/Select';
import { ProgressIcon } from '../../utils/icons/Icons';
import { WithLoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { PanelHeader } from '../../utils/panel/Panel';
import { RowClickable, Table } from '../../utils/table/Table';
import { InfoLabel, Muted, SellBuySpan } from '../../utils/text/Text';
import { Trade } from '../trades';
import { MyTradesKind, MyTradesKindKeys, MyTradesPropsLoadable } from './myTrades';
import * as styles from './MyTradesView.scss';
import { TradeWithStatus } from './openTrades';

export class MyTrades extends React.Component<MyTradesPropsLoadable> {
  public render() {
    return (
      <div className={styles.container}>
        <PanelHeader>
          <span>My Trades</span>
          <Select onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  this.props.changeKind(event.target.value as MyTradesKindKeys)}
                  style={{ marginLeft: 'auto' }}
                  value={this.props.kind}>
            <option value={MyTradesKind.open}>Open</option>
            <option value={MyTradesKind.closed}>Closed</option>
          </Select>
        </PanelHeader>

        <WithLoadingIndicator loadable={this.props}>
          { (trades: TradeWithStatus[]) => (
            <Table
              scrollable={true}
              align="left"
              className={classnames(styles.myTradesTable, {
                [styles.myOpenTradesTable]: this.props.kind === MyTradesKind.open,
                [styles.myCloseTradesTable]: this.props.kind === MyTradesKind.closed,
              })}>
            <thead>
              <tr>
                <th>Type</th>
                <th className={styles.right}>
                  <InfoLabel>Price</InfoLabel> {this.props.tradingPair.quote}
                </th>
                <th className={styles.right}>
                  <InfoLabel>Amount</InfoLabel> {this.props.tradingPair.base}
                </th>
                <th className={styles.right}>
                  <InfoLabel>Total</InfoLabel> {this.props.tradingPair.quote}
                </th>
                <th className={styles.right}>Time</th>
                { this.props.kind === MyTradesKind.open &&
                  <th className={styles.right}>Status</th>
                }
              </tr>
            </thead>
            <tbody>
              {trades
                  .map((trade: TradeWithStatus, i: number) => {
                    return (
                  <RowClickable
                    data-test-id="my-trades"
                    key={i}
                    clickable={this.props.kind === MyTradesKind.closed}
                    onClick={this.showInEtherscan(trade)}
                  >
                    <td data-test-id="type">
                      <SellBuySpan type={trade.act}>{trade.act}</SellBuySpan>
                    </td>
                    <td data-test-id="price" className={styles.right}>
                      <FormatPrice value={trade.price} token={trade.quoteToken} />
                    </td>
                    <td data-test-id="amount" className={styles.right}>
                      <FormatAmount value={trade.baseAmount} token={trade.baseToken} />
                    </td>
                    <td data-test-id="total" className={styles.right}>
                      <FormatAmount value={trade.quoteAmount} token={trade.quoteToken} />
                    </td>
                    <td className={styles.right}>
                      <Muted>{formatDateTime(trade.time)}</Muted>
                    </td>
                    { this.props.kind === MyTradesKind.open &&
                        trade.status === undefined &&
                      <td className={styles.right}>
                        <span className={styles.statusText}>
                          Open
                        </span>
                        <CloseButton data-test-id="cancel"
                                     onClick={this.cancelOffer(trade.offerId)}
                        />
                      </td>
                    }
                    { this.props.kind === MyTradesKind.open &&
                        trade.status !== undefined &&
                      <td className={styles.right}>
                        <span className={styles.statusText}>
                          pending
                        </span>
                        <ProgressIcon className={styles.statusProgress}/>
                      </td>
                    }
                  </RowClickable>
                    );
                  })}
            </tbody>
          </Table>
        )}
        </WithLoadingIndicator>
      </div>
    );
  }

  public cancelOffer = (offerId: BigNumber) => {
    return (): void => {
      this.props.cancelOffer({ offerId });
    };
  }

  public showInEtherscan = (trade: Trade) => {
    return (): void => {
      etherscan(this.props.etherscan).transaction(trade.tx as string).open();
    };
  }
}