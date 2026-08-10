import React, { Component } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { egenComponentDecorator } from './egenComponentDecorator';
import { ComponentContext } from './ComponentContext';

describe.skip('egen-component-decorator', () => {
  const opts = {
    featureName: 'Test',
    throwErrorsToConsole: false,
    moduleName: 'test',
  };

  it('renders a component', async () => {
    const DecoratedComp = egenComponentDecorator(opts)(CompThatWorks);
    render(<DecoratedComp />);

    expect(await screen.findByText('The button')).toBeInTheDocument();
  });

  it('catches any errors in the component tree and renders a ui explaining something bad happened', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const DecoratedComp = egenComponentDecorator(opts)(CompThatThrows);
    render(<DecoratedComp />);
    // TO-DO assert the UX for broken react app is showing
    expect(consoleError).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message: expect.stringContaining('ahahaa'),
      }),
    );
    consoleError.mockRestore();
  });

  it('provides ComponentContext', () => {
    const DecoratedComp = egenComponentDecorator(opts)(CompWithConfig);
    render(<DecoratedComp />);
  });

  it('rendering a unsafe component in strict mode should log error in console', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const UnsafeDecoratedCompnent = egenComponentDecorator(opts)(UnsafeComponent);
    render(<UnsafeDecoratedCompnent />);
    expect(consoleError.mock.calls[0][0]).toContain('Warning: Using UNSAFE_componentWillMount');
    consoleError.mockRestore();
  });

  it('rendering an unsafe component without strict mode should not log an error in console', () => {
    const spy = vi.spyOn(console, 'error');
    const unsafeComponentOptions = Object.assign(opts, { strictMode: false });
    const UnsafeDecoratedCompnent = egenComponentDecorator(unsafeComponentOptions)(UnsafeComponent);
    render(<UnsafeDecoratedCompnent />);
    expect(spy).not.toHaveBeenCalled();
  });
});

function CompThatWorks() {
  return <button>The button</button>;
}

let CompThatThrows = function () {
  throw Error('ahahaa');
};

function CompWithConfig() {
  const { moduleName } = React.useContext(ComponentContext);
  return <div>{moduleName}</div>;
}

class UnsafeComponent extends Component<any, any> {
  UNSAFE_componentWillMount() {}

  render() {
    return <h1>This is Unsafe Component</h1>;
  }
}
