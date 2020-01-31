import { isEqual } from 'lodash';
import 'normalize.css';
import * as Raven from 'raven-js';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, startWith, switchMap, tap } from 'rxjs/internal/operators';
import { map } from 'rxjs/operators';
import { mixpanelInit } from './analytics';
import { networks } from './blockchain/config';
import { account$, networkId$ } from './blockchain/network';
import { Web3Status, web3Status$ } from './blockchain/web3';
import { LoadingState } from './landingPage/LandingPage';
import { Main } from './Main';
import { NavigationTxRx } from './Navigation';
import { connect } from './utils/connect';
import { UnreachableCaseError } from './utils/UnreachableCaseError';

interface Props {
  status: Web3Status;
  network?: string;
  tosAccepted?: boolean;
  hasSeenAnnouncement?: boolean;
}

mixpanelInit();

class App extends React.Component<Props> {

  public render() {
    switch (this.props.status) {
      case 'initializing':
        return LoadingState.INITIALIZATION;
      case 'missing':
        return LoadingState.MISSING_PROVIDER;
      case 'ready':
      case 'readonly':
        if (this.props.network !== undefined && !networks[this.props.network]) {
          return LoadingState.UNSUPPORTED;
        }
        return <Main/>
      default:
        throw new UnreachableCaseError(this.props.status);
    }
  }
}

const web3StatusResolve$: Observable<Props> = web3Status$.pipe(
  switchMap(status =>
    status === 'ready' || status === 'readonly' ?
      combineLatest(networkId$, account$).pipe(
        tap(([network, account]) =>
          console.log(`status: ${status}, network: ${network}, account: ${account}`)),
        map(([network, _account]) => ({ status, network })),
      ) : of({ status })
  ),
  startWith({ status: 'initializing' as Web3Status })
);

const props$: Observable<Props> = web3StatusResolve$.pipe(
  map((web3Status) => {
    return {
      ...web3Status
    } as Props;
  }),
  distinctUntilChanged(isEqual)
);

const AppTxRx = connect(App, props$);

const root: HTMLElement = document.getElementById('root')!;

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DNS) {
  Raven.config(
    process.env.REACT_APP_SENTRY_DNS
  ).install();
  Raven.context(() => ReactDOM.render(<AppTxRx/>, root));
} else {
  ReactDOM.render(<AppTxRx/>, root);
}
