import { Web3Window } from '../blockchain/web3';
import coinbaseSvg from '../icons/providers/coinbase.svg';
import imTokenSvg from '../icons/providers/im-token.svg';
import ledgerSvg from '../icons/providers/ledger.svg';
import metamaskBlackSvg from '../icons/providers/metamask-black.svg';
import metamaskSvg from '../icons/providers/metamask.svg';
import parityBlackSvg from '../icons/providers/parity-black.svg';
import paritySvg from '../icons/providers/parity.svg';
import statusBlackSvg from '../icons/providers/status-black.svg';
import statusSvg from '../icons/providers/status.svg';
import trezorSvg from '../icons/providers/trezor.svg';
import trustBlackSvg from '../icons/providers/trust-black.svg';
import trustSvg from '../icons/providers/trust.svg';
import webWalletSvg from '../icons/providers/web-wallet.svg';
import { SvgImage } from './icons/utils';

const SvgImageSimple = (image: string) => SvgImage({
  image, style: {
    width: '100%',
    height: '100%',
  }
});

export interface Provider {
  id?: number;
  icon: string | React.ReactNode;
  iconWhite?: string | React.ReactNode;
  name: string;
  supported: boolean;
  website?: string;
}

export const WebWallet = {
  id: 1,
  icon: SvgImageSimple(webWalletSvg),
  alias: 'web',
  name: 'Web Wallet',
  supported: true,
};

export const Metamask = {
  id: 2,
  icon: SvgImageSimple(metamaskSvg),
  iconWhite: SvgImageSimple(metamaskBlackSvg),
  alias: 'metamask',
  name: 'Metamask',
  supported: true,
  website: 'https://metamask.io/'
};

export const Trust = {
  id: 3,
  alias: 'trust',
  name: 'Trust Wallet',
  icon: SvgImageSimple(trustSvg),
  iconWhite: SvgImageSimple(trustBlackSvg),
  supported: true,
  website: 'https://trustwallet.com/'
};

export const Status = {
  id: 4,
  alias: 'status',
  name: 'Status',
  icon: SvgImageSimple(statusSvg),
  iconWhite: SvgImageSimple(statusBlackSvg),
  supported: true,
  website: 'https://status.im/'
};

export const Coinbase = {
  id: 5,
  alias: 'coinbase',
  name: 'Coinbase Wallet',
  icon: SvgImageSimple(coinbaseSvg),
  supported: true,
};

export const Parity = {
  id: 6,
  alias: 'parity',
  name: 'Parity',
  icon: SvgImageSimple(paritySvg),
  iconWhite: SvgImageSimple(parityBlackSvg),
  supported: true,
  website: 'https://www.parity.io/'
};

export const ImToken = {
  id: 7,
  alias: 'imToken',
  name: 'imToken',
  icon: SvgImageSimple(imTokenSvg),
  supported: true,
};

export const Trezor = {
  id: 20,
  icon: SvgImageSimple(trezorSvg),
  alias: 'trezor',
  name: 'Trezor',
  supported: false,
};

export const Ledger = {
  id: 30,
  icon: SvgImageSimple(ledgerSvg),
  alias: 'ledger',
  name: 'Ledger',
  supported: false
};

export const getCurrentProviderName = (provider = (
  (window as Web3Window).web3
    ? (window as Web3Window).web3.currentProvider
    : null)
): Provider => {
  if (!provider) {
    return WebWallet;
  }

  if (provider.isMetaMask) {
    return Metamask;
  }

  if (provider.isTrust) {
    return Trust;
  }

  if (provider.isStatus) {
    return Status;
  }

  if (typeof (window as any).SOFA !== 'undefined') {
    return Coinbase;
  }

  if (provider.constructor && provider.constructor.name === 'Web3FrameProvider') {
    return Parity;
  }

  if (provider.isImToken) {
    return ImToken;
  }

  return WebWallet;
};
