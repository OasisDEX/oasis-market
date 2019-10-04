import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import * as dsProxy from '../abi/ds-proxy.abi.json';
import * as migrationProxyActions from '../abi/migration-proxy-actions.abi.json';
import { NetworkConfig } from '../config';
import { amountToWei } from '../utils';
import { web3 } from '../web3';
import { TransactionDef } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export interface SwapData {
  proxyAddress: string;
  amount: BigNumber;
}

const execute = (proxyAddress: string) => web3.eth.contract(dsProxy as any)
  .at(proxyAddress)
  .execute['address,bytes'];

export const swapSaiToDai: TransactionDef<SwapData> = {
  call: ({ proxyAddress }: SwapData) => execute(proxyAddress),
  prepareArgs: ({ amount }: SwapData, context: NetworkConfig) => [
    context.migrationProxyActions,
    web3.eth.contract(migrationProxyActions as any)
      .at(context.migrationProxyActions)
      .swapSaiToDai
      .getData(
        context.migration,
        amountToWei(amount, 'DAI').toFixed(0)
      )
  ],
  kind: TxMetaKind.swapDai,
  options: () => ({ gas: 5000000 }),
  description: () => <>Swapping DAI for MCD DAI</>,
};

export const swapDaiToSai: TransactionDef<SwapData> = {
  call: ({ proxyAddress }: SwapData) => execute(proxyAddress),
  prepareArgs: ({ amount }: SwapData, context: NetworkConfig) => [
    context.migrationProxyActions,
    web3.eth.contract(migrationProxyActions as any)
      .at(context.migrationProxyActions)
      .swapDaiToSai
      .getData(
        context.migration,
        amountToWei(amount, 'MDAI').toFixed(0)
      )
  ],
  kind: TxMetaKind.swapSai,
  options: () => ({ gas: 5000000 }),
  description: () => <>Swapping MCD DAI for DAI</>,
};
