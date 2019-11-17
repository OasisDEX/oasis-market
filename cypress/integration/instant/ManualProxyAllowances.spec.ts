import {
  checkProxyAllowances,
  expectAllowanceStatusFor,
  expectAllowedTokensCount,
  setAllowanceOf
} from '../../pages/Allowance';
import * as Proxy from '../../pages/Proxy';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3, tid } from '../../utils';

const enum AllowanceStatus {
  ALLOWED = 'true',
  DISABLED = 'false'
}

describe('Proxy Allowance', () => {
  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
    Tab.instant();
    Proxy.settings().click();
    Proxy.create();
  });

  it('should not be set initially', () => {
    Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);
    expectAllowedTokensCount(0);
  });

  it('should set allowance to a single token', () =>   {
    Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);
    checkProxyAllowances();

    expectAllowanceStatusFor('WETH', AllowanceStatus.DISABLED);
    setAllowanceOf('WETH');
    expectAllowanceStatusFor('WETH', AllowanceStatus.ALLOWED);
  });

  it('should set allowance to two token at the same time', () => {
    Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);
    checkProxyAllowances();
    expectAllowanceStatusFor('WETH', AllowanceStatus.DISABLED);
    setAllowanceOf('WETH');

    expectAllowanceStatusFor('DAI', AllowanceStatus.DISABLED);
    setAllowanceOf('DAI');

    expectAllowanceStatusFor('WETH', AllowanceStatus.ALLOWED);
    expectAllowanceStatusFor('DAI', AllowanceStatus.ALLOWED);
  });

  it('should display allowance if one is set', () => {
    Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);
    checkProxyAllowances();

    expectAllowanceStatusFor('WETH', AllowanceStatus.DISABLED);
    setAllowanceOf('WETH');

    expectAllowanceStatusFor('WETH', AllowanceStatus.ALLOWED);

    cy.get(tid('close')).click();

    expectAllowedTokensCount(1);

    checkProxyAllowances();

    expectAllowanceStatusFor('WETH', AllowanceStatus.ALLOWED);
  });

  it('should disable already set allowance', () => {
    Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);
    checkProxyAllowances();

    expectAllowanceStatusFor('WETH', AllowanceStatus.DISABLED);

    setAllowanceOf('WETH');

    expectAllowanceStatusFor('WETH', AllowanceStatus.ALLOWED);

    setAllowanceOf('WETH');

    expectAllowanceStatusFor('WETH', AllowanceStatus.DISABLED);
  });

  it('should go to proxy setting page if proxy is deleted',  () => {
    Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);
    checkProxyAllowances();

    expectAllowanceStatusFor('WETH', AllowanceStatus.DISABLED);

    setAllowanceOf('WETH');

    expectAllowanceStatusFor('WETH', AllowanceStatus.ALLOWED);

    Proxy.clear();

    Proxy.hasStatus(Proxy.ProxyStatus.MISSING);
  });
});
