module.exports = {
  "*.{js,jsx,ts,tsx}": "eslint --fix --max-warnings 0",
  "*.{ts,tsx}": [() => "yarn test:types", "yarn test"]
};
