import { BigNumber } from 'bignumber.js';
import * as React from 'react';

import { Currency } from '../../utils/text/Text';
import { getToken, NetworkConfig, } from '../config';
import { TransactionDef } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export interface ApproveWalletData {
  token: string;
}

export const approveWallet: TransactionDef<ApproveWalletData> = {
  call: ({ token }: ApproveWalletData, context: NetworkConfig) =>
    context.tokens[token].contract.approve['address,uint256'],
  prepareArgs: (_: ApproveWalletData, context: NetworkConfig) => [context.otc.address, -1],
  options: () => ({ gas: 100000 }),
  kind: TxMetaKind.approveWallet,
  descriptionIcon: ({ token }: ApproveWalletData) => getToken(token).iconCircle,
  description: ({ token }: ApproveWalletData) => {
    return (
      <React.Fragment>
        Unlock <Currency value={token} /> for Trading
      </React.Fragment>
    );
  },
};

export const disapproveWallet: TransactionDef<ApproveWalletData> = {
  call: ({ token }: ApproveWalletData, context: NetworkConfig) =>
    context.tokens[token].contract.approve['address,uint256'],
  prepareArgs: (_: ApproveWalletData, context: NetworkConfig) => [context.otc.address, 0],
  options: () => ({ gas: 100000 }),
  kind: TxMetaKind.disapproveWallet,
  descriptionIcon: ({ token }: ApproveWalletData) => getToken(token).iconCircle,
  description: ({ token }: ApproveWalletData) => {
    return (
      <React.Fragment>
        Lock <Currency value={token} /> for Trading
      </React.Fragment>
    );
  },
};

export interface ApproveProxyData {
  token: string;
  proxyAddress: string;
  gasPrice?: BigNumber;
  gasEstimation?: number;
}

export const approveProxy = {
  call: ({ token }: ApproveProxyData, context: NetworkConfig) =>
    context.tokens[token].contract.approve['address,uint256'],
  prepareArgs: ({ proxyAddress }: ApproveProxyData, _context: NetworkConfig) => [proxyAddress, -1],
  options: ({ gasPrice, gasEstimation }: ApproveProxyData) =>
    ({ ...gasPrice ? gasPrice : {}, ...gasEstimation ? { gas: gasEstimation } : {} }),
  kind: TxMetaKind.approveProxy,
  descriptionIcon: ({ token }: ApproveProxyData) => getToken(token).iconCircle,
  description: ({ token }: ApproveProxyData) =>
    <React.Fragment>Unlock <Currency value={token}/> on proxy</React.Fragment>
};

export const disapproveProxy: TransactionDef<ApproveProxyData> = {
  call: ({ token }: ApproveWalletData, context: NetworkConfig) =>
    context.tokens[token].contract.approve['address,uint256'],
  prepareArgs: ({ proxyAddress }: ApproveProxyData) => [proxyAddress, 0],
  options: () => ({ gas: 100000 }),
  kind: TxMetaKind.disapproveProxy,
  descriptionIcon: ({ token }: ApproveProxyData) => getToken(token).iconCircle,
  description: ({ token }: ApproveProxyData) => {
    return (
      <React.Fragment>
        Lock <Currency value={token} /> for trading by proxy
      </React.Fragment>
    );
  },
};
