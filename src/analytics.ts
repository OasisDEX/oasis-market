import * as mixpanel from 'mixpanel-browser';

const env = process.env.NODE_ENV === 'production' ? 'prod' : 'test';

const config = {
  test: {
    mixpanel: {
      token: '4ff3f85397ffc3c6b6f0d4120a4ea40a',
      config: { debug: false, ip: false, api_host: 'https://api.mixpanel.com' }
    }
  },
  prod: {
    mixpanel: {
      token: 'a030d8845e34bfdc11be3d9f3054ad67',
      config: { ip: false, api_host: 'https://api.mixpanel.com' }
    }
  }
}[env];

export const mixpanelInit = () => {
  if (config.mixpanel.config.debug) {
    console.debug(
      `[Mixpanel] Tracking initialized for ${env} env using ${config.mixpanel.token}`
    );
  }
  mixpanel.init(config.mixpanel.token, config.mixpanel.config);
  mixpanel.track('Pageview', { product: 'oasis-trade' });
};

export const mixpanelIdentify = (id: string, props: any) => {
  // @ts-ignore
  if (!mixpanel.config) return;
  console.debug(
    `[Mixpanel] Identifying as ${id} ${
      props && props.wallet ? `using wallet ${props.wallet}` : ''
      }`
  );
  mixpanel.identify(id);
  if (props) mixpanel.people.set(props);
};
