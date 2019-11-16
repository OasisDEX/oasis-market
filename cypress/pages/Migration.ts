import { tid, timeout } from '../utils';
import { Trades } from './Trades';

export const migrationBtnInHeader = () => cy.get(tid('update-btn-header'));
export const migrationBtnInMarket = () => cy.get(tid('update-btn-market'));
export const migrationBtnInAccount = () => cy.get(tid('update-btn-account'));
export const swapBtnInAccount = () => cy.get(tid('swap-btn-account'));
export const cancelOrders = () => cy.get(
  tid('migration-wizard',
    tid('cfa-cancel-orders',
      tid('cfa-btn')
    )
  )
);
export const migrate = () => cy.get(
  tid('migration-wizard',
    tid('cfa-upgrade-balance',
      tid('cfa-btn')
    )
  )
);

export const ViewHeaders = {
  updateSai: 'Multi-Collateral Dai Upgrade',
  swapDai: 'Single-Collateral Sai Swap',
  cancelOrders: 'Cancel Pending Orders',
};

const click = (button: () => Chainable<Jquery>) => {
  button().click();
};

class Cancellation {

  public cancel = () => {
    cy.get(tid('migration-wizard')).within(
      () => {
        Trades.first().cancel();
      }
    );
  }

  public hasOrdersLeft = (count: number) => {
    cy.get(tid('migration-wizard')).within(
      () => {
        Trades.countIs(count);
      }
    );
  }

  public back = () => {
    cy.get(tid('migration-wizard')).within(
      () => {
        cy.get(tid('back')).click();
      }
    );
  }
}

class Migration {
  public shouldCreateProxy = () => {
    cy.get(tid('migration-wizard', tid('migration'))).within(
      () => {
        cy.get(tid('create-proxy', tid('label'))).contains('Create Account');
      }
    );

    return this;
  }

  public shouldNotCreateProxy = () => {
    cy.get(tid('migration-wizard', tid('migration'))).within(
      () => {
        cy.get(tid('tx-row'));
        cy.get(tid('create-proxy'), timeout(0)).should('not.exist');
      }
    );

    return this;
  }

  public shouldSetAllowanceTo = (token: string) => {
    cy.get(tid('migration-wizard', tid('migration'))).within(
      () => {
        cy.get(tid('set-allowance', tid('label'))).contains(`Unlock ${token}`);
      }
    );

    return this;
  }

  public shouldNotSetAllowanceTo = (token: string) => {
    cy.get(tid('migration-wizard', tid('migration'))).within(
      () => {
        cy.get(tid('tx-row'));
        cy.get(tid('set-allowance'), timeout(0)).should('not.exist');
      }
    );

    return this;
  }

  public shouldMigrate = (amount: string, token: string) => {
    cy.get(tid('migration-wizard', tid('migration'))).within(
      () => {
        cy.get(tid('upgrade', tid('label'))).contains(`Upgrade`);
        cy.get(tid('upgrade', tid('value'))).contains(`${amount} ${token}`);
      }
    );

    return this;
  }
}

export class MigrationWizardModal {
  public static openFrom = (button: () => Chainable<JQuery>) => {
    click(button);

    return {
      headerIs: (text: string | Headers | RegExp) => {
        cy.get(tid('migration-wizard', tid('panel-header'))).contains(text);
      },

      ordersToCancelIs: (count: number) => {
        cy.get(
          tid('migration-wizard',
            tid('cfa-cancel-orders',
              tid('cfa-data')
            )
          )
        ).contains(new RegExp(`${count} Open`, 'gm'));
      },

      amountToMigrateIs: (amount: string) => {
        cy.get(
          tid('migration-wizard',
            tid('cfa-upgrade-balance',
              tid('cfa-data')
            )
          )
        ).contains(new RegExp(`${amount}`, 'gm'));
      },

      amountInTheInputIs: (amount: string) => {
        cy.get(
          tid('migration-wizard',
            tid('cfa-upgrade-balance',
              tid('type-amount')
            )
          )
        ).should('have.value', amount);
      },

      hasNoOrdersToCancel: () => {
        cy.get(tid('migration-wizard', tid('cfa-cancel-orders'))).within(
          () => {
            cy.get(tid('step-completed')).should('exist');
          }
        );
      },

      nothingToMigrate: () => {
        cy.get(tid('migration-wizard', tid('cfa-upgrade-balance'))).within(
          () => {
            cy.get(tid('step-completed')).should('exist');
          }
        );
      },

      cancelOrders: () => {
        click(cancelOrders);

        return new Cancellation();
      },

      migrate: (amount?: string) => {
        if (amount) {
          cy.get(
            tid('migration-wizard',
              tid('cfa-upgrade-balance',
                tid('type-amount')
              )
            )
          ).type(`{selectall}${amount}`);
        }

        click(migrate);

        return new Migration();
      }
    };
  }
}
