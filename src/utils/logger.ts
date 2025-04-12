import chalk from 'chalk';

export class Logger {
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  static warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  static error(message: string, error?: Error): void {
    console.error(chalk.red('✗'), message);
    if (error) {
      if (process.env.DEBUG) {
        console.error(error.stack);
      } else {
        console.error(`  ${chalk.dim(error.message)}`);
      }
    }
  }

  static debug(message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  static header(message: string): void {
    console.log('\n', chalk.bold.cyan(`=== ${message} ===`), '\n');
  }

  static table(data: Record<string, any>[]): void {
    if (data.length === 0) {
      console.log(chalk.yellow('  No data to display'));
      return;
    }

    console.table(data);
  }
}
