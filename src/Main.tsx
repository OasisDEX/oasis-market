import createBrowserHistory from 'history/createBrowserHistory';
import * as React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import * as mixpanel from 'mixpanel-browser';
import { map } from 'rxjs/operators';
import { setupAppContext, theAppContext } from './AppContext';
import { BalancesView } from './balances/BalancesView';
import { WalletStatus, walletStatus$ } from './blockchain/wallet';
import { ExchangeViewTxRx } from './exchange/ExchangeView';
import { HeaderTxRx } from './header/Header';
import * as styles from './index.scss';
import { InstantExchange } from './instant/InstantViewPanel';
import { connect } from './utils/connect';

const browserHistoryInstance = createBrowserHistory({
  basename: process.env.REACT_APP_SUBDIR ? process.env.REACT_APP_SUBDIR : '/'
});

browserHistoryInstance.listen(location => {
  console.debug(`[Analytics] Tracked: ${location.pathname}`);
  mixpanel.track('Pageview', {
    product: 'oasis-trade',
    id: location.pathname
  });
});

export class Main extends React.Component {
  public render() {
    return (
      <theAppContext.Provider value={setupAppContext()}>
        <Router history={browserHistoryInstance}>
          <MainContentWithRouter/>
        </Router>
      </theAppContext.Provider>
    );
  }
}

interface RouterProps extends RouteComponentProps<any> {
}

export class MainContent extends React.Component<RouterProps> {
  public render() {
    return (
      <routerContext.Provider value={{ rootUrl: this.props.match.url }}>
        <div className={styles.container}>
          <theAppContext.Consumer>
            {({ TransactionNotifierTxRx }) =>
              <TransactionNotifierTxRx/>
            }
          </theAppContext.Consumer>
          <HeaderTxRx/>
          <RoutesRx/>
          <theAppContext.Consumer>
            {({ TheFooterTxRx }) =>
              <TheFooterTxRx/>
            }
          </theAppContext.Consumer>
        </div>
      </routerContext.Provider>
    );
  }
}

class Routes extends React.Component<{ status: WalletStatus }> {
  public render() {
    return (
      <Switch>
        <Route exact={false} path={'/market'} component={ExchangeViewTxRx}/>
        {process.env.REACT_APP_INSTANT_ENABLED === '1' &&
        <Route exact={false} path={'/instant'} component={InstantExchange}/>}
        {
          this.props.status === 'connected' &&
          <Route path={'/account'} component={BalancesView}/>
        }
        <Redirect from={'/balances'} to={'/account'}/>
        <Redirect from={'/'} to={'/market'}/>
      </Switch>
    );
  }
}

const RoutesRx = connect(Routes, walletStatus$
  .pipe(
    map(status => ({
      status
    }))
  ));

const MainContentWithRouter = withRouter(MainContent);

interface RouterContext {
  rootUrl: string;
}

export const routerContext = React.createContext<RouterContext>({ rootUrl: '/' });
