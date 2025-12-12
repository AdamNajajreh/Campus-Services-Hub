/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",   // we only run HTTP requests
  transform: {
    "^.+\\.ts$": "ts-jest"
  }
};

