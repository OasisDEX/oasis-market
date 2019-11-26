import { Balance } from '../pages/Balance';
import { Tab } from '../pages/Tab';
import { WalletConnection } from '../pages/WalletConnection';
import { unwrapping, wrapping } from '../pages/WrapUnwrap';
import { cypressVisitWithWeb3 } from '../utils';

describe('Wrapping ETH', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    Tab.balances();
  });

  it('should succeed', () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);

    wrapping('100').shouldProceed();

    Balance.of('ETH').shouldBe(/8,899.../);
    Balance.of('WETH').shouldBe(/1,101.../);
  });

  it('should not proceed when trying to wrap more than the balance', () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);

   // extract constants from the WrapUnwrapFromView
    wrapping('10000').shouldFailWith(`Your ETH balance is too low`);

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);
  });

  it('should not proceed when trying to wrap 0', () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);

    // extract constants from the WrapUnwrapFromView
    wrapping('0').shouldFailWith(`Amount is too low`);

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);
  });

  // tslint:disable-next-line:max-line-length
  it('should not proceed when trying to wrap ETH and gas cost amount',  () => {
    const gasCost = 0.00092;
    const amountToWrap = 8999.94262 - gasCost + 0.00001 ;

    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999\.94262/);
    Balance.of('WETH').shouldBe(/1,001.../);

    wrapping(`${amountToWrap}`).shouldFailWith(`You will not be able to pay the gas cost`);

    Balance.of('ETH').shouldBe(/8,999\.94262/);
    Balance.of('WETH').shouldBe(/1,001.../);
  });

  it('should not proceed when trying to wrap exact ETH balance',  () => {
    const amountToWrap = 8999.94262;
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999\.94262/);
    Balance.of('WETH').shouldBe(/1,001.../);

    wrapping(`${amountToWrap}`).shouldFailWith(`You will not be able to pay the gas cost`);

    Balance.of('ETH').shouldBe(/8,999\.94262/);
    Balance.of('WETH').shouldBe(/1,001.../);
  });
});

describe('Unwrapping ETH', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    Tab.balances();
  });

  it('should succeeed', () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);

    unwrapping('100').shouldProceed();

    Balance.of('ETH').shouldBe(/9,099.../);
    Balance.of('WETH').shouldBe(/901.../);
  });

  it('should succeed when unwrapping whole balance ',  () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);

    unwrapping('1001').shouldProceed();

    Balance.of('ETH').shouldBe(/10,000.../);
    Balance.of('WETH').shouldBe(/0.../);
  });

  it('should not proceed when trying to unwrap more than the balance', () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);

    // extract constants from the WrapUnwrapFromView
    unwrapping('10000').shouldFailWith(`Your WETH balance is too low`);

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);
  });

  it('should not proceed when trying to unwrap 0', () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);

    // extract constants from the WrapUnwrapFromView
    unwrapping('0').shouldFailWith(`Amount is too low`);

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);
  });
});
