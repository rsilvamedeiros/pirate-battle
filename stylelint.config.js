/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    // Retain the existing breakpoint syntax and mobile browser compatibility.
    'media-feature-range-notation': 'prefix',
    'max-nesting-depth': 2,
  },
}
