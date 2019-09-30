import * as React from 'react';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import classnames from 'classnames';
import { Button, ButtonGroup } from '../../utils/forms/Buttons';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { WithLoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ServerUnreachable } from '../../utils/loadingIndicator/ServerUnreachable';
import { PanelHeader } from '../../utils/panel/Panel';
import { GroupMode, PriceChartDataPoint, } from './pricechart';
import { PriceChartView } from './PriceChartView';
import * as styles from './PriceChartWithLoading.scss';

interface PriceChartProps extends LoadableWithTradingPair<PriceChartDataPoint[]> {
  groupMode: GroupMode;
  groupMode$: BehaviorSubject<GroupMode>;
}

export class PriceChartWithLoading extends React.Component<PriceChartProps> {
  public handleKindChange = (groupMode: GroupMode) =>
    () => {
      this.props.groupMode$.next(groupMode);
    }

  public render() {
    return (
      <>
        <PanelHeader bordered={true}>
          Price chart
          <ButtonGroup style={{ marginLeft: 'auto' }}>
            {
              this.button('1M', 'byMonth')
            }
            {
              this.button('1W', 'byWeek')
            }
            {
              this.button('1D', 'byDay')
            }
            {
              this.button('1H', 'byHour')
            }
          </ButtonGroup>
        </PanelHeader>
        <WithLoadingIndicator
          error={<ServerUnreachable/>}
          size="lg"
          loadable={this.props}
        >
          {(points: PriceChartDataPoint[]) => (
            <PriceChartView data={points} groupMode={this.props.groupMode}/>
          )}
        </WithLoadingIndicator>
      </>
    );
  }

  private button = (label: string, groupMode: GroupMode) => (
    <Button
      color={this.props.groupMode === groupMode ? 'primary' : 'greyOutlined'}
      size="sm"
      className={classnames(styles.btn)}
      onClick={this.handleKindChange(groupMode)}
    >{label}</Button>
  )
}

export function createPriceChartLoadable$(
  groupMode$: Observable<GroupMode>,
  dataSources$: { [key in GroupMode]: Observable<LoadableWithTradingPair<PriceChartDataPoint[]>> }
): Observable<PriceChartProps> {
  return groupMode$.pipe(
    switchMap((groupMode: GroupMode) => dataSources$[groupMode].pipe(
      map(tradeHistory => ({
        ...tradeHistory,
        groupMode,
        groupMode$,
      } as PriceChartProps)),
    )),
  );
}
