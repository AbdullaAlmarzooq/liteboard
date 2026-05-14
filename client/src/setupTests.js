// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('quill', () => {
  return jest.fn().mockImplementation((container) => {
    const root = globalThis.document.createElement('div');
    root.innerHTML = '<p><br></p>';

    if (container && typeof container.appendChild === 'function') {
      container.appendChild(root);
    }

    return {
      root,
      clipboard: {
        dangerouslyPasteHTML: (html) => {
          root.innerHTML = html || '<p><br></p>';
        },
      },
      on: jest.fn(),
      off: jest.fn(),
      enable: jest.fn(),
      getText: () => root.textContent || '',
      getLength: () => (root.textContent || '').length + 1,
      deleteText: jest.fn(),
      getSelection: () => null,
      setSelection: jest.fn(),
    };
  });
});
