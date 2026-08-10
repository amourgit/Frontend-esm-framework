/* eslint-disable no-console */
import chalk from 'chalk';

export function logInfo(message: string) {
  console.log(`${chalk.green.bold('[egen]')} ${message}`);
}

export function logWarn(message: string) {
  console.warn(`${chalk.yellow.bold('[egen]')} ${chalk.yellow(message)}`);
}

export function logFail(message: string) {
  console.error(`${chalk.red.bold('[egen]')} ${chalk.red(message)}`);
}
