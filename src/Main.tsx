import createBrowserHistory from 'history/createBrowserHistory';
import * as React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { isMarketClosed } from './blockchain/config';

import * as mixpanel from 'mixpanel-browser';
import { map } from 'rxjs/operators';
import { setupAppContext, theAppContext } from './AppContext';
import { BalancesView } from './balances/BalancesView';
import { WalletStatus, walletStatus$ } from './blockchain/wallet';
import { ExchangeViewTxRx } from './exchange/ExchangeView';
import { HeaderTxRx } from './header/Header';
import * as styles from './index.scss';
import { InstantExchange } from './instant/InstantViewPanel';
import { Banner } from './landingPage/Banner';
import { connect } from './utils/connect';

const browserHistoryInstance = createBrowserHistory({
  basename: process.env.REACT_APP_SUBDIR ? process.env.REACT_APP_SUBDIR : '/'
});

browserHistoryInstance.listen(location => {
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
        {
          isMarketClosed
          ? <Banner content={
              <span>
                {/*tslint:disable*/}
                This version of the UI uses an OasisDEX contract which expired on February 8, 2020 12:00pm UTC.
                <br/>
                <strong> You should cancel any open orders you have and move your liquidity to the new contract.<br/>
                You can find the latest contract and markets at { ' ' }
                <a 
                  href="https://oasis.app/trade"
                  rel="noopener noreferrer"
                >Oasis.app/trade</a>.</strong>
              </span>
            }
            theme='warning'/>
          : <Banner content={
              <span>
                {/*tslint:disable*/}
                The current OasisDEX contract used by Oasis Trade expired on February 8, 2020 and replaced with a new contract. 
                <br/>
                <strong> Please see { ' ' }
                  <a href="https://www.reddit.com/r/MakerDAO/comments/euplem/oasisdex_contract_will_be_upgraded_on_8th_feb_2020/" 
                     target="_blank"
                     rel="noopener noreferrer"
                  >
                    this announcement
                  </a> 
                  { ' ' }
                  for more details
                </strong>
                </span>
              }
            theme='warning'/>
        }
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
