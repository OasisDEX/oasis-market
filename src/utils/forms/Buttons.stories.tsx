import { storiesOf } from '@storybook/react';
import * as React from 'react';
import { Button, ButtonGroup } from './Buttons';

const stories = storiesOf('Form inputs and buttons/Buttons', module);

stories.add('Colors', () => (
  <div>
    <h3>Default (grey) button</h3>
    <Button>Default enabled button</Button>
    <br/>
    <Button disabled={true}>Default disabled button</Button>

    <h3>Green button</h3>
    <Button color="primary">Green enabled button</Button>
    <br/>
    <Button color="primary" disabled={true}>Green disabled button</Button>

    <h3>Red button</h3>
    <Button color="danger">Red enabled button</Button>
    <br/>
    <Button color="danger" disabled={true}>Red disabled button</Button>

    <h3>Secondary button</h3>
    <Button color="secondary">Secondary enabled button</Button>
    <br/>
    <Button color="secondary" disabled={true}>Secondary disabled button</Button>
  </div>
));

stories.add('Button group', () => (
  <div>
    <ButtonGroup>
      <Button color="primary">Pierwszy</Button>
      <Button color="secondary">Drugi</Button>
      <Button color="danger">Trzeci</Button>
    </ButtonGroup>
    <br/>
    <ButtonGroup>
      <Button color="greyOutlined">Nick Burkhardt</Button>
      <Button color="greyOutlined">Juliette Silverton</Button>
      <Button color="greyOutlined">Eddie Monroe</Button>
      <Button color="greyOutlined">Rosalee Calvert</Button>
      <Button color="greyOutlined">Hank Griffin</Button>
    </ButtonGroup>
  </div>
));

stories.add('Button size', () => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-end',
  }}>
    <Button>Nosize</Button>
    <Button size="sm">Small (size="sm")</Button>
    <Button size="md">Medium (size="md")</Button>
    <Button size="lg">Medium (size="lg")</Button>
  </div>
));

stories.add('Button block', () => (
  <table>
    <thead>
    <tr>
      <td style={{ width: '150px' }}>
        <Button block={true}>block=true</Button>
      </td>
      <td style={{ width: '550px' }}>
        <Button block={true}>Block2</Button>
      </td>
    </tr>
    <tr>
      <td colSpan={2}>
        <Button block={true}>Block 3</Button>
      </td>
    </tr>
    </thead>
  </table>
));
