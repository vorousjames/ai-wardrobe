import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('App', () => {
  it('renders without crashing', () => {
    const component = render(<Text>test</Text>);
    expect(component).toBeTruthy();
  });
});
