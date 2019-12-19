import { tid, timeout } from '../utils';
import { Finalization } from './Finalization';

const input = (side: 'sellInput' | 'buyInput') => ({

  amount: (amount: string) => {
    cy.get(`@${side}`).type(amount);
  },

  clear: () => {
    cy.get(`@${side}`).type('{selectall}{backspace}');
  },

  type: (value: string) => {
    cy.get(`@${side}`).type(value);
  }

});

export enum TradingSide {
  BUY = 'buy',
  SELL = 'sell'
}

export  const instantForm = () => cy.get(tid('instant-form'));

export class Trade {

  public static swapTokens = () => cy.get(tid('swap')).click();

  public static shouldHaveSwapDisabled = () => cy.get(tid('swap')).should('be.disabled');

  public static openAssetSelectorFor = (side: TradingSide) => {
    if (side === TradingSide.BUY) {
      cy.get(tid('buying-token', tid('balance')))
        .click();
    } else {
      cy.get(tid('selling-token', tid('balance')))
        .click();
    }
  }

  public static expectAssetLocked = (asset: string) => {
    cy.get(tid(asset.toLowerCase(), tid('asset-button'))).should('be.disabled');
  }

  public expectPriceImpact = (priceImpact: string | RegExp, aboveThreshold: boolean) => {
    cy.get(tid('trade-price-impact', tid('value')))
      .contains(`${priceImpact}`);

    if (aboveThreshold) {
      cy.get(tid('trade-price-impact', tid('value', 'span'))).should('have.class', 'danger');
    }
  }

  public expectReceiveToken = (token: string | RegExp) => {
    cy.get(tid('buying-token', tid('currency')))
      .contains(`${token}`);
  }

  public expectToReceive = (amount: string | RegExp) => {
    cy.get(tid('buying-token', tid('amount')))
      .should('have.value', `${amount}`);
  }

  public expectPayToken = (token: string) => {
    cy.get(tid('selling-token', tid('currency')))
      .contains(`${token}`);
  }

  public expectToPay = (amount: string | RegExp) => {
    cy.get(tid('selling-token', tid('amount')))
      .should('have.value', `${amount}`);
  }

  public sell = (token: string = '') => {
    if (token) {
      cy.get(tid('selling-token', tid('balance')), timeout(2000))
        .click();

      cy.get(tid(token.toLowerCase()), timeout(2000))
        .click();
    }

    cy.get(tid('selling-token', tid('amount')), timeout(2000)).as('sellInput');

    return input('sellInput');
  }

  public buy = (token: string = '') => {
    if (token) {
      cy.get(tid('buying-token', tid('balance')), timeout(2000))
        .click();

      cy.get(tid(token.toLowerCase()), timeout(2000))
        .click();
    }

    cy.get(tid('buying-token', tid('amount')), timeout(2000)).as('buyInput');

    return input('buyInput');
  }

  public execute = () => {
    cy.get(tid('initiate-trade')).click();
    return new Finalization();
  }

  public resultsInError = (error: string | RegExp, position: 'bottom' | 'top') => {
    cy.get(tid(`${position}-error`)).contains(error);
  }
}
