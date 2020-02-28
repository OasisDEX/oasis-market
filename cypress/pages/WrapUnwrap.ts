import { tid } from '../utils/index';

export const wrapping = (amount: string) => {
  cy.get(tid('open-wrap-form')).click();
  type(amount);
  return Assertion;
};

export const unwrapping = (amount: string) => {
  cy.get(tid('open-unwrap-form')).click();
  type(amount);
  return Assertion;
};

const type = (amount: string) => {
  cy.get(tid('type-amount')).type(amount);
};

class Assertion {

  public static shouldProceed() {
    cy.get(tid('proceed')).click();
  }

  public static shouldFailWith(message: string) {
    cy.get(tid('error-msg'), { timeout: 2000 }).contains(message);
    cy.get(tid('proceed')).should('be.disabled');
  }
}
