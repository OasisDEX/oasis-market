import { tid } from '../utils';
import { Summary } from './Summary';

export class Finalization {
  public currentTx: string = '';

  public shouldHavePriceImpactWarning = () => {
    cy.get(tid('price-impact-text'))
      .contains(/Order has a significant .../);

    return this;
  }

  public acceptPriceImpact = () => {
    cy.get(tid('proceed-with-order')).click();
    return this;
  }

  public dismissPriceImpact = () => {
    cy.get(tid('dismiss-warning')).click();
    return this;
  }

  public shouldCreateProxy = () => {
    this.currentTx = 'proxyTx';

    cy.get(tid('create-proxy'))
      .as(this.currentTx)
      .contains('Create Account');

    return this;
  }

  public shouldNotCreateProxy = () => {
    cy.get(tid('create-proxy'))
      .should('not.exist');
    return this;
  }

  public shouldSetAllowanceFor = (token: string) => {
    this.currentTx = 'allowanceTx';

    cy.get(tid('set-token-allowance'))
      .as(this.currentTx)
      .find(tid('label'))
      .contains(`Unlock ${token.toUpperCase()}`);

    return this;
  }

  public shouldNotSetAllowance = () => {
    cy.get(tid('set-token-allowance'))
      .should('not.exist');

    return this;
  }

  public shouldCommitATrade = (pay: string, from: string, receive: string, to: string) => {
    // In order to enforce the correct check
    // timeout should be set to 0 otherwise
    // when the screen is changed the task for
    // the element to not exist becomes true
    // since it's no longer rendered
    cy.get(tid('trade-tx')).within(
      () => {
        cy.get(tid('upgrade'), {
          timeout: 0
        }).should('not.exist');
      }
    );

    cy.get(tid('pay-token', tid('amount'))).contains(`${pay}`);
    cy.get(tid('pay-token', tid('currency'))).contains(`${from}`);
    cy.get(tid('buy-token', tid('amount'))).contains(`${receive}`);
    cy.get(tid('buy-token', tid('currency'))).contains(`${to}`);

    cy.get(tid('buy-token'))
      .find(tid('amount'))
      .contains(`${receive}`);

    cy.get(tid('buy-token'))
      .find(tid('currency'))
      .contains(`${to}`);

    cy.get(tid('summary'));

    return new Summary();
  }

  public shouldMigrateAndCommitATrade = (
    pay: string,
    from: string,
    receive: string,
    to: string
  ) => {
    cy.get(tid('trade-tx')).within(
      () => {
        cy.get(tid('upgrade')).contains('Upgrade');
        cy.get(tid('upgrade', tid('amount'))).contains(`${pay}`);
        cy.get(tid('upgrade', tid('currency'))).contains(`${from}`);
        cy.get(tid('pay-token', tid('amount'))).contains(`${pay}`);
        cy.get(tid('pay-token', tid('currency'))).contains(`${from}`);
        cy.get(tid('buy-token', tid('amount'))).contains(`${receive}`);
        cy.get(tid('buy-token', tid('currency'))).contains(`${to}`);
      }
    );

    cy.get(tid('buy-token'))
      .find(tid('amount'))
      .contains(`${receive}`);

    cy.get(tid('buy-token'))
      .find(tid('currency'))
      .contains(`${to}`);

    cy.get(tid('summary'));

    return new Summary();
  }

  public expectSuccess = () => {
    cy.get(`@${this.currentTx}`).get(tid('status')).contains('Confirmed');
  }
}
